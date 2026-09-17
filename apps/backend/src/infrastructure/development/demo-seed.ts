import {
  AuditEventType,
  CesadCommissionActType,
  CesadCommissionAuditEventType,
  CesadCommissionMemberRoleType,
  CesadCommissionStatus,
  Prisma,
  PrismaClient,
  ProcessStatus,
  UserRole,
} from '@prisma/client';

import { ProcessStageService } from '../../processes/process-stage.service';
import { CASE_2_TOTAL_PROCESS_STAGES } from '../../processes/process-stages.constants';

export const DEMO_PROCESS_ID = 'demo-evaluation-process-case-2';
export const DEMO_COMMISSION_NAME = 'Comissão CESAD - Ambiente de Desenvolvimento Local';

const DEMO_PROCESS_STARTED_AT = new Date('2026-09-01T12:00:00.000Z');
const DEMO_COMMISSION_YEAR = 2024;
const DEMO_COMMISSION_SEQUENCE = 1;
const DEMO_COMMISSION_START = new Date('2024-01-01T00:00:00.000Z');
const DEMO_COMMISSION_PUBLISHED_AT = new Date('2024-01-02T00:00:00.000Z');

const DEMO_COMMISSION_MEMBERS = [
  { email: 'cesad1@sadep.local', roleType: CesadCommissionMemberRoleType.PRESIDENTE },
  { email: 'cesad2@sadep.local', roleType: CesadCommissionMemberRoleType.TITULAR },
  { email: 'cesad3@sadep.local', roleType: CesadCommissionMemberRoleType.TITULAR },
  { email: 'cesad4@sadep.local', roleType: CesadCommissionMemberRoleType.SUPLENTE },
  { email: 'cesad5@sadep.local', roleType: CesadCommissionMemberRoleType.SUPLENTE },
] as const;

type DemoSeedResult = {
  processId: string;
  commissionId: string;
  processCreated: boolean;
};

export async function seedDevelopmentDemoScenario(prisma: PrismaClient): Promise<DemoSeedResult> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[seed] Development demo seed is disabled when NODE_ENV=production.');
  }

  const [admin, evaluatedServer, responsibleSupervisor] = await Promise.all([
    requireSeedUser(prisma, 'admin@sadep.local', UserRole.ADMIN),
    requireSeedUser(prisma, 'server@sadep.local', UserRole.INTERN_SERVER),
    requireSeedUser(prisma, 'supervisor@sadep.local', UserRole.IMMEDIATE_SUPERVISOR),
  ]);

  const processStageService = new ProcessStageService(prisma as never);

  return prisma.$transaction(async (transaction) => {
    const commissionId = await syncDemoCommission(transaction, admin.id);
    const existingProcess = await transaction.evaluationProcess.findUnique({
      where: { id: DEMO_PROCESS_ID },
      select: { id: true, evaluatedUserId: true },
    });

    if (existingProcess && existingProcess.evaluatedUserId !== evaluatedServer.id) {
      throw new Error(
        `[seed] Demo process ${DEMO_PROCESS_ID} already belongs to another evaluated server.`,
      );
    }

    const processCreated = existingProcess === null;
    if (processCreated) {
      await transaction.evaluationProcess.create({
        data: {
          id: DEMO_PROCESS_ID,
          evaluatedUserId: evaluatedServer.id,
          status: ProcessStatus.EM_AVALIACAO,
        },
      });

      await transaction.auditEvent.create({
        data: {
          evaluationProcessId: DEMO_PROCESS_ID,
          actorUserId: admin.id,
          actorRole: UserRole.ADMIN,
          eventType: AuditEventType.PROCESS_CREATED,
          beforeState: Prisma.JsonNull,
          afterState: { status: ProcessStatus.EM_AVALIACAO },
          metadata: {
            origin: 'DEVELOPMENT_DEMO_SEED',
            action: 'CREATE_PROCESS',
            evaluatedUserId: evaluatedServer.id,
            responsibleSupervisorUserId: responsibleSupervisor.id,
          },
          occurredAt: DEMO_PROCESS_STARTED_AT,
        },
      });
    }

    const stages = await processStageService.ensureFourProcessStages(
      transaction,
      DEMO_PROCESS_ID,
      {
        referenceDate: DEMO_PROCESS_STARTED_AT,
        responsibleSupervisorUserId: responsibleSupervisor.id,
      },
    );

    assertDemoStages(stages, responsibleSupervisor.id);

    if (processCreated) {
      const activeStage = stages.find(
        (stage) => stage.startedAt !== null && stage.endedAt === null,
      )!;
      await transaction.auditEvent.create({
        data: {
          evaluationProcessId: DEMO_PROCESS_ID,
          actorUserId: admin.id,
          actorRole: UserRole.ADMIN,
          eventType: AuditEventType.STAGE_ACTIVATED,
          beforeState: Prisma.JsonNull,
          afterState: {
            processStageId: activeStage.id,
            sequence: activeStage.sequence,
          },
          metadata: {
            origin: 'DEVELOPMENT_DEMO_SEED',
            processStageId: activeStage.id,
            stageSequence: activeStage.sequence,
            responsibleSupervisorUserId: responsibleSupervisor.id,
          },
          occurredAt: DEMO_PROCESS_STARTED_AT,
        },
      });
    }

    return { processId: DEMO_PROCESS_ID, commissionId, processCreated };
  });
}

