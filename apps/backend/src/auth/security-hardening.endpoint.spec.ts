import assert from 'node:assert/strict';

import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { PrismaClient } from '@prisma/client';
import { UserRole } from '@sadep/contracts';

import { applySecurityMiddleware } from '../app/security-bootstrap';
import { AppModule } from '../app/app.module';
import { GlobalExceptionFilter } from '../common/filters/global-exception.filter';
import { AppLogger } from '../common/logging/app-logger.service';
import { AppConfigService } from '../config/app-config.service';
import {
  createTestContext,
  createUser,
  disposeTestContext,
} from '../processes/tests/test-helpers';

const TEST_PASSWORD = 'Test123456!';
const EVIL_ORIGIN = 'https://evil.example';

export async function runSecurityHardeningEndpointTests() {
  await runSecurityBootstrapTests();
  await runRateLimitTests();
}

async function runSecurityBootstrapTests() {
  const context = await createTestContext('security-bootstrap-test');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: false,
    bodyParser: false,
  });

  try {
    const logger = app.get(AppLogger);
    app.useGlobalFilters(new GlobalExceptionFilter(logger));
    applySecurityMiddleware(app, app.get(AppConfigService));
    await app.listen(0);

    const address = app.getHttpServer().address();
    assert.ok(address && typeof address !== 'string');
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const frontendOrigin = app.get(AppConfigService).frontendOrigin;

    await assertSecurityHeaders(baseUrl);
    await assertCorsPolicy(baseUrl, frontendOrigin);
    await assertRequestBodyLimit(baseUrl);
    await assertCsrfProtection(context.prisma, baseUrl, frontendOrigin);
  } finally {
    await app.close();
    await disposeTestContext(context);
  }
}

async function assertSecurityHeaders(baseUrl: string): Promise<void> {
  const healthResponse = await fetch(`${baseUrl}/health`);

  assert.equal(healthResponse.status, 200);

  const csp = requireHeader(healthResponse, 'content-security-policy');
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /frame-src 'none'/);

  assert.equal(requireHeader(healthResponse, 'x-content-type-options'), 'nosniff');
  assert.equal(requireHeader(healthResponse, 'x-frame-options'), 'SAMEORIGIN');
  assert.equal(requireHeader(healthResponse, 'referrer-policy'), 'no-referrer');
  assert.equal(
    requireHeader(healthResponse, 'permissions-policy'),
    'camera=(), microphone=(), geolocation=()',
  );
  assert.equal(requireHeader(healthResponse, 'cross-origin-opener-policy'), 'same-origin');

  const hsts = requireHeader(healthResponse, 'strict-transport-security');
  assert.match(hsts, /max-age=\d+/);
  assert.match(hsts, /includeSubDomains/);

  const authProbeResponse = await fetch(`${baseUrl}/auth/me`);
  assert.equal(authProbeResponse.status, 401);
  assert.equal(
    requireHeader(authProbeResponse, 'x-content-type-options'),
    'nosniff',
    'security headers must also be present on error responses',
  );
}

async function assertCorsPolicy(baseUrl: string, frontendOrigin: string): Promise<void> {
  const allowedOriginResponse = await fetch(`${baseUrl}/health`, {
    headers: { origin: frontendOrigin },
  });

  assert.equal(allowedOriginResponse.headers.get('access-control-allow-origin'), frontendOrigin);
  assert.equal(allowedOriginResponse.headers.get('access-control-allow-credentials'), 'true');

  const foreignOriginResponse = await fetch(`${baseUrl}/health`, {
    headers: { origin: EVIL_ORIGIN },
  });

  const foreignAllowOrigin = foreignOriginResponse.headers.get('access-control-allow-origin');
  assert.notEqual(
    foreignAllowOrigin,
    EVIL_ORIGIN,
    'CORS must never reflect an untrusted request origin',
  );
  assert.equal(foreignOriginResponse.headers.get('access-control-allow-credentials'), 'true');
}

async function assertRequestBodyLimit(baseUrl: string): Promise<void> {
  const oversizedBody = JSON.stringify({
    padding: 'a'.repeat(1_500_000),
  });

  const oversizedLoginResponse = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: oversizedBody,
  });

  assert.equal(oversizedLoginResponse.status, 413);

  const normalLoginResponse = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'nobody@test.local', password: TEST_PASSWORD }),
  });

  assert.notEqual(normalLoginResponse.status, 413);
}

