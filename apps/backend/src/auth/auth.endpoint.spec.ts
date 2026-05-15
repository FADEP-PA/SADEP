import assert from 'node:assert/strict';

import { NestFactory } from '@nestjs/core';
import { UserRole } from '@sadep/contracts';

import { AppModule } from '../app/app.module';
import { GlobalExceptionFilter } from '../common/filters/global-exception.filter';
import { AppLogger } from '../common/logging/app-logger.service';
import {
  createTestContext,
  createUser,
  disposeTestContext,
} from '../processes/tests/test-helpers';

export async function runAuthEndpointTests() {
  const context = await createTestContext('auth-endpoint-test');
  const app = await NestFactory.create(AppModule, { logger: false });

  try {
    const logger = app.get(AppLogger);
    app.useGlobalFilters(new GlobalExceptionFilter(logger));
    await app.listen(0);

    const address = app.getHttpServer().address();
    const port = typeof address === 'string' ? 80 : address.port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const adminUser = await createUser(context.prisma, UserRole.ADMIN, 'auth-admin@test.local');
    const inactiveUser = await createUser(
      context.prisma,
      UserRole.CESAD_MEMBER,
      'auth-inactive@test.local',
    );
    const deletedUser = await createUser(
      context.prisma,
      UserRole.CESAD_MEMBER,
      'auth-deleted@test.local',
    );
    const roleChangedUser = await createUser(
      context.prisma,
      UserRole.ADMIN,
      'auth-role-change@test.local',
    );

    const adminLoginPayload = await login(baseUrl, adminUser.email);
    const inactiveLoginPayload = await login(baseUrl, inactiveUser.email);
    const deletedLoginPayload = await login(baseUrl, deletedUser.email);
    const roleChangedLoginPayload = await login(baseUrl, roleChangedUser.email);

    assertLoginResponseShape(adminLoginPayload);
    assert.match(adminLoginPayload.setCookie, /HttpOnly/i);
    assert.match(adminLoginPayload.setCookie, /SameSite=Lax/i);
    assert.match(adminLoginPayload.setCookie, /Path=\/auth/i);

    const adminInitialSessions = await context.prisma.userSession.findMany({
      where: { userId: adminUser.id },
    });
    assert.equal(adminInitialSessions.length, 1);
    assert.match(adminInitialSessions[0].refreshTokenHash, /^rt_hmac_sha256:v1:/);
    assert.equal(adminInitialSessions[0].revokedAt, null);
    assert.equal(adminInitialSessions[0].revokedReason, null);
    assert.deepEqual(adminInitialSessions[0].metadata, { issuedRole: UserRole.ADMIN });

    await context.prisma.user.update({
      where: { id: adminUser.id },
      data: {
        name: 'Auth Admin Atualizada',
      },
    });

    const meResponse = await fetch(`${baseUrl}/auth/me`, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${adminLoginPayload.accessToken}`,
      },
    });

    assert.equal(meResponse.status, 200);
    const mePayload = (await meResponse.json()) as {
      sub: string;
      email: string;
      name: string;
      role: UserRole;
    };
    assert.equal(mePayload.sub, adminUser.id);
    assert.equal(mePayload.email, adminUser.email);
    assert.equal(mePayload.name, 'Auth Admin Atualizada');
    assert.equal(mePayload.role, UserRole.ADMIN);

    const protectedResponse = await fetch(`${baseUrl}/auth/admin-check`, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${adminLoginPayload.accessToken}`,
      },
    });

    assert.equal(protectedResponse.status, 200);
    const protectedPayload = (await protectedResponse.json()) as {
      status: string;
      role: UserRole;
    };
    assert.equal(protectedPayload.status, 'ok');
    assert.equal(protectedPayload.role, UserRole.ADMIN);

    const refreshResponse = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        cookie: adminLoginPayload.refreshCookie,
      },
    });

    assert.equal(refreshResponse.status, 200);
    const refreshSetCookie = assertSetCookie(refreshResponse);
    assert.match(refreshSetCookie, /HttpOnly/i);
    const refreshedLoginPayload = {
      ...((await refreshResponse.json()) as AuthLoginPayload),
      refreshCookie: extractRefreshCookie(refreshSetCookie),
      setCookie: refreshSetCookie,
    };
    assertLoginResponseShape(refreshedLoginPayload);
    assert.notEqual(refreshedLoginPayload.accessToken, adminLoginPayload.accessToken);

    const refreshedMeResponse = await fetch(`${baseUrl}/auth/me`, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${refreshedLoginPayload.accessToken}`,
      },
    });

    assert.equal(refreshedMeResponse.status, 200);

    const rotatedSessions = await context.prisma.userSession.findMany({
      where: { familyId: adminInitialSessions[0].familyId },
      orderBy: { createdAt: 'asc' },
    });
    assert.equal(rotatedSessions.length, 2);
    const previousSession = rotatedSessions.find((session) => session.id === adminInitialSessions[0].id);
    const nextSession = rotatedSessions.find((session) => session.id !== adminInitialSessions[0].id);
    assert.ok(previousSession);
    assert.ok(nextSession);
    assert.equal(previousSession.revokedReason, 'ROTATED');
    assert.ok(previousSession.revokedAt);
    assert.ok(previousSession.rotatedAt);
    assert.equal(previousSession.replacedBySessionId, nextSession.id);
    assert.equal(nextSession.revokedAt, null);
    assert.equal(nextSession.revokedReason, null);

    const reusedRefreshHttpResponse = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        cookie: adminLoginPayload.refreshCookie,
      },
    });

    assert.equal(reusedRefreshHttpResponse.status, 401);
    assertRefreshCookieCleared(reusedRefreshHttpResponse);
    const sessionsAfterReuse = await context.prisma.userSession.findMany({
      where: { familyId: adminInitialSessions[0].familyId },
    });
    assert.ok(
      sessionsAfterReuse
        .filter((session) => session.id !== adminInitialSessions[0].id)
        .every((session) => session.revokedReason === 'REUSE_DETECTED'),
    );

    const missingRefreshHttpResponse = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
    });

    assert.equal(missingRefreshHttpResponse.status, 401);

    await context.prisma.user.update({
      where: { id: inactiveUser.id },
      data: {
        isActive: false,
      },
    });

    const inactiveMeResponse = await fetch(`${baseUrl}/auth/me`, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${inactiveLoginPayload.accessToken}`,
      },
    });

    assert.equal(inactiveMeResponse.status, 401);

    const inactiveRefreshHttpResponse = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        cookie: inactiveLoginPayload.refreshCookie,
      },
    });

    assert.equal(inactiveRefreshHttpResponse.status, 401);

    await context.prisma.userSession.deleteMany({
      where: { userId: deletedUser.id },
    });
    await context.prisma.user.delete({
      where: { id: deletedUser.id },
    });

    const deletedMeResponse = await fetch(`${baseUrl}/auth/me`, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${deletedLoginPayload.accessToken}`,
      },
    });

    assert.equal(deletedMeResponse.status, 401);

    await context.prisma.user.update({
      where: { id: roleChangedUser.id },
      data: {
        role: 'INTERN_SERVER',
      },
    });

    const roleChangedMeResponse = await fetch(`${baseUrl}/auth/me`, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${roleChangedLoginPayload.accessToken}`,
      },
    });

    assert.equal(roleChangedMeResponse.status, 401);

    const roleChangedRefreshHttpResponse = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        cookie: roleChangedLoginPayload.refreshCookie,
      },
    });

    assert.equal(roleChangedRefreshHttpResponse.status, 401);

    const missingTokenResponse = await fetch(`${baseUrl}/auth/me`, {
      method: 'GET',
    });

    assert.equal(missingTokenResponse.status, 401);

    const invalidTokenResponse = await fetch(`${baseUrl}/auth/me`, {
      method: 'GET',
      headers: {
        authorization: 'Bearer invalid.token.value',
      },
    });

    assert.equal(invalidTokenResponse.status, 401);

    const expiredUser = await createUser(context.prisma, UserRole.ADMIN, 'auth-expired@test.local');
    const expiredLoginPayload = await login(baseUrl, expiredUser.email);
    await context.prisma.userSession.updateMany({
      where: { userId: expiredUser.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const expiredRefreshHttpResponse = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        cookie: expiredLoginPayload.refreshCookie,
      },
    });

    assert.equal(expiredRefreshHttpResponse.status, 401);
    assertRefreshCookieCleared(expiredRefreshHttpResponse);

    const revokedUser = await createUser(context.prisma, UserRole.ADMIN, 'auth-revoked@test.local');
    const revokedLoginPayload = await login(baseUrl, revokedUser.email);
    await context.prisma.userSession.updateMany({
      where: { userId: revokedUser.id },
      data: {
        revokedAt: new Date(),
        revokedReason: 'LOGOUT',
      },
    });

    const revokedRefreshHttpResponse = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        cookie: revokedLoginPayload.refreshCookie,
      },
    });

    assert.equal(revokedRefreshHttpResponse.status, 401);
    assertRefreshCookieCleared(revokedRefreshHttpResponse);

    const logoutUser = await createUser(context.prisma, UserRole.ADMIN, 'auth-logout@test.local');
    const logoutLoginPayload = await login(baseUrl, logoutUser.email);
    const logoutResponse = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: {
        cookie: logoutLoginPayload.refreshCookie,
      },
    });

    assert.equal(logoutResponse.status, 200);
    assert.deepEqual(await logoutResponse.json(), { ok: true });
    assertRefreshCookieCleared(logoutResponse);

    const logoutSession = await context.prisma.userSession.findFirstOrThrow({
      where: { userId: logoutUser.id },
    });
    assert.equal(logoutSession.revokedReason, 'LOGOUT');
    assert.ok(logoutSession.revokedAt);

    const idempotentLogoutHttpResponse = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
    });

    assert.equal(idempotentLogoutHttpResponse.status, 200);
    assert.deepEqual(await idempotentLogoutHttpResponse.json(), { ok: true });
  } finally {
    await app.close();
    await disposeTestContext(context);
  }
}

