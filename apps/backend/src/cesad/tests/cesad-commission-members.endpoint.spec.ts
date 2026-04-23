import assert from 'node:assert/strict';

import { NestFactory } from '@nestjs/core';
import {
  CesadCommissionMemberRoleType,
  UserRole,
} from '@aep-pa/contracts';

import { AppModule } from '../../app/app.module';
import { GlobalExceptionFilter } from '../../common/filters/global-exception.filter';
import { AppLogger } from '../../common/logging/app-logger.service';
import {
  applyCesadCommissionMemberDatabaseConstraints,
  createTestContext,
  createUser,
  disposeTestContext,
} from '../../processes/tests/test-helpers';

export async function runCesadCommissionMembersEndpointTests() {
  const context = await createTestContext('cesad-commission-members-endpoint-test');
  const app = await NestFactory.create(AppModule, { logger: false });

  try {
    applyCesadCommissionMemberDatabaseConstraints();
    const logger = app.get(AppLogger);
    app.useGlobalFilters(new GlobalExceptionFilter(logger));
    await app.listen(0);

    const address = app.getHttpServer().address();
    const port = typeof address === 'string' ? 80 : address.port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const adminUser = await createUser(context.prisma, UserRole.ADMIN, 'cesad-member-admin@test.local');
    const cesadUser = await createUser(
      context.prisma,
      UserRole.CESAD_MEMBER,
      'cesad-member-reader@test.local',
    );
    const firstMemberUser = await createUser(
      context.prisma,
      UserRole.CESAD_MEMBER,
      'commission-member-endpoint-1@test.local',
    );
    const secondMemberUser = await createUser(
      context.prisma,
      UserRole.CESAD_MEMBER,
      'commission-member-endpoint-2@test.local',
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
    const renewalAct = await context.prisma.cesadCommissionAct.create({
      data: {
        commissionId: commission2026.id,
        actType: 'RENEWAL',
        number: '045',
        year: 2026,
        publishedAt: new Date('2026-01-10T10:00:00.000Z'),
        validityStartDate: new Date('2026-01-15T00:00:00.000Z'),
      },
    });
    const historicalMember = await context.prisma.cesadCommissionMember.create({
      data: {
        commissionId: commission2025.id,
        userId: firstMemberUser.id,
        roleType: 'SUPLENTE',
        startDate: new Date('2025-01-10T00:00:00.000Z'),
        endDate: new Date('2025-12-31T23:59:59.000Z'),
      },
    });
    const activeMember = await context.prisma.cesadCommissionMember.create({
      data: {
        commissionId: commission2026.id,
        userId: firstMemberUser.id,
        actId: renewalAct.id,
        roleType: 'TITULAR',
        startDate: new Date('2026-01-15T00:00:00.000Z'),
      },
    });
    await context.prisma.cesadCommissionMember.create({
      data: {
        commissionId: commission2026.id,
        userId: secondMemberUser.id,
        roleType: 'SUPLENTE',
        startDate: new Date('2026-02-01T00:00:00.000Z'),
      },
    });

    const adminLoginPayload = await login(baseUrl, adminUser.email);
    const cesadLoginPayload = await login(baseUrl, cesadUser.email);

    const listResponse = await fetch(`${baseUrl}/cesad/commission-members`, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${adminLoginPayload.accessToken}`,
      },
    });

    assert.equal(listResponse.status, 200);
    const listPayload = (await listResponse.json()) as Array<{
      id: string;
      commissionId: string;
      userId: string;
      actId: string | null;
      roleType: CesadCommissionMemberRoleType;
      startDate: string;
      endDate: string | null;
    }>;
    assert.equal(listPayload.length, 3);
    assert.equal(listPayload[0].roleType, CesadCommissionMemberRoleType.SUPLENTE);
    assert.equal(listPayload[1].id, activeMember.id);
    assert.equal(listPayload[1].commissionId, commission2026.id);
    assert.equal(listPayload[1].userId, firstMemberUser.id);
    assert.equal(listPayload[1].actId, renewalAct.id);
    assert.equal(listPayload[1].roleType, CesadCommissionMemberRoleType.TITULAR);
    assert.equal(listPayload[1].startDate, '2026-01-15T00:00:00.000Z');
    assert.equal(listPayload[1].endDate, null);

    const filteredByCommissionResponse = await fetch(
      `${baseUrl}/cesad/commission-members?commissionId=${commission2025.id}`,
      {
        method: 'GET',
        headers: {
          authorization: `Bearer ${adminLoginPayload.accessToken}`,
        },
      },
    );

    assert.equal(filteredByCommissionResponse.status, 200);
    const filteredByCommissionPayload = (await filteredByCommissionResponse.json()) as Array<{
      id: string;
      commissionId: string;
    }>;
    assert.equal(filteredByCommissionPayload.length, 1);
    assert.equal(filteredByCommissionPayload[0].id, historicalMember.id);
    assert.equal(filteredByCommissionPayload[0].commissionId, commission2025.id);

    const filteredByRoleResponse = await fetch(
      `${baseUrl}/cesad/commission-members?roleType=TITULAR`,
      {
        method: 'GET',
        headers: {
          authorization: `Bearer ${adminLoginPayload.accessToken}`,
        },
      },
    );

    assert.equal(filteredByRoleResponse.status, 200);
    const filteredByRolePayload = (await filteredByRoleResponse.json()) as Array<{
      id: string;
      roleType: CesadCommissionMemberRoleType;
    }>;
    assert.equal(filteredByRolePayload.length, 1);
    assert.equal(filteredByRolePayload[0].id, activeMember.id);
    assert.equal(filteredByRolePayload[0].roleType, CesadCommissionMemberRoleType.TITULAR);

    const getByIdResponse = await fetch(`${baseUrl}/cesad/commission-members/${activeMember.id}`, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${adminLoginPayload.accessToken}`,
      },
    });

    assert.equal(getByIdResponse.status, 200);
    const getByIdPayload = (await getByIdResponse.json()) as {
      id: string;
      commissionId: string;
      userId: string;
      actId: string | null;
      roleType: CesadCommissionMemberRoleType;
    };
    assert.equal(getByIdPayload.id, activeMember.id);
    assert.equal(getByIdPayload.commissionId, commission2026.id);
    assert.equal(getByIdPayload.userId, firstMemberUser.id);
    assert.equal(getByIdPayload.actId, renewalAct.id);
    assert.equal(getByIdPayload.roleType, CesadCommissionMemberRoleType.TITULAR);

    const forbiddenListResponse = await fetch(`${baseUrl}/cesad/commission-members`, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${cesadLoginPayload.accessToken}`,
      },
    });

    assert.equal(forbiddenListResponse.status, 403);
    const forbiddenPayload = (await forbiddenListResponse.json()) as { message: string };
    assert.match(forbiddenPayload.message, /Only ADMIN can read CESAD commission members/);

    const unauthenticatedListResponse = await fetch(`${baseUrl}/cesad/commission-members`, {
      method: 'GET',
    });

    assert.equal(unauthenticatedListResponse.status, 401);

    const missingResponse = await fetch(
      `${baseUrl}/cesad/commission-members/missing-commission-member-id`,
      {
        method: 'GET',
        headers: {
          authorization: `Bearer ${adminLoginPayload.accessToken}`,
        },
      },
    );

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
