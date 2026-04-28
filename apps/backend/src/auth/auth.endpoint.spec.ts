import assert from 'node:assert/strict';

import { NestFactory } from '@nestjs/core';
import { UserRole } from '@aep-pa/contracts';

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
  } finally {
    await app.close();
    await disposeTestContext(context);
  }
}

async function login(baseUrl: string, email: string): Promise<{ accessToken: string }> {
  const loginResponse = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'Test123456!',
    }),
  });

  assert.equal(loginResponse.status, 200);
  return (await loginResponse.json()) as { accessToken: string };
}