async function assertCsrfProtection(
  prisma: PrismaClient,
  baseUrl: string,
  frontendOrigin: string,
): Promise<void> {
  const user = await createUser(prisma, UserRole.ADMIN, 'security-csrf@test.local');
  const loginPayload = await login(baseUrl, user.email);

  const evilOriginRefreshResponse = await fetch(`${baseUrl}/auth/refresh`, {
    method: 'POST',
    headers: {
      cookie: loginPayload.refreshCookie,
      origin: EVIL_ORIGIN,
    },
  });
  assert.equal(evilOriginRefreshResponse.status, 403);

  const missingOriginRefreshResponse = await fetch(`${baseUrl}/auth/refresh`, {
    method: 'POST',
    headers: {
      cookie: loginPayload.refreshCookie,
    },
  });
  assert.equal(missingOriginRefreshResponse.status, 403);

  const evilRefererRefreshResponse = await fetch(`${baseUrl}/auth/refresh`, {
    method: 'POST',
    headers: {
      cookie: loginPayload.refreshCookie,
      referer: `${EVIL_ORIGIN}/login`,
    },
  });
  assert.equal(evilRefererRefreshResponse.status, 403);

  const validRefererRefreshResponse = await fetch(`${baseUrl}/auth/refresh`, {
    method: 'POST',
    headers: {
      cookie: loginPayload.refreshCookie,
      referer: `${frontendOrigin}/painel`,
    },
  });
  assert.equal(validRefererRefreshResponse.status, 200);
  const refererRefreshSetCookie = assertSetCookie(validRefererRefreshResponse);
  const refererRefreshedCookie = extractRefreshCookie(refererRefreshSetCookie);

  const validOriginRefreshResponse = await fetch(`${baseUrl}/auth/refresh`, {
    method: 'POST',
    headers: {
      cookie: refererRefreshedCookie,
      origin: frontendOrigin,
    },
  });
  assert.equal(validOriginRefreshResponse.status, 200);
  const originRefreshSetCookie = assertSetCookie(validOriginRefreshResponse);

  const logoutResponse = await fetch(`${baseUrl}/auth/logout`, {
    method: 'POST',
    headers: {
      cookie: extractRefreshCookie(originRefreshSetCookie),
      origin: frontendOrigin,
    },
  });
  assert.equal(logoutResponse.status, 200);
  assert.deepEqual(await logoutResponse.json(), { ok: true });

  const logoutWithoutOriginResponse = await fetch(`${baseUrl}/auth/logout`, {
    method: 'POST',
  });
  assert.equal(logoutWithoutOriginResponse.status, 403);
}

async function runRateLimitTests() {
  const context = await createTestContext('security-rate-limit-test');
  const app = await NestFactory.create(AppModule, { logger: false });

  try {
    const logger = app.get(AppLogger);
    app.useGlobalFilters(new GlobalExceptionFilter(logger));
    await app.listen(0);

    const address = app.getHttpServer().address();
    assert.ok(address && typeof address !== 'string');
    const baseUrl = `http://127.0.0.1:${address.port}`;

    await assertLoginErrorUniformity(context.prisma, baseUrl);
    await assertLoginRateLimit(baseUrl);
  } finally {
    await app.close();
    await disposeTestContext(context);
  }
}

async function assertLoginErrorUniformity(prisma: PrismaClient, baseUrl: string): Promise<void> {
  const knownUser = await createUser(
    prisma,
    UserRole.ADMIN,
    'security-rate-limit@test.local',
  );

  const unknownEmailResponse = await postJson(`${baseUrl}/auth/login`, {
    email: 'ghost@test.local',
    password: TEST_PASSWORD,
  });
  const wrongPasswordResponse = await postJson(`${baseUrl}/auth/login`, {
    email: knownUser.email,
    password: 'DefinitelyWrong!123',
  });

  assert.equal(unknownEmailResponse.status, 401);
  assert.equal(wrongPasswordResponse.status, 401);

  const unknownEmailPayload = (await unknownEmailResponse.json()) as { message: string };
  const wrongPasswordPayload = (await wrongPasswordResponse.json()) as { message: string };

  assert.equal(unknownEmailPayload.message, wrongPasswordPayload.message);
}

async function assertLoginRateLimit(baseUrl: string): Promise<void> {
  for (let attempt = 3; attempt <= 10; attempt += 1) {
    const response = await postJson(`${baseUrl}/auth/login`, {
      email: 'brute-force-target@test.local',
      password: `attempt-${attempt}-wrong`,
    });
    assert.equal(response.status, 401);
  }

  const throttledResponse = await postJson(`${baseUrl}/auth/login`, {
    email: 'brute-force-target@test.local',
    password: 'attempt-11-wrong',
  });

  assert.equal(throttledResponse.status, 429);
  const throttledPayload = (await throttledResponse.json()) as { statusCode: number };
  assert.equal(throttledPayload.statusCode, 429);
}

async function postJson(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

type SecurityLoginPayload = {
  accessToken: string;
  refreshCookie: string;
};

async function login(baseUrl: string, email: string): Promise<SecurityLoginPayload> {
  const loginResponse = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: TEST_PASSWORD }),
  });

  assert.equal(loginResponse.status, 200);
  const setCookie = assertSetCookie(loginResponse);
  const payload = (await loginResponse.json()) as { accessToken: string };

  return {
    accessToken: payload.accessToken,
    refreshCookie: extractRefreshCookie(setCookie),
  };
}

function requireHeader(response: Response, header: string): string {
  const value = response.headers.get(header);
  assert.ok(value, `expected header "${header}" to be present`);

  return value;
}

function assertSetCookie(response: Response): string {
  const setCookie = response.headers.get('set-cookie');

  assert.ok(setCookie);
  assert.match(setCookie, /sadep_refresh=/);

  return setCookie;
}

function extractRefreshCookie(setCookie: string): string {
  const [cookie] = setCookie.split(';');
  assert.ok(cookie);
  assert.match(cookie, /^sadep_refresh=/);

  return cookie;
}
