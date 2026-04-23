import assert from 'node:assert/strict';

import { NestFactory } from '@nestjs/core';
import { UserRole } from '@aep-pa/contracts';

import { AppModule } from '../../app/app.module';
import { GlobalExceptionFilter } from '../../common/filters/global-exception.filter';
import { AppLogger } from '../../common/logging/app-logger.service';
import {
  createTestContext,
  createUser,
  disposeTestContext,
} from '../../processes/tests/test-helpers';

export async function runCesadCurrentCommissionEndpointTests() {
  const context = await createTestContext('cesad-current-commission-endpoint-test');
  const app = await NestFactory.create(AppModule, { logger: false });

  try {
    const logger = app.get(AppLogger);
    app.useGlobalFilters(new GlobalExceptionFilter(logger));
    await app.listen(0);

    const address = app.getHttpServer().address();
    const port = typeof address === 'string' ? 80 : address.port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const adminUser = await createUser(context.prisma, UserRole.ADMIN, 'current-admin@test.local');
    const cesadUser = await createUser(
      context.prisma,
      UserRole.CESAD_MEMBER,
      'current-cesad@test.local',
    );
    const assistantUser = await createUser(
      context.prisma,
      UserRole.COMMISSION_ASSISTANT,
      'current-assistant@test.local',
    );
    const internUser = await createUser(
      context.prisma,
      UserRole.INTERN_SERVER,
      'current-intern@test.local',
    );
    const memberUser = await createUser(
      context.prisma,
      UserRole.CESAD_MEMBER,
      'current-member@test.local',
    );
    const inactiveMemberUser = await createUser(
      context.prisma,
      UserRole.CESAD_MEMBER,
      'current-member-inactive@test.local',
    );
    await context.prisma.user.update({
      where: { id: inactiveMemberUser.id },
      data: { isActive: false },
    });

    const currentCommission = await context.prisma.cesadCommission.create({
      data: {
        name: 'Comissão CESAD permanente',
        description: 'Janela ampla para testes do endpoint.',
        status: 'ACTIVE',
        effectiveStartDate: new Date('2020-01-01T00:00:00.000Z'),
      },
    });
    const renewalAct = await context.prisma.cesadCommissionAct.create({
      data: {
        commissionId: currentCommission.id,
        actType: 'RENEWAL',
        number: '099',
        year: 2026,
        publishedAt: new Date('2026-01-10T10:00:00.000Z'),
        validityStartDate: new Date('2026-01-15T00:00:00.000Z'),
        summary: 'Renova a comissão para o período atual.',
      },
    });
    const activeMember = await context.prisma.cesadCommissionMember.create({
      data: {
        commissionId: currentCommission.id,
        userId: memberUser.id,
        actId: renewalAct.id,
        roleType: 'TITULAR',
        startDate: new Date('2026-01-15T00:00:00.000Z'),
      },
    });
    await context.prisma.cesadCommissionMember.create({
      data: {
        commissionId: currentCommission.id,
        userId: inactiveMemberUser.id,
        roleType: 'SUPLENTE',
        startDate: new Date('2026-01-16T00:00:00.000Z'),
      },
    });
    await context.prisma.cesadCommissionMember.create({
      data: {
        commissionId: currentCommission.id,
        userId: cesadUser.id,
        roleType: 'SUPLENTE',
        startDate: new Date('2030-01-01T00:00:00.000Z'),
      },
    });

    const adminLoginPayload = await login(baseUrl, adminUser.email);
    const cesadLoginPayload = await login(baseUrl, cesadUser.email);
    const assistantLoginPayload = await login(baseUrl, assistantUser.email);
    const internLoginPayload = await login(baseUrl, internUser.email);

    const adminResponse = await fetch(
      `${baseUrl}/cesad/commissions/current?referenceDate=2026-01-20T12:00:00.000Z`,
      {
        method: 'GET',
        headers: {
          authorization: `Bearer ${adminLoginPayload.accessToken}`,
        },
      },
    );

    assert.equal(adminResponse.status, 200);
    const adminPayload = (await adminResponse.json()) as {
      referenceDate: string;
      commission: { id: string };
      members: Array<{
        id: string;
        userId: string;
        user: { email: string; isActive: boolean };
      }>;
      relatedActs: Array<{ id: string }>;
      warnings: string[];
    };
    assert.equal(adminPayload.referenceDate, '2026-01-20T12:00:00.000Z');
    assert.equal(adminPayload.commission.id, currentCommission.id);
    assert.equal(adminPayload.members.length, 2);
    assert.equal(adminPayload.members[1].id, activeMember.id);
    assert.equal(adminPayload.members[1].userId, memberUser.id);
    assert.equal(adminPayload.members[1].user.email, memberUser.email);
    assert.equal(adminPayload.relatedActs.length, 1);
    assert.equal(adminPayload.relatedActs[0].id, renewalAct.id);
    assert.match(adminPayload.warnings.join(' | '), /inactive user\(s\)/);

    const cesadResponse = await fetch(`${baseUrl}/cesad/commissions/current`, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${cesadLoginPayload.accessToken}`,
      },
    });
    assert.equal(cesadResponse.status, 200);

    const assistantResponse = await fetch(`${baseUrl}/cesad/commissions/current`, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${assistantLoginPayload.accessToken}`,
      },
    });
    assert.equal(assistantResponse.status, 200);

    const forbiddenResponse = await fetch(`${baseUrl}/cesad/commissions/current`, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${internLoginPayload.accessToken}`,
      },
    });
    assert.equal(forbiddenResponse.status, 403);
    const forbiddenPayload = (await forbiddenResponse.json()) as { message: string };
    assert.match(
      forbiddenPayload.message,
      /Only ADMIN, CESAD_MEMBER, or COMMISSION_ASSISTANT can read current CESAD commission/,
    );

    const unauthenticatedResponse = await fetch(`${baseUrl}/cesad/commissions/current`, {
      method: 'GET',
    });
    assert.equal(unauthenticatedResponse.status, 401);

    const missingResponse = await fetch(
      `${baseUrl}/cesad/commissions/current?referenceDate=2010-01-01T00:00:00.000Z`,
      {
        method: 'GET',
        headers: {
          authorization: `Bearer ${adminLoginPayload.accessToken}`,
        },
      },
    );
    assert.equal(missingResponse.status, 404);
    const missingPayload = (await missingResponse.json()) as { message: string };
    assert.match(missingPayload.message, /No active CESAD commission was found for the reference date/);

    await context.prisma.cesadCommission.create({
      data: {
        name: 'Comissão CESAD concorrente',
        description: 'Conflito proposital.',
        status: 'ACTIVE',
        effectiveStartDate: new Date('2026-01-10T00:00:00.000Z'),
      },
    });

    const conflictResponse = await fetch(
      `${baseUrl}/cesad/commissions/current?referenceDate=2026-01-20T12:00:00.000Z`,
      {
        method: 'GET',
        headers: {
          authorization: `Bearer ${adminLoginPayload.accessToken}`,
        },
      },
    );
    assert.equal(conflictResponse.status, 409);
    const conflictPayload = (await conflictResponse.json()) as { message: string };
    assert.match(
      conflictPayload.message,
      /More than one active CESAD commission was found for the reference date/,
    );
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