async function syncDemoCommission(
  transaction: Prisma.TransactionClient,
  adminUserId: string,
): Promise<string> {
  const referenceDate = new Date();
  const conflictingCommissions = await transaction.cesadCommission.findMany({
    where: {
      name: { not: DEMO_COMMISSION_NAME },
      status: CesadCommissionStatus.ACTIVE,
      effectiveStartDate: { lte: referenceDate },
      OR: [{ effectiveEndDate: null }, { effectiveEndDate: { gte: referenceDate } }],
    },
    select: { id: true, status: true },
  });

  for (const conflictingCommission of conflictingCommissions) {
    await transaction.cesadCommission.update({
      where: { id: conflictingCommission.id },
      data: { status: CesadCommissionStatus.SUPERSEDED },
    });
    await transaction.cesadCommissionAuditEvent.create({
      data: {
        eventType: CesadCommissionAuditEventType.CESAD_COMMISSION_SUPERSEDED,
        commissionId: conflictingCommission.id,
        actorUserId: adminUserId,
        actorRole: UserRole.ADMIN,
        beforeState: { status: conflictingCommission.status },
        afterState: { status: CesadCommissionStatus.SUPERSEDED },
        metadata: { origin: 'DEVELOPMENT_DEMO_SEED', reason: 'Ensure unambiguous local demo assignment' },
      },
    });
  }

  let commission = await transaction.cesadCommission.findUnique({
    where: { name: DEMO_COMMISSION_NAME },
  });

  if (!commission) {
    commission = await transaction.cesadCommission.create({
      data: {
        name: DEMO_COMMISSION_NAME,
        sequence: DEMO_COMMISSION_SEQUENCE,
        year: DEMO_COMMISSION_YEAR,
        description: 'Comissão CESAD gerada automaticamente pelo seed local para a demonstração.',
        status: CesadCommissionStatus.ACTIVE,
        effectiveStartDate: DEMO_COMMISSION_START,
      },
    });
    await transaction.cesadCommissionAuditEvent.create({
      data: {
        eventType: CesadCommissionAuditEventType.CESAD_COMMISSION_CREATED,
        commissionId: commission.id,
        actorUserId: adminUserId,
        actorRole: UserRole.ADMIN,
        afterState: {
          name: commission.name,
          status: commission.status,
          sequence: commission.sequence,
          year: commission.year,
        },
        metadata: { origin: 'DEVELOPMENT_DEMO_SEED' },
      },
    });
  } else {
    commission = await transaction.cesadCommission.update({
      where: { id: commission.id },
      data: {
        sequence: DEMO_COMMISSION_SEQUENCE,
        year: DEMO_COMMISSION_YEAR,
        description: 'Comissão CESAD gerada automaticamente pelo seed local para a demonstração.',
        status: CesadCommissionStatus.ACTIVE,
        effectiveStartDate: DEMO_COMMISSION_START,
        effectiveEndDate: null,
      },
    });
  }

  const existingAct = await transaction.cesadCommissionAct.findFirst({
    where: {
      commissionId: commission.id,
      number: '999',
      year: DEMO_COMMISSION_YEAR,
    },
    orderBy: { createdAt: 'asc' },
  });
  const actData = {
    commissionId: commission.id,
    actType: CesadCommissionActType.CONSTITUTION,
    number: '999',
    year: DEMO_COMMISSION_YEAR,
    signedAt: DEMO_COMMISSION_START,
    publishedAt: DEMO_COMMISSION_PUBLISHED_AT,
    validityStartDate: DEMO_COMMISSION_PUBLISHED_AT,
    referenceText: 'Portaria fictícia de criação da comissão local para ambiente de desenvolvimento',
  } as const;
  const act = existingAct
    ? await transaction.cesadCommissionAct.update({
        where: { id: existingAct.id },
        data: actData,
      })
    : await transaction.cesadCommissionAct.create({
        data: {
          id: `${commission.id}-constitution-act`,
          ...actData,
        },
      });

  const memberUsers = await transaction.user.findMany({
    where: { email: { in: DEMO_COMMISSION_MEMBERS.map((member) => member.email) } },
    select: { id: true, email: true, role: true, isActive: true },
  });
  const memberUsersByEmail = new Map(memberUsers.map((user) => [user.email, user]));
  const desiredUserIds = new Set(memberUsers.map((user) => user.id));

  for (const desiredMember of DEMO_COMMISSION_MEMBERS) {
    const user = memberUsersByEmail.get(desiredMember.email);
    if (!user || user.role !== UserRole.CESAD_MEMBER || !user.isActive) {
      throw new Error(`[seed] Active CESAD member ${desiredMember.email} was not found.`);
    }

    const existingMemberships = await transaction.cesadCommissionMember.findMany({
      where: { commissionId: commission.id, userId: user.id },
      orderBy: { createdAt: 'asc' },
    });
    const primaryMembership = existingMemberships[0];

    if (primaryMembership) {
      await transaction.cesadCommissionMember.update({
        where: { id: primaryMembership.id },
        data: {
          actId: act.id,
          roleType: desiredMember.roleType,
          startDate: DEMO_COMMISSION_PUBLISHED_AT,
          endDate: null,
        },
      });
      for (const duplicateMembership of existingMemberships.slice(1)) {
        await transaction.cesadCommissionMember.update({
          where: { id: duplicateMembership.id },
          data: { endDate: duplicateMembership.startDate },
        });
      }
    } else {
      await transaction.cesadCommissionMember.create({
        data: {
          commissionId: commission.id,
          userId: user.id,
          actId: act.id,
          roleType: desiredMember.roleType,
          startDate: DEMO_COMMISSION_PUBLISHED_AT,
        },
      });
    }
  }

  const extraMemberships = await transaction.cesadCommissionMember.findMany({
    where: {
      commissionId: commission.id,
      userId: { notIn: [...desiredUserIds] },
      endDate: null,
    },
    select: { id: true, startDate: true },
  });
  for (const extraMembership of extraMemberships) {
    await transaction.cesadCommissionMember.update({
      where: { id: extraMembership.id },
      data: { endDate: extraMembership.startDate },
    });
  }

  return commission.id;
}

