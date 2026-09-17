import assert from 'node:assert/strict';

import {
  CesadCommissionMemberRoleType,
  UserRole,
  type CesadCommissionMemberRef,
} from '@sadep/contracts';

import { CesadCommissionMembersService } from '../cesad-commission-members.service';
import {
  applyCesadCommissionMemberDatabaseConstraints,
  createTestContext,
  createUser,
  disposeTestContext,
} from '../../processes/tests/test-helpers';

export async function runCesadCommissionMembersServiceTests() {
  const context = await createTestContext('cesad-commission-members-service-test');
  const service = new CesadCommissionMembersService(context.prisma as never);

  try {
    applyCesadCommissionMemberDatabaseConstraints();
    assert.deepEqual(Object.values(CesadCommissionMemberRoleType), ['TITULAR', 'SUPLENTE']);

    const firstUser = await createUser(
      context.prisma,
      UserRole.CESAD_MEMBER,
      'commission-member-1@test.local',
    );
    const secondUser = await createUser(
      context.prisma,
      UserRole.CESAD_MEMBER,
      'commission-member-2@test.local',
    );
    const commission2025 = await context.prisma.cesadCommission.create({
      data: {
        name: 'Comissão CESAD 2025',
        sequence: 1,
        year: 2025,
        description: 'Comissão histórica.',
        status: 'SUPERSEDED',
        effectiveStartDate: new Date('2025-01-01T00:00:00.000Z'),
        effectiveEndDate: new Date('2025-12-31T23:59:59.000Z'),
      },
    });
    const commission2026 = await context.prisma.cesadCommission.create({
      data: {
        name: 'Comissão CESAD 2026',
        sequence: 1,
        year: 2026,
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
    const previousCommissionMember = await context.prisma.cesadCommissionMember.create({
      data: {
        commissionId: commission2026.id,
        userId: firstUser.id,
        roleType: 'SUPLENTE',
        startDate: new Date('2025-12-01T00:00:00.000Z'),
        endDate: new Date('2026-01-14T23:59:59.000Z'),
      },
    });

    const historicalMember = await context.prisma.cesadCommissionMember.create({
      data: {
        commissionId: commission2025.id,
        userId: firstUser.id,
        roleType: 'SUPLENTE',
        startDate: new Date('2025-01-10T00:00:00.000Z'),
        endDate: new Date('2025-12-31T23:59:59.000Z'),
      },
    });
    const currentMember = await context.prisma.cesadCommissionMember.create({
      data: {
        commissionId: commission2026.id,
        userId: firstUser.id,
        actId: renewalAct.id,
        roleType: 'TITULAR',
        startDate: new Date('2026-01-15T00:00:00.000Z'),
      },
    });
    await context.prisma.cesadCommissionMember.create({
      data: {
        commissionId: commission2026.id,
        userId: secondUser.id,
        roleType: 'SUPLENTE',
        startDate: new Date('2026-02-01T00:00:00.000Z'),
      },
    });

    const members = await service.listMembers();

    assert.equal(members.length, 4);
    assert.equal(members[0].roleType, CesadCommissionMemberRoleType.SUPLENTE);
    assert.equal(members[0].commissionId, commission2026.id);
    assert.equal(members[1].id, currentMember.id);
    assertCommissionMember(members[1], {
      id: currentMember.id,
      commissionId: commission2026.id,
      userId: firstUser.id,
      actId: renewalAct.id,
      roleType: CesadCommissionMemberRoleType.TITULAR,
    });
    assert.equal(members[1].startDate, '2026-01-15T00:00:00.000Z');
    assert.equal(members[1].endDate, null);
    assert.equal(members[2].id, previousCommissionMember.id);
    assert.equal(members[2].endDate, '2026-01-14T23:59:59.000Z');

    const filteredByCommission = await service.listMembers(commission2025.id);

    assert.equal(filteredByCommission.length, 1);
    assert.equal(filteredByCommission[0].id, historicalMember.id);
    assert.equal(filteredByCommission[0].commissionId, commission2025.id);

    const filteredByRole = await service.listMembers(undefined, 'TITULAR');

    assert.equal(filteredByRole.length, 1);
    assert.equal(filteredByRole[0].id, currentMember.id);

    const foundMember = await service.getMemberById(currentMember.id);

    assertCommissionMember(foundMember, {
      id: currentMember.id,
      commissionId: commission2026.id,
      userId: firstUser.id,
      actId: renewalAct.id,
      roleType: CesadCommissionMemberRoleType.TITULAR,
    });

    await assert.rejects(
      () => service.getMemberById('missing-commission-member-id'),
      /CESAD commission member not found/,
    );

    await assert.rejects(
      () =>
        context.prisma.cesadCommissionMember.create({
          data: {
            commissionId: commission2026.id,
            userId: firstUser.id,
            roleType: 'SUPLENTE',
            startDate: new Date('2026-01-14T12:00:00.000Z'),
            endDate: new Date('2026-02-01T00:00:00.000Z'),
          },
        }),
      /Foreign key constraint violated on the foreign key/,
    );

    await assert.rejects(
      () =>
        context.prisma.cesadCommissionMember.create({
          data: {
            commissionId: commission2025.id,
            userId: secondUser.id,
            actId: renewalAct.id,
            roleType: 'TITULAR',
            startDate: new Date('2025-06-01T00:00:00.000Z'),
          },
        }),
      /Foreign key constraint violated on the foreign key/,
    );
  } finally {
    await disposeTestContext(context);
  }
}

function assertCommissionMember(
  member: CesadCommissionMemberRef,
  expected: Pick<
    CesadCommissionMemberRef,
    'id' | 'commissionId' | 'userId' | 'actId' | 'roleType'
  >,
) {
  assert.equal(member.id, expected.id);
  assert.equal(member.commissionId, expected.commissionId);
  assert.equal(member.userId, expected.userId);
  assert.equal(member.actId, expected.actId);
  assert.equal(member.roleType, expected.roleType);
}
