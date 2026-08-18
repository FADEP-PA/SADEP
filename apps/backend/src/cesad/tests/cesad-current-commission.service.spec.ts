import assert from 'node:assert/strict';

import { UserRole } from '@sadep/contracts';

import { CesadCurrentCommissionService } from '../cesad-current-commission.service';
import {
  createTestContext,
  createUser,
  disposeTestContext,
} from '../../processes/tests/test-helpers';

export async function runCesadCurrentCommissionServiceTests() {
  const context = await createTestContext('cesad-current-commission-service-test');
  const service = new CesadCurrentCommissionService(context.prisma as never);

  try {
    const titularUser = await createUser(
      context.prisma,
      UserRole.CESAD_MEMBER,
      'current-commission-titular@test.local',
    );
    const suplenteUser = await createUser(
      context.prisma,
      UserRole.CESAD_MEMBER,
      'current-commission-suplente@test.local',
    );
    const inactiveUser = await createUser(
      context.prisma,
      UserRole.CESAD_MEMBER,
      'current-commission-inactive@test.local',
    );
    await context.prisma.user.update({
      where: { id: inactiveUser.id },
      data: { isActive: false },
    });

    await context.prisma.cesadCommission.create({
      data: {
        name: 'Comissão CESAD 2025',
        sequence: 1,
        year: 2025,
        description: 'Comissão histórica superada.',
        status: 'SUPERSEDED',
        effectiveStartDate: new Date('2025-01-01T00:00:00.000Z'),
        effectiveEndDate: new Date('2025-12-31T23:59:59.000Z'),
      },
    });
    const currentCommission = await context.prisma.cesadCommission.create({
      data: {
        name: 'Comissão CESAD 2026',
        sequence: 1,
        year: 2026,
        description: 'Comissão vigente para leitura consolidada.',
        status: 'ACTIVE',
        effectiveStartDate: new Date('2026-01-01T00:00:00.000Z'),
      },
    });
    const renewalAct = await context.prisma.cesadCommissionAct.create({
      data: {
        commissionId: currentCommission.id,
        actType: 'RENEWAL',
        number: '045',
        year: 2026,
        signedAt: new Date('2026-01-08T10:00:00.000Z'),
        publishedAt: new Date('2026-01-10T10:00:00.000Z'),
        validityStartDate: new Date('2026-01-15T00:00:00.000Z'),
        summary: 'Renova a comissão para 2026.',
      },
    });
    await context.prisma.cesadCommissionAct.create({
      data: {
        commissionId: currentCommission.id,
        actType: 'AMENDMENT',
        number: '078-A',
        year: 2026,
        signedAt: new Date('2026-01-20T10:00:00.000Z'),
        publishedAt: new Date('2026-01-20T10:00:00.000Z'),
        summary: 'Altera referência textual da comissão.',
      },
    });

    const previousMember = await context.prisma.cesadCommissionMember.create({
      data: {
        commissionId: currentCommission.id,
        userId: titularUser.id,
        roleType: 'SUPLENTE',
        startDate: new Date('2025-12-01T00:00:00.000Z'),
        endDate: new Date('2026-01-14T23:59:59.000Z'),
      },
    });
    const currentTitular = await context.prisma.cesadCommissionMember.create({
      data: {
        commissionId: currentCommission.id,
        userId: titularUser.id,
        actId: renewalAct.id,
        roleType: 'TITULAR',
        startDate: new Date('2026-01-15T00:00:00.000Z'),
      },
    });
    const futureSuplente = await context.prisma.cesadCommissionMember.create({
      data: {
        commissionId: currentCommission.id,
        userId: suplenteUser.id,
        roleType: 'SUPLENTE',
        startDate: new Date('2026-02-01T00:00:00.000Z'),
      },
    });
    const inactiveCurrentMember = await context.prisma.cesadCommissionMember.create({
      data: {
        commissionId: currentCommission.id,
        userId: inactiveUser.id,
        roleType: 'SUPLENTE',
        startDate: new Date('2026-01-16T00:00:00.000Z'),
      },
    });
    const currentPresidente = await context.prisma.cesadCommissionMember.create({
      data: {
        commissionId: currentCommission.id,
        userId: titularUser.id, // Using same user for simplicity in test
        roleType: 'PRESIDENTE',
        startDate: new Date('2026-01-15T00:00:00.000Z'),
      },
    });

    const currentRead = await service.getCurrentCommission('2026-01-20T12:00:00.000Z');

    assert.equal(currentRead.referenceDate, '2026-01-20T12:00:00.000Z');
    assert.equal(currentRead.commission.id, currentCommission.id);
    assert.equal(currentRead.members.length, 3);
    assert.equal(currentRead.members[0].id, inactiveCurrentMember.id);
    assert.equal(currentRead.members[0].user.isActive, false);
    assert.equal(currentRead.members[1].id, currentPresidente.id);
    assert.equal(currentRead.members[1].roleType, 'PRESIDENTE');
    assert.equal(currentRead.members[2].id, currentTitular.id);
    assert.equal(currentRead.members[2].roleType, 'TITULAR');
    assert.equal(currentRead.members[2].user.email, titularUser.email);
    assert.equal(currentRead.members[2].user.name, titularUser.name);
    assert(!currentRead.members.some((member) => member.id === previousMember.id));
    assert(!currentRead.members.some((member) => member.id === futureSuplente.id));
    assert.equal(currentRead.relatedActs.length, 2);
    assert.match(
      currentRead.warnings.join(' | '),
      /inactive user\(s\)|More than one commission act is relevant/,
    );

    await assert.rejects(
      () => service.getCurrentCommission('2024-01-01T00:00:00.000Z'),
      /No active CESAD commission was found for the reference date/,
    );

    await context.prisma.cesadCommission.create({
      data: {
        name: 'Comissão CESAD paralela',
        sequence: 2,
        year: 2026,
        description: 'Conflito proposital de vigência.',
        status: 'ACTIVE',
        effectiveStartDate: new Date('2026-01-10T00:00:00.000Z'),
      },
    });

    await assert.rejects(
      () => service.getCurrentCommission('2026-01-20T12:00:00.000Z'),
      /More than one active CESAD commission was found for the reference date/,
    );
  } finally {
    await disposeTestContext(context);
  }
}