type AuthLoginPayload = {
  accessToken: string;
  refreshCookie: string;
  setCookie: string;
  user: {
    email: string;
    name: string;
    role: UserRole;
    sub: string;
  };
};

async function login(baseUrl: string, email: string): Promise<AuthLoginPayload> {
  const loginResponse = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'Test123456!',
    }),
  });

  assert.equal(loginResponse.status, 200);
  const setCookie = assertSetCookie(loginResponse);
  return {
    ...((await loginResponse.json()) as Omit<AuthLoginPayload, 'refreshCookie' | 'setCookie'>),
    refreshCookie: extractRefreshCookie(setCookie),
    setCookie,
  };
}

function assertSetCookie(response: Response): string {
  const setCookie = response.headers.get('set-cookie');

  assert.ok(setCookie);
  assert.match(setCookie, /aep_pa_refresh=/);

  return setCookie;
}

function extractRefreshCookie(setCookie: string): string {
  const [cookie] = setCookie.split(';');
  assert.ok(cookie);
  assert.match(cookie, /^aep_pa_refresh=/);

  return cookie;
}

function assertRefreshCookieCleared(response: Response): void {
  const setCookie = assertSetCookie(response);
  assert.match(setCookie, /aep_pa_refresh=;/);
  assert.match(setCookie, /Path=\/auth/i);
}

function assertLoginResponseShape(payload: AuthLoginPayload): void {
  assert.deepEqual(Object.keys(payload).filter((key) => key !== 'refreshCookie' && key !== 'setCookie').sort(), [
    'accessToken',
    'user',
  ]);
  assert.equal(typeof payload.accessToken, 'string');
  assert.equal(typeof payload.user.sub, 'string');
}