async function requireSeedUser(prisma: PrismaClient, email: string, role: UserRole) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.role !== role || !user.isActive) {
    throw new Error(`[seed] Active ${role} user ${email} was not found.`);
  }
  return user;
}

function assertDemoStages(
  stages: Array<{
    sequence: number;
    responsibleSupervisorUserId: string | null;
    startedAt: Date | null;
    endedAt: Date | null;
  }>,
  responsibleSupervisorUserId: string,
): void {
  if (stages.length !== CASE_2_TOTAL_PROCESS_STAGES) {
    throw new Error(`[seed] Demo process must have exactly ${CASE_2_TOTAL_PROCESS_STAGES} stages.`);
  }

  for (const stage of stages) {
    const shouldBeActive = stage.sequence === 1;
    const isActive = stage.startedAt !== null && stage.endedAt === null;
    const isFuture = stage.startedAt === null && stage.endedAt === null;

    if ((shouldBeActive && !isActive) || (!shouldBeActive && !isFuture)) {
      throw new Error(`[seed] Demo process stage ${stage.sequence} has an invalid lifecycle.`);
    }
    if (stage.responsibleSupervisorUserId !== responsibleSupervisorUserId) {
      throw new Error(`[seed] Demo process stage ${stage.sequence} has an unexpected supervisor.`);
    }
  }
}
