import assert from 'node:assert/strict';

import {
  AuditEventType as PrismaAuditEventType,
  ProcessStatus as PrismaProcessStatus,
} from '@prisma/client';
import {
  CesadStageOpinionStatus,
  ProcessStatus,
  UserRole,
} from '@sadep/contracts';

import {
  authenticatedUser,
  createActiveCesadCommission,
  createCesadStageAssignment,
  createProcess,
  createProcessStage,
  createTestContext,
  createUser,
  disposeTestContext,
} from './test-helpers';

export async function runCesadStageOpinionsServiceTests() {
  const context = await createTestContext('cesad-stage-opinions-service-test');

  try {
    const intern = await createUser(context.prisma, UserRole.INTERN_SERVER, 'opinion-intern@test.local');
    const cesad = await createUser(context.prisma, UserRole.CESAD_MEMBER, 'opinion-cesad@test.local');
    const assistant = await createUser(
      context.prisma,
      UserRole.COMMISSION_ASSISTANT,
      'opinion-assistant@test.local',
    );
    const unrelatedCesad = await createUser(
      context.prisma,
      UserRole.CESAD_MEMBER,
      'opinion-unrelated-cesad@test.local',
    );
    const endedCesad = await createUser(
      context.prisma,
      UserRole.CESAD_MEMBER,
      'opinion-ended-cesad@test.local',
    );
    const inactiveCommissionCesad = await createUser(
      context.prisma,
      UserRole.CESAD_MEMBER,
      'opinion-inactive-commission-cesad@test.local',
    );
    const supervisor = await createUser(
      context.prisma,
      UserRole.IMMEDIATE_SUPERVISOR,
      'opinion-supervisor@test.local',
    );
    const activeCommission = await createActiveCesadCommission(context.prisma, [
      { userId: cesad.id, roleType: 'TITULAR' },
      {
        userId: endedCesad.id,
        roleType: 'TITULAR',
        endDate: new Date('2021-12-31T23:59:59.000Z'),
      },
      { userId: assistant.id, roleType: 'SUPLENTE' },
    ]);
    await createActiveCesadCommission(
      context.prisma,
      [{ userId: inactiveCommissionCesad.id, roleType: 'TITULAR' }],
      {
        name: 'Comissao CESAD inativa para testes de parecer',
        status: 'INACTIVE',
        effectiveStartDate: new Date('2020-01-01T00:00:00.000Z'),
      },
    );

    const process = await createProcess(context.prisma, ProcessStatus.EM_ANALISE_CESAD, intern.id);
    const stageOne = await context.prisma.processStage.findUniqueOrThrow({
      where: { id: process.defaultStageId },
    });
    await assert.rejects(
      () =>
        context.cesadStageOpinionsService.saveDraft(
          process.id,
          2,
          authenticatedUser(cesad.id, cesad.role),
          {
            reportText: 'Tentativa indevida de parecer em etapa futura.',
            conclusion: '',
          },
        ),
      /future and cannot receive stage artifacts yet/,
    );
    await createProcessStage(context.prisma, process.id, 2, 'ETAPA_2');
    await createCesadStageAssignment(
      context.prisma,
      process.id,
      stageOne.id,
      activeCommission.id,
      undefined,
    );

    const draft = await context.cesadStageOpinionsService.saveDraft(
      process.id,
      1,
      authenticatedUser(cesad.id, cesad.role),
      {
        reportText: 'Relatório preliminar da comissão sobre a etapa 1.',
        legalBasis: 'Lei municipal X, art. 10.',
        conclusion: '',
        stageConcept: 'Em desenvolvimento',
        stageResult: 'Aguardando consolidação',
        comment: 'Início do parecer da etapa.',
      },
    );

    assert.equal(draft.scope, 'STAGE');
    assert.equal(draft.processId, process.id);
    assert.equal(draft.processStageId, stageOne.id);
    assert.equal(draft.authorUserId, cesad.id);
    assert.equal(draft.status, CesadStageOpinionStatus.DRAFT);
    assert.equal(draft.reportText, 'Relatório preliminar da comissão sobre a etapa 1.');
    assert.equal(draft.legalBasis, 'Lei municipal X, art. 10.');
    assert.equal(draft.conclusion, '');
    assert.equal(draft.stageConcept, 'Em desenvolvimento');
    assert.equal(draft.stageResult, 'Aguardando consolidação');
    assert.equal(draft.completedAt, null);

    const opinionAfterDraft = await context.prisma.cesadStageOpinion.findFirstOrThrow({
      where: { processStageId: stageOne.id, supersededAt: null },
    });
    assert.equal(opinionAfterDraft.status, 'DRAFT');

    const updatedDraft = await context.cesadStageOpinionsService.saveDraft(
      process.id,
      1,
      authenticatedUser(cesad.id, cesad.role),
      {
        reportText: 'Relatório revisado da comissão sobre a etapa 1.',
        legalBasis: 'Lei municipal X, art. 10 e art. 11.',
        conclusion: 'Conclusão preliminar da etapa.',
        stageConcept: 'Adequado',
        stageResult: 'Favorável',
        comment: 'Rascunho revisado pela comissão.',
      },
    );

    assert.equal(updatedDraft.id, draft.id);
    assert.equal(updatedDraft.status, CesadStageOpinionStatus.DRAFT);
    assert.equal(updatedDraft.reportText, 'Relatório revisado da comissão sobre a etapa 1.');
    assert.equal(updatedDraft.conclusion, 'Conclusão preliminar da etapa.');
    assert.equal(updatedDraft.stageConcept, 'Adequado');
    assert.equal(updatedDraft.stageResult, 'Favorável');

    const readDraft = await context.cesadStageOpinionsService.getByStageSequence(
      process.id,
      1,
      authenticatedUser(cesad.id, cesad.role),
    );

    assert(readDraft, 'expected CESAD stage opinion draft to be returned');
    assert.equal(readDraft.id, draft.id);
    assert.equal(readDraft.processStageId, stageOne.id);
    assert.equal(readDraft.status, CesadStageOpinionStatus.DRAFT);

    const assistantReadDraft = await context.cesadStageOpinionsService.getByStageSequence(
      process.id,
      1,
      authenticatedUser(assistant.id, assistant.role),
    );
    assert.equal(assistantReadDraft?.id, draft.id);

    const completed = await context.cesadStageOpinionsService.complete(
      process.id,
      1,
      authenticatedUser(cesad.id, cesad.role),
      {
        reportText: 'Relatório final da comissão sobre a etapa 1.',
        legalBasis: 'Lei municipal X, art. 10 e art. 11.',
        conclusion: 'A comissão conclui pela aptidão do servidor na etapa 1.',
        stageConcept: 'Satisfatório',
        stageResult: 'Etapa favorável',
        comment: 'Conclusão lógica do parecer da etapa.',
      },
    );

    assert.equal(completed.id, draft.id);
    assert.equal(completed.status, CesadStageOpinionStatus.COMPLETED);
    assert.equal(completed.reportText, 'Relatório final da comissão sobre a etapa 1.');
    assert.equal(completed.conclusion, 'A comissão conclui pela aptidão do servidor na etapa 1.');
    assert.equal(completed.stageConcept, 'Satisfatório');
    assert.equal(completed.stageResult, 'Etapa favorável');
    assert.notEqual(completed.completedAt, null);

    const readCompleted = await context.cesadStageOpinionsService.getByStageSequence(
      process.id,
      1,
      authenticatedUser(cesad.id, cesad.role),
    );
    assert(readCompleted, 'expected completed CESAD stage opinion to be returned');
    assert.equal(readCompleted.status, CesadStageOpinionStatus.COMPLETED);

    await assert.rejects(
      () =>
        context.cesadStageOpinionsService.saveDraft(
          process.id,
          1,
          authenticatedUser(supervisor.id, supervisor.role),
          {
            reportText: 'Tentativa indevida.',
            conclusion: '',
          },
        ),
      /CESAD contextual authorization denied/,
    );

    await assert.rejects(
      () =>
        context.cesadStageOpinionsService.saveDraft(
          process.id,
          2,
          authenticatedUser(assistant.id, assistant.role),
          {
            reportText: 'Tentativa indevida da assistente.',
            conclusion: '',
          },
        ),
      /CESAD contextual authorization denied/,
    );

    await assert.rejects(
      () =>
        context.cesadStageOpinionsService.getByStageSequence(
          process.id,
          1,
          authenticatedUser(unrelatedCesad.id, unrelatedCesad.role),
        ),
      /CESAD contextual authorization denied/,
    );

    await assert.rejects(
      () =>
        context.cesadStageOpinionsService.saveDraft(
          process.id,
          2,
          authenticatedUser(unrelatedCesad.id, unrelatedCesad.role),
          {
            reportText: 'Tentativa sem vinculo ativo.',
            conclusion: '',
          },
        ),
      /CESAD contextual authorization denied/,
    );

    await assert.rejects(
      () =>
        context.cesadStageOpinionsService.saveDraft(
          process.id,
          2,
          authenticatedUser(endedCesad.id, endedCesad.role),
          {
            reportText: 'Tentativa de membro encerrado.',
            conclusion: '',
          },
        ),
      /CESAD contextual authorization denied/,
    );

    await assert.rejects(
      () =>
        context.cesadStageOpinionsService.saveDraft(
          process.id,
          2,
          authenticatedUser(inactiveCommissionCesad.id, inactiveCommissionCesad.role),
          {
            reportText: 'Tentativa por comissao inativa.',
            conclusion: '',
          },
        ),
      /CESAD contextual authorization denied/,
    );

    const processOutsideCesadWindow = await createProcess(
      context.prisma,
      ProcessStatus.AGUARDANDO_ASSINATURA,
      intern.id,
    );

    await assert.rejects(
      () =>
        context.cesadStageOpinionsService.saveDraft(
          processOutsideCesadWindow.id,
          1,
          authenticatedUser(cesad.id, cesad.role),
          {
            reportText: 'Parecer fora de janela.',
            conclusion: '',
          },
        ),
      /CESAD stage opinion artifact can only be manipulated while process is in EM_ANALISE_CESAD status/,
    );

    assert.equal(activeCommission.status, 'ACTIVE');

    const processAfterWrites = await context.prisma.evaluationProcess.findUniqueOrThrow({
      where: { id: process.id },
      select: { status: true },
    });
    assert.equal(processAfterWrites.status, PrismaProcessStatus.EM_ANALISE_CESAD);

    const auditEvents = await context.prisma.auditEvent.findMany({
      where: { evaluationProcessId: process.id },
      orderBy: { occurredAt: 'asc' },
    });
    const trackedOpinionAuditEvents: PrismaAuditEventType[] = [
      PrismaAuditEventType.CESAD_STAGE_OPINION_STARTED,
      PrismaAuditEventType.CESAD_STAGE_OPINION_DRAFT_SAVED,
      PrismaAuditEventType.CESAD_STAGE_OPINION_COMPLETED,
    ];
    const opinionAuditEvents = auditEvents.filter((event) =>
      trackedOpinionAuditEvents.includes(event.eventType),
    );

    assert.deepEqual(
      opinionAuditEvents.map((event) => event.eventType),
      [
        PrismaAuditEventType.CESAD_STAGE_OPINION_STARTED,
        PrismaAuditEventType.CESAD_STAGE_OPINION_DRAFT_SAVED,
        PrismaAuditEventType.CESAD_STAGE_OPINION_COMPLETED,
      ],
    );

    opinionAuditEvents.forEach((event) => {
      const metadata = event.metadata as {
        origin?: string;
        processStageId?: string;
        stageSequence?: number;
        scope?: string;
      };
      assert.equal(metadata.origin, 'CESAD_STAGE_OPINION');
      assert.equal(metadata.processStageId, stageOne.id);
      assert.equal(metadata.stageSequence, 1);
      assert.equal(metadata.scope, 'STAGE');
    });

    assert.equal(opinionAuditEvents[0].beforeState, null);
    assert.deepEqual(opinionAuditEvents[0].afterState, {
      cesadStageOpinionStatus: CesadStageOpinionStatus.DRAFT,
    });
    assert.deepEqual(opinionAuditEvents[1].beforeState, {
      cesadStageOpinionStatus: CesadStageOpinionStatus.DRAFT,
    });
    assert.deepEqual(opinionAuditEvents[1].afterState, {
      cesadStageOpinionStatus: CesadStageOpinionStatus.DRAFT,
    });
    assert.deepEqual(opinionAuditEvents[2].beforeState, {
      cesadStageOpinionStatus: CesadStageOpinionStatus.DRAFT,
    });
    assert.deepEqual(opinionAuditEvents[2].afterState, {
      cesadStageOpinionStatus: CesadStageOpinionStatus.COMPLETED,
    });
  } finally {
    await disposeTestContext(context);
  }
}
