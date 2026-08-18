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
    const authorityUser = await createUser(
      context.prisma,
      UserRole.HOMOLOGATION_AUTHORITY,
      'authority-endpoint@test.local',
    );
    const commission = await context.prisma.cesadCommission.create({
      data: {
        name: 'Comissão CESAD 2026',
        sequence: 1,
        year: 2026,
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

    const authorityLoginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: authorityUser.email, password: 'Test123456!' }),
    });
    assert.equal(authorityLoginResponse.status, 200);
    const authorityLoginPayload = (await authorityLoginResponse.json()) as { accessToken: string };

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

    const authorityListResponse = await fetch(`${baseUrl}/cesad/commissions`, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${authorityLoginPayload.accessToken}`,
      },
    });

    assert.equal(authorityListResponse.status, 200);
    const authorityListPayload = (await authorityListResponse.json()) as Array<{ id: string }>;
    assert.equal(authorityListPayload[0].id, commission.id);

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

    const authorityGetByIdResponse = await fetch(`${baseUrl}/cesad/commissions/${commission.id}`, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${authorityLoginPayload.accessToken}`,
      },
    });

    assert.equal(authorityGetByIdResponse.status, 200);
    const authorityGetByIdPayload = (await authorityGetByIdResponse.json()) as { id: string };
    assert.equal(authorityGetByIdPayload.id, commission.id);

    const forbiddenListResponse = await fetch(`${baseUrl}/cesad/commissions`, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${cesadLoginPayload.accessToken}`,
      },
    });

    assert.equal(forbiddenListResponse.status, 403);
    const forbiddenPayload = (await forbiddenListResponse.json()) as { message: string };
    assert.match(
      forbiddenPayload.message,
      /Only ADMIN or HOMOLOGATION_AUTHORITY can read CESAD commissions/,
    );

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

    // Close: bloquear para CESAD_MEMBER
    const commissionToClose = await context.prisma.cesadCommission.create({
      data: {
        name: 'Comissão para encerramento',
        sequence: 1,
        year: 2025,
        description: null,
        status: 'ACTIVE',
        effectiveStartDate: new Date('2025-01-01T00:00:00.000Z'),
      },
    });

    const forbiddenCloseResponse = await fetch(
      `${baseUrl}/cesad/commissions/${commissionToClose.id}/close`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${cesadLoginPayload.accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ reason: 'Encerrando comissão' }),
      },
    );
    assert.equal(forbiddenCloseResponse.status, 403);

    // Close: erro se o motivo (reason) não for informado
    const missingReasonCloseResponse = await fetch(
      `${baseUrl}/cesad/commissions/${commissionToClose.id}/close`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${adminLoginPayload.accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({}),
      },
    );
    assert.equal(missingReasonCloseResponse.status, 400);

    // Close: sucesso por ADMIN
    const closeResponse = await fetch(
      `${baseUrl}/cesad/commissions/${commissionToClose.id}/close`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${adminLoginPayload.accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ reason: 'Encerrando comissão por motivo x' }),
      },
    );
    assert.equal(closeResponse.status, 200);
    const closePayload = (await closeResponse.json()) as {
      id: string;
      status: CesadCommissionStatus;
      effectiveEndDate: string | null;
    };
    assert.equal(closePayload.id, commissionToClose.id);
    assert.equal(closePayload.status, CesadCommissionStatus.INACTIVE);
    assert.ok(closePayload.effectiveEndDate !== null, 'effectiveEndDate deve ser preenchida após encerramento');

    // Close: bloquear reencerramento de comissão já encerrada
    const reCloseResponse = await fetch(
      `${baseUrl}/cesad/commissions/${commissionToClose.id}/close`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${adminLoginPayload.accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ reason: 'Tentando encerrar novamente' }),
      },
    );
    assert.equal(reCloseResponse.status, 400);

    const commissionToSupersede = await context.prisma.cesadCommission.create({
      data: {
        name: 'Comissão para supersessão',
        sequence: 1,
        year: 2024,
        description: null,
        status: 'ACTIVE',
        effectiveStartDate: new Date('2024-01-01T00:00:00.000Z'),
      },
    });

    const forbiddenSupersedeResponse = await fetch(
      `${baseUrl}/cesad/commissions/${commissionToSupersede.id}/supersede`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${cesadLoginPayload.accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ reason: 'Supersedendo por motivo y' }),
      },
    );
    assert.equal(forbiddenSupersedeResponse.status, 403);

    // Supersede: erro se o motivo (reason) não for informado
    const missingReasonSupersedeResponse = await fetch(
      `${baseUrl}/cesad/commissions/${commissionToSupersede.id}/supersede`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${authorityLoginPayload.accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({}),
      },
    );
    assert.equal(missingReasonSupersedeResponse.status, 400);

    // Supersede: sucesso por HOMOLOGATION_AUTHORITY
    const supersedeResponse = await fetch(
      `${baseUrl}/cesad/commissions/${commissionToSupersede.id}/supersede`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${authorityLoginPayload.accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ reason: 'Supersedendo por motivo válido' }),
      },
    );
    assert.equal(supersedeResponse.status, 200);
    const supersedePayload = (await supersedeResponse.json()) as {
      id: string;
      status: CesadCommissionStatus;
      effectiveEndDate: string | null;
    };
    assert.equal(supersedePayload.id, commissionToSupersede.id);
    assert.equal(supersedePayload.status, CesadCommissionStatus.SUPERSEDED);
    assert.ok(supersedePayload.effectiveEndDate !== null, 'effectiveEndDate deve ser preenchida após supersessão');

    // Supersede: bloquear supersessão de comissão já supersedida
    const reSupersedeResponse = await fetch(
      `${baseUrl}/cesad/commissions/${commissionToSupersede.id}/supersede`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${adminLoginPayload.accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ reason: 'Tentando superseder novamente' }),
      },
    );
    assert.equal(reSupersedeResponse.status, 400);

    // DTO Validation Tests
    const u1 = await createUser(context.prisma, UserRole.CESAD_MEMBER, 'v1@test.local');
    const u2 = await createUser(context.prisma, UserRole.CESAD_MEMBER, 'v2@test.local');
    const u3 = await createUser(context.prisma, UserRole.CESAD_MEMBER, 'v3@test.local');
    const u4 = await createUser(context.prisma, UserRole.CESAD_MEMBER, 'v4@test.local');
    const u5 = await createUser(context.prisma, UserRole.CESAD_MEMBER, 'v5@test.local');
    
    const basePayload = {
      commission: { effectiveStartDate: '2026-02-01T00:00:00.000Z' },
      act: { actType: 'CONSTITUTION', number: '123', year: 2026, publishedAt: '2026-01-01T00:00:00.000Z' },
      members: [
        { userId: u1.id, roleType: 'PRESIDENTE', startDate: '2026-02-01T00:00:00.000Z', registrationSnapshot: '123', bondSnapshot: 'ativo', positionSnapshot: 'Analista' },
        { userId: u2.id, roleType: 'TITULAR', startDate: '2026-02-01T00:00:00.000Z' },
        { userId: u3.id, roleType: 'TITULAR', startDate: '2026-02-01T00:00:00.000Z' },
        { userId: u4.id, roleType: 'SUPLENTE', startDate: '2026-02-01T00:00:00.000Z' },
        { userId: u5.id, roleType: 'SUPLENTE', startDate: '2026-02-01T00:00:00.000Z' },
      ]
    };

    // 1. Missing publishedAt
    const payloadMissingPublishedAt = JSON.parse(JSON.stringify(basePayload));
    delete payloadMissingPublishedAt.act.publishedAt;
    
    const resMissingPublishedAt = await fetch(`${baseUrl}/cesad/commissions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${adminLoginPayload.accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify(payloadMissingPublishedAt),
    });
    assert.equal(resMissingPublishedAt.status, 400);

    // 2. Missing PRESIDENTE
    const payloadMissingPresidente = JSON.parse(JSON.stringify(basePayload));
    payloadMissingPresidente.members[0].roleType = 'TITULAR';
    
    const resMissingPresidente = await fetch(`${baseUrl}/cesad/commissions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${adminLoginPayload.accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify(payloadMissingPresidente),
    });
    assert.equal(resMissingPresidente.status, 400);

    // 3. Multiple PRESIDENTES
    const payloadMultiplePresidentes = JSON.parse(JSON.stringify(basePayload));
    payloadMultiplePresidentes.members[1].roleType = 'PRESIDENTE';
    
    const resMultiplePresidentes = await fetch(`${baseUrl}/cesad/commissions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${adminLoginPayload.accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify(payloadMultiplePresidentes),
    });
    assert.equal(resMultiplePresidentes.status, 400);

    // 4. Valid payload
    const payloadValid = JSON.parse(JSON.stringify(basePayload));
    const resValid = await fetch(`${baseUrl}/cesad/commissions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${adminLoginPayload.accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify(payloadValid),
    });
    assert.equal(resValid.status, 201);

  } finally {
    await app.close();
    await disposeTestContext(context);
  }
}
