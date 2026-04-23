import assert from 'node:assert/strict';

import { NestFactory } from '@nestjs/core';
import {
  CesadCommissionActType,
  UserRole,
} from '@aep-pa/contracts';

import { AppModule } from '../../app/app.module';
import { GlobalExceptionFilter } from '../../common/filters/global-exception.filter';
import { AppLogger } from '../../common/logging/app-logger.service';
import {
  createTestContext,
  createUser,
  disposeTestContext,
} from '../../processes/tests/test-helpers';

export async function runCesadCommissionActsEndpointTests() {
  const context = await createTestContext('cesad-commission-acts-endpoint-test');
  const app = await NestFactory.create(AppModule, { logger: false });

  try {
    const logger = app.get(AppLogger);
    app.useGlobalFilters(new GlobalExceptionFilter(logger));
    await app.listen(0);

    const address = app.getHttpServer().address();
    const port = typeof address === 'string' ? 80 : address.port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const adminUser = await createUser(context.prisma, UserRole.ADMIN, 'cesad-act-admin@test.local');
    const cesadUser = await createUser(
      context.prisma,
      UserRole.CESAD_MEMBER,
      'cesad-act-member@test.local',
    );
    const commission2025 = await context.prisma.cesadCommission.create({
      data: {
        name: 'Comissão CESAD 2025',
        description: 'Comissão histórica.',
        status: 'SUPERSEDED',
        effectiveStartDate: new Date('2025-01-01T00:00:00.000Z'),
        effectiveEndDate: new Date('2025-12-31T23:59:59.000Z'),
      },
    });
    const commission2026 = await context.prisma.cesadCommission.create({
      data: {
        name: 'Comissão CESAD 2026',
        description: null,
        status: 'ACTIVE',
        effectiveStartDate: new Date('2026-01-01T00:00:00.000Z'),
      },
    });

    const historicalAct = await context.prisma.cesadCommissionAct.create({
      data: {
        commissionId: commission2025.id,
        actType: 'CONSTITUTION',
        number: '012',
        year: 2025,
        publishedAt: new Date('2025-01-05T15:00:00.000Z'),
        validityStartDate: new Date('2025-01-10T00:00:00.000Z'),
      },
    });
    const activeAct = await context.prisma.cesadCommissionAct.create({
      data: {
        commissionId: commission2026.id,
        actType: 'RENEWAL',
        number: '045',
        year: 2026,
        signedAt: new Date('2026-01-08T10:00:00.000Z'),
        publishedAt: new Date('2026-01-10T10:00:00.000Z'),
        validityStartDate: new Date('2026-01-15T00:00:00.000Z'),
        summary: 'Renova a comissão para o exercício de 2026.',
        referenceText: 'Portaria CESAD n. 045/2026',
      },
    });

    const adminLoginPayload = await login(baseUrl, adminUser.email);
    const cesadLoginPayload = await login(baseUrl, cesadUser.email);

    const listResponse = await fetch(`${baseUrl}/cesad/commission-acts`, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${adminLoginPayload.accessToken}`,
      },
    });

    assert.equal(listResponse.status, 200);
    const listPayload = (await listResponse.json()) as Array<{
      id: string;
      commissionId: string;
      actType: CesadCommissionActType;
      number: string;
      year: number;
      signedAt: string | null;
      publishedAt: string | null;
      validityStartDate: string | null;
      validityEndDate: string | null;
      summary: string | null;
      referenceText: string | null;
    }>;
    assert.equal(listPayload.length, 2);
    assert.equal(listPayload[0].id, activeAct.id);
    assert.equal(listPayload[0].commissionId, commission2026.id);
    assert.equal(listPayload[0].actType, CesadCommissionActType.RENEWAL);
    assert.equal(listPayload[0].number, '045');
    assert.equal(listPayload[0].year, 2026);
    assert.equal(listPayload[0].summary, 'Renova a comissão para o exercício de 2026.');
    assert.equal(listPayload[1].id, historicalAct.id);

    const filteredResponse = await fetch(
      `${baseUrl}/cesad/commission-acts?commissionId=${commission2025.id}`,
      {
        method: 'GET',
        headers: {
          authorization: `Bearer ${adminLoginPayload.accessToken}`,
        },
      },
    );

    assert.equal(filteredResponse.status, 200);
    const filteredPayload = (await filteredResponse.json()) as Array<{ id: string; commissionId: string }>;
    assert.equal(filteredPayload.length, 1);
    assert.equal(filteredPayload[0].id, historicalAct.id);
    assert.equal(filteredPayload[0].commissionId, commission2025.id);

    const getByIdResponse = await fetch(`${baseUrl}/cesad/commission-acts/${activeAct.id}`, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${adminLoginPayload.accessToken}`,
      },
    });

    assert.equal(getByIdResponse.status, 200);
    const getByIdPayload = (await getByIdResponse.json()) as {
      id: string;
      commissionId: string;
      actType: CesadCommissionActType;
    };
    assert.equal(getByIdPayload.id, activeAct.id);
    assert.equal(getByIdPayload.commissionId, commission2026.id);
    assert.equal(getByIdPayload.actType, CesadCommissionActType.RENEWAL);

    const forbiddenListResponse = await fetch(`${baseUrl}/cesad/commission-acts`, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${cesadLoginPayload.accessToken}`,
      },
    });

    assert.equal(forbiddenListResponse.status, 403);
    const forbiddenPayload = (await forbiddenListResponse.json()) as { message: string };
    assert.match(forbiddenPayload.message, /Only ADMIN can read CESAD commission acts/);

    const unauthenticatedListResponse = await fetch(`${baseUrl}/cesad/commission-acts`, {
      method: 'GET',
    });

    assert.equal(unauthenticatedListResponse.status, 401);

    const missingResponse = await fetch(`${baseUrl}/cesad/commission-acts/missing-commission-act-id`, {
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

async function login(baseUrl: string, email: string): Promise<{ accessToken: string }> {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'Test123456!',
    }),
  });

  assert.equal(response.status, 200);
  return (await response.json()) as { accessToken: string };
}
