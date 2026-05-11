import assert from 'node:assert/strict';

import {
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ProcessStatus, UserRole } from '@sadep/contracts';

import { CesadContextAuthorizationService } from '../authorization/cesad-context-authorization.service';
import {
  authenticatedUser,
  createCesadStageAssignment,
  createProcess,
  createTestContext,
  createUser,
  disposeTestContext,
} from '../../processes/tests/test-helpers';

const AUTHORIZATION_DENIED_MESSAGE = 'CESAD contextual authorization denied';

export async function runCesadContextAuthorizationServiceTests() {
  const context = await createTestContext('cesad-context-authorization-service-test');
  const service = new CesadContextAuthorizationService(context.prisma as never);

  try {
    const referenceDate = new Date('2026-01-20T12:00:00.000Z');
    const cesadMember = await createUser(
      context.prisma,
      UserRole.CESAD_MEMBER,
      'context-cesad-member@test.local',
    );
    const assistant = await createUser(
      context.prisma,
      UserRole.COMMISSION_ASSISTANT,
      'context-assistant@test.local',
    );
    const unrelatedCesadMember = await createUser(
      context.prisma,
      UserRole.CESAD_MEMBER,
      'context-unrelated-cesad@test.local',
    );
    const endedMember = await createUser(
      context.prisma,
      UserRole.CESAD_MEMBER,
      'context-ended-cesad@test.local',
    );
    const inactiveCommissionMember = await createUser(
      context.prisma,
      UserRole.CESAD_MEMBER,
      'context-inactive-commission-cesad@test.local',
    );
    const inactiveUser = await createUser(
      context.prisma,
      UserRole.CESAD_MEMBER,
      'context-inactive-user-cesad@test.local',
    );
    const intern = await createUser(
      context.prisma,
      UserRole.INTERN_SERVER,
      'context-intern@test.local',
    );
    const process = await createProcess(context.prisma, ProcessStatus.EM_ANALISE_CESAD, intern.id);

    const activeCommission = await context.prisma.cesadCommission.create({
      data: {
        name: 'Comissao CESAD vigente para autorizacao contextual',
        status: 'ACTIVE',
        effectiveStartDate: new Date('2026-01-01T00:00:00.000Z'),
      },
    });

    await context.prisma.cesadCommissionMember.createMany({
      data: [
        {
          commissionId: activeCommission.id,
          userId: cesadMember.id,
          roleType: 'TITULAR',
          startDate: new Date('2026-01-01T00:00:00.000Z'),
        },
        {
          commissionId: activeCommission.id,
          userId: assistant.id,
          roleType: 'SUPLENTE',
          startDate: new Date('2026-01-01T00:00:00.000Z'),
        },
        {
          commissionId: activeCommission.id,
          userId: endedMember.id,
          roleType: 'TITULAR',
          startDate: new Date('2026-01-01T00:00:00.000Z'),
          endDate: new Date('2026-01-10T23:59:59.000Z'),
        },
        {
          commissionId: activeCommission.id,
          userId: inactiveUser.id,
          roleType: 'TITULAR',
          startDate: new Date('2026-01-01T00:00:00.000Z'),
        },
      ],
    });
    await context.prisma.user.update({
      where: { id: inactiveUser.id },
      data: { isActive: false },
    });
    await createCesadStageAssignment(
      context.prisma,
      process.id,
      process.defaultStageId,
      activeCommission.id,
    );

    const inactiveCommission = await context.prisma.cesadCommission.create({
      data: {
        name: 'Comissao CESAD inativa para autorizacao contextual',
        status: 'INACTIVE',
        effectiveStartDate: new Date('2027-01-01T00:00:00.000Z'),
      },
    });

    await context.prisma.cesadCommissionMember.create({
      data: {
        commissionId: inactiveCommission.id,
        userId: inactiveCommissionMember.id,
        roleType: 'TITULAR',
        startDate: new Date('2027-01-01T00:00:00.000Z'),
      },
    });

    await service.ensureCanReadCesadStage({
      user: authenticatedUser(cesadMember.id, cesadMember.role),
      processStageId: process.defaultStageId,
      referenceDate,
    });

    await service.ensureCanWriteCesadStageOpinion({
      user: authenticatedUser(cesadMember.id, cesadMember.role),
      processStageId: process.defaultStageId,
      referenceDate,
    });

    await service.ensureCanTransitionCesadProcess({
      user: authenticatedUser(cesadMember.id, cesadMember.role),
      processStageId: process.defaultStageId,
      referenceDate,
    });

    await service.ensureCanReadCesadStage({
      user: authenticatedUser(assistant.id, assistant.role),
      processStageId: process.defaultStageId,
      referenceDate,
    });

    await assertForbiddenWithoutSensitiveDetails(() =>
      service.ensureCanWriteCesadStageOpinion({
        user: authenticatedUser(assistant.id, assistant.role),
        processStageId: process.defaultStageId,
        referenceDate,
      }),
    );

    await assertForbiddenWithoutSensitiveDetails(() =>
      service.ensureCanReadCesadStage({
        user: authenticatedUser(unrelatedCesadMember.id, unrelatedCesadMember.role),
        processStageId: process.defaultStageId,
        referenceDate,
      }),
    );

    await assertForbiddenWithoutSensitiveDetails(() =>
      service.ensureCanReadCesadStage({
        user: authenticatedUser(endedMember.id, endedMember.role),
        processStageId: process.defaultStageId,
        referenceDate,
      }),
    );

    await assertForbiddenWithoutSensitiveDetails(() =>
      service.ensureCanReadCesadStage({
        user: authenticatedUser(inactiveCommissionMember.id, inactiveCommissionMember.role),
        processStageId: process.defaultStageId,
        referenceDate: new Date('2027-01-20T12:00:00.000Z'),
      }),
    );

    await assertForbiddenWithoutSensitiveDetails(() =>
      service.ensureCanReadCesadStage({
        user: authenticatedUser(inactiveUser.id, inactiveUser.role),
        processStageId: process.defaultStageId,
        referenceDate,
      }),
    );

    await assertForbiddenWithoutSensitiveDetails(() =>
      service.ensureCanReadCesadStage({
        user: authenticatedUser(intern.id, intern.role),
        processStageId: process.defaultStageId,
        referenceDate,
      }),
    );

    const unassignedProcess = await createProcess(context.prisma, ProcessStatus.EM_ANALISE_CESAD, intern.id);
    await assertForbiddenWithoutSensitiveDetails(() =>
      service.ensureCanReadCesadStage({
        user: authenticatedUser(cesadMember.id, cesadMember.role),
        processStageId: unassignedProcess.defaultStageId,
        referenceDate,
      }),
    );

    await assert.rejects(
      () => service.ensureCanReadCesadStage({ processStageId: process.defaultStageId, referenceDate }),
      (error: unknown) => {
        assert(error instanceof UnauthorizedException);
        assert.match(error.message, /Authenticated user not found/);
        return true;
      },
    );
  } finally {
    await disposeTestContext(context);
  }
}

async function assertForbiddenWithoutSensitiveDetails(action: () => Promise<void>) {
  await assert.rejects(action, (error: unknown) => {
    assert(error instanceof ForbiddenException);
    assert.equal(error.message, AUTHORIZATION_DENIED_MESSAGE);
    assert.doesNotMatch(error.message, /process|stage|commission|comissao|etapa|vinculo/i);
    return true;
  });
}
