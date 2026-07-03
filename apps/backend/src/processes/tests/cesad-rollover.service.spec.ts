import assert from 'node:assert/strict';

import { AuditEventType, ProcessAction, ProcessStatus, UserRole } from '@sadep/contracts';

import {
  authenticatedUser,
  createActiveCesadCommission,
  createCesadStageAssignment,
  createProcess,
  createTestContext,
  createUser,
  disposeTestContext,
} from './test-helpers';

// BE-CESAD-REG-01E — rollover temporal de competência CESAD por etapa.
export async function runCesadRolloverServiceTests() {
  const context = await createTestContext('cesad-rollover-service-test');

  try {
    const admin = await createUser(context.prisma, UserRole.ADMIN, 'admin@rollover.local');
    const member = await createUser(context.prisma, UserRole.CESAD_MEMBER, 'member@rollover.local');
    const evaluated = await createUser(context.prisma, UserRole.INTERN_SERVER, 'evaluated@rollover.local');
    const supervisor = await createUser(context.prisma, UserRole.IMMEDIATE_SUPERVISOR, 'supervisor@rollover.local');
    const author = await createUser(context.prisma, UserRole.CESAD_MEMBER, 'author@rollover.local');

    const adminActor = authenticatedUser(admin.id, admin.role);

    // Única comissão vigente do teste (2020-∞).
    const currentCommission = await createActiveCesadCommission(context.prisma, [], {
      name: 'Comissão CESAD vigente (rollover)',
    });
    // Comissão auxiliar (encerrada) para vincular membro em cenário de expected signer.
    const expiredForSigner = await createActiveCesadCommission(context.prisma, [], {
      name: 'Comissão CESAD encerrada (signer)',
      effectiveStartDate: new Date('2018-01-01T00:00:00.000Z'),
      effectiveEndDate: new Date('2019-01-01T00:00:00.000Z'),
    });

    async function makeExpiredAssignedProcess(status: ProcessStatus = ProcessStatus.EM_ANALISE_CESAD) {
      const expired = await createActiveCesadCommission(context.prisma, [], {
        name: 'Comissão CESAD expirada (rollover)',
        effectiveStartDate: new Date('2019-01-01T00:00:00.000Z'),
        effectiveEndDate: new Date('2020-01-01T00:00:00.000Z'),
      });
      const process = await createProcess(context.prisma, status, evaluated.id, supervisor.id);
      const assignment = await createCesadStageAssignment(
        context.prisma,
        process.id,
        process.defaultStageId,
        expired.id,
        supervisor.id,
      );
      return { expired, process, assignment };
    }

    // 1. Rollover sem parecer iniciado: sucesso + auditoria.
    {
      const { expired, process, assignment } = await makeExpiredAssignedProcess();
      const result = await context.service.rolloverCesadStageAssignment(process.id, 1, adminActor, {
        reason: 'Comissão anterior encerrou a vigência antes do parecer.',
      });

      assert.equal(result.previousAssignmentId, assignment.id);
      assert.equal(result.previousCommissionId, expired.id);
      assert.equal(result.newCommissionId, currentCommission.id);

      const previous = await context.prisma.cesadStageAssignment.findUniqueOrThrow({ where: { id: assignment.id } });
      assert.equal(previous.status, 'SUPERSEDED');
      assert.equal(previous.supersededByAssignmentId, result.newAssignmentId);
      assert.equal(previous.commissionId, expired.id);
      assert.notEqual(previous.supersededAt, null);

      const active = await context.prisma.cesadStageAssignment.findMany({
        where: { processStageId: process.defaultStageId, status: 'ACTIVE' },
      });
      assert.equal(active.length, 1);
      assert.equal(active[0]?.id, result.newAssignmentId);
      assert.equal(active[0]?.commissionId, currentCommission.id);
      assert.equal(active[0]?.assignedByUserId, admin.id);

      const audit = await context.prisma.auditEvent.findFirstOrThrow({
        where: { evaluationProcessId: process.id, eventType: AuditEventType.CESAD_COMMISSION_ROLLOVER_APPLIED },
      });
      const metadata = audit.metadata as {
        action?: string;
        previousAssignmentId?: string;
        newAssignmentId?: string;
        previousCommissionId?: string;
        newCommissionId?: string;
        performedByRole?: string;
      };
      assert.equal(metadata.action, ProcessAction.ROLLOVER_CESAD_STAGE_ASSIGNMENT);
      assert.equal(metadata.previousCommissionId, expired.id);
      assert.equal(metadata.newCommissionId, currentCommission.id);
      assert.equal(metadata.performedByRole, UserRole.ADMIN);

      // Segunda tentativa: assignment já aponta p/ comissão vigente -> bloqueio claro.
      await assert.rejects(
        () => context.service.rolloverCesadStageAssignment(process.id, 1, adminActor, { reason: 'de novo' }),
        /still current/,
      );
    }

    // 2. Bloqueio: comissão atribuída ainda vigente.
    {
      const process = await createProcess(context.prisma, ProcessStatus.EM_ANALISE_CESAD, evaluated.id, supervisor.id);
      await createCesadStageAssignment(
        context.prisma,
        process.id,
        process.defaultStageId,
        currentCommission.id,
        supervisor.id,
      );
      await assert.rejects(
        () => context.service.rolloverCesadStageAssignment(process.id, 1, adminActor, { reason: 'x' }),
        /still current/,
      );
    }

    // 3. Bloqueio: processo fora de EM_ANALISE_CESAD.
    {
      const { process } = await makeExpiredAssignedProcess(ProcessStatus.EM_AVALIACAO);
      await assert.rejects(
        () => context.service.rolloverCesadStageAssignment(process.id, 1, adminActor, { reason: 'x' }),
        /EM_ANALISE_CESAD/,
      );
    }

    // 4. Bloqueio: perfil não autorizado.
    {
      const { process } = await makeExpiredAssignedProcess();
      await assert.rejects(
        () =>
          context.service.rolloverCesadStageAssignment(process.id, 1, authenticatedUser(member.id, member.role), {
            reason: 'x',
          }),
        /cannot supersede|Forbidden/i,
      );
    }

    // 5. Rollover supersede um parecer preparatório em DRAFT e libera a nova comissão.
    {
      const { process } = await makeExpiredAssignedProcess();
      const opinion = await context.prisma.cesadStageOpinion.create({
        data: {
          processId: process.id,
          processStageId: process.defaultStageId,
          authorUserId: author.id,
          status: 'DRAFT',
          reportText: 'rascunho',
          conclusion: 'pendente',
        },
      });
      const result = await context.service.rolloverCesadStageAssignment(process.id, 1, adminActor, {
        reason: 'comissão anterior encerrou a vigência com parecer em rascunho',
      });
      assert.equal(result.supersededOpinionId, opinion.id);

      const superseded = await context.prisma.cesadStageOpinion.findUniqueOrThrow({ where: { id: opinion.id } });
      assert.notEqual(superseded.supersededAt, null);

      // O invariante 1:1 fica liberado: não há mais parecer ativo e um novo pode ser criado.
      const active = await context.prisma.cesadStageOpinion.findFirst({
        where: { processStageId: process.defaultStageId, supersededAt: null },
      });
      assert.equal(active, null);
    }

    // 6. Bloqueio (deferido): expected signers congelados exigem fluxo documental próprio.
    {
      const { process } = await makeExpiredAssignedProcess();
      const opinion = await context.prisma.cesadStageOpinion.create({
        data: {
          processId: process.id,
          processStageId: process.defaultStageId,
          authorUserId: author.id,
          status: 'COMPLETED',
          reportText: 'r',
          conclusion: 'c',
        },
      });
      const member = await context.prisma.cesadCommissionMember.create({
        data: { commissionId: expiredForSigner.id, userId: author.id, roleType: 'TITULAR', startDate: new Date('2020-01-01T00:00:00.000Z') },
      });
      await context.prisma.cesadStageOpinionExpectedSigner.create({
        data: {
          cesadStageOpinionId: opinion.id,
          commissionId: expiredForSigner.id,
          actingCommissionMemberId: member.id,
          actingUserId: author.id,
          derivationType: 'ACTIVE_TITULAR',
          signingCapacity: 'EFFECTIVE_MEMBER',
          nameSnapshot: 'N',
          emailSnapshot: 'e',
          roleTypeSnapshot: 'TITULAR',
          sortOrder: 1,
          frozenAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      });
      await assert.rejects(
        () => context.service.rolloverCesadStageAssignment(process.id, 1, adminActor, { reason: 'x' }),
        /expected signers were frozen or a CESAD opinion document/,
      );
    }

    // 7. Bloqueio (deferido/imutável): documento CESAD existente (inclui SIGNED consolidado).
    {
      const { process } = await makeExpiredAssignedProcess();
      await context.prisma.cesadStageOpinion.create({
        data: {
          processId: process.id,
          processStageId: process.defaultStageId,
          authorUserId: author.id,
          status: 'COMPLETED',
          reportText: 'r',
          conclusion: 'c',
        },
      });
      await context.prisma.processDocument.create({
        data: {
          evaluationProcessId: process.id,
          processStageId: process.defaultStageId,
          documentType: 'CESAD_OPINION',
          documentStatus: 'SIGNED',
        },
      });
      await assert.rejects(
        () => context.service.rolloverCesadStageAssignment(process.id, 1, adminActor, { reason: 'x' }),
        /expected signers were frozen or a CESAD opinion document/,
      );
    }
  } finally {
    await disposeTestContext(context);
  }
}
