import assert from 'node:assert/strict';

import { NestFactory } from '@nestjs/core';
import { CesadCommissionStatus, UserRole } from '@sadep/contracts';

import { AppModule } from '../../app/app.module';
import { GlobalExceptionFilter } from '../../common/filters/global-exception.filter';
import { AppLogger } from '../../common/logging/app-logger.service';
import {
  createTestContext,
  createUser,
  disposeTestContext,
} from '../../processes/tests/test-helpers';

export async function runCesadCommissionsEndpointTests() {
  const context = await createTestContext('cesad-commissions-endpoint-test');
  const app = await NestFactory.create(AppModule, { logger: false });

  try {
    const logger = app.get(AppLogger);
    app.useGlobalFilters(new GlobalExceptionFilter(logger));
    await app.listen(0);

    const address = app.getHttpServer().address();
    const port = typeof address === 'string' ? 80 : address.port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const adminUser = await createUser(context.prisma, UserRole.ADMIN, 'cesad-admin@test.local');
    const cesadUser = await createUser(
      context.prisma,
      UserRole.CESAD_MEMBER,
      'cesad-member-commission@test.local',
    );
    const commission = await context.prisma.cesadCommission.create({
      data: {
        name: 'Comissão CESAD 2026',
        description: 'Comissão institucional para leitura administrativa.',
        status: 'ACTIVE',
        effectiveStartDate: new Date('2026-01-01T00:00:00.000Z'),
      },
    });

    const adminLoginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: adminUser.email,
        password: 'Test123456!',
      }),
    });
    assert.equal(adminLoginResponse.status, 200);
    const adminLoginPayload = (await adminLoginResponse.json()) as { accessToken: string };

    const cesadLoginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: cesadUser.email,
        password: 'Test123456!',
      }),
    });
    assert.equal(cesadLoginResponse.status, 200);
    const cesadLoginPayload = (await cesadLoginResponse.json()) as { accessToken: string };

    const listResponse = await fetch(`${baseUrl}/cesad/commissions`, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${adminLoginPayload.accessToken}`,
      },
    });

    assert.equal(listResponse.status, 200);
    const listPayload = (await listResponse.json()) as Array<{
      id: string;
      name: string;
      description: string | null;
      status: CesadCommissionStatus;
      effectiveStartDate: string;
      effectiveEndDate: string | null;
    }>;
    assert.equal(listPayload.length, 1);
    assert.equal(listPayload[0].id, commission.id);
    assert.equal(listPayload[0].name, 'Comissão CESAD 2026');
    assert.equal(listPayload[0].description, 'Comissão institucional para leitura administrativa.');
    assert.equal(listPayload[0].status, CesadCommissionStatus.ACTIVE);
    assert.equal(listPayload[0].effectiveStartDate, '2026-01-01T00:00:00.000Z');
    assert.equal(listPayload[0].effectiveEndDate, null);

    const getByIdResponse = await fetch(`${baseUrl}/cesad/commissions/${commission.id}`, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${adminLoginPayload.accessToken}`,
      },
    });

    assert.equal(getByIdResponse.status, 200);
    const getByIdPayload = (await getByIdResponse.json()) as {
      id: string;
      status: CesadCommissionStatus;
    };
    assert.equal(getByIdPayload.id, commission.id);
    assert.equal(getByIdPayload.status, CesadCommissionStatus.ACTIVE);

    const forbiddenListResponse = await fetch(`${baseUrl}/cesad/commissions`, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${cesadLoginPayload.accessToken}`,
      },
    });

    assert.equal(forbiddenListResponse.status, 403);
    const forbiddenPayload = (await forbiddenListResponse.json()) as { message: string };
    assert.match(forbiddenPayload.message, /Only ADMIN can read CESAD commissions/);

    const unauthenticatedListResponse = await fetch(`${baseUrl}/cesad/commissions`, {
      method: 'GET',
    });

    assert.equal(unauthenticatedListResponse.status, 401);

    const missingResponse = await fetch(`${baseUrl}/cesad/commissions/missing-commission-id`, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${adminLoginPayload.accessToken}`,
      },
    });

    assert.equal(missingResponse.status, 404);
  } finally {
    await app.close();
    await disposeTestContext(context);
  }
}
