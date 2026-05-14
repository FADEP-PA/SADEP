import assert from 'node:assert/strict';

import {
  AuditEventType as PrismaAuditEventType,
  type PrismaClient,
  ProcessStatus as PrismaProcessStatus,
} from '@prisma/client';
import {
  CesadFinalOpinionStatus,
  ProcessAction,
  ProcessStatus,
  UserRole,
} from '@sadep/contracts';

import { CesadFinalOpinionConsolidationService } from '../cesad-final-opinions/cesad-final-opinion-consolidation.service';
import { CesadFinalOpinionEligibilityService } from '../cesad-final-opinions/cesad-final-opinion-eligibility.service';
import { CesadFinalOpinionsService } from '../cesad-final-opinions/cesad-final-opinions.service';
import {
  authenticatedUser,
  createActiveCesadCommission,
  createCesadStageAssignment,
  createProcess,
  createTestContext,
  createUser,
  disposeTestContext,
  type TestContext,
} from './test-helpers';

type ReadyContext = {
  processId: string;
  stageIds: Record<number, string>;
  commissionId: string;
  finalAssignmentId: string;
};

async function buildFullyCompletedProcess(
  context: TestContext,
  options: {
    supervisorUserId: string;
    evaluatedUserId: string;
    cesadMemberUserId: string;
    cesadMemberName: string;
    cesadMemberEmail: string;
  },
): Promise<ReadyContext> {
  const commission = await createActiveCesadCommission(context.prisma, [
    { userId: options.cesadMemberUserId, roleType: 'TITULAR' },
  ]);
  const commissionMember = await context.prisma.cesadCommissionMember.findFirstOrThrow({
    where: { commissionId: commission.id, userId: options.cesadMemberUserId },
  });

  const process = await createProcess(
    context.prisma,
    ProcessStatus.PARECER_EMITIDO,
    options.evaluatedUserId,
    options.supervisorUserId,
  );

  const stages = await context.prisma.processStage.findMany({
    where: { evaluationProcessId: process.id },
    orderBy: { sequence: 'asc' },
  });

  const stageIds: Record<number, string> = {};
  const baseDate = new Date('2026-01-01T00:00:00.000Z');

  for (const stage of stages) {
    stageIds[stage.sequence] = stage.id;
    const startedAt = new Date(baseDate.getTime() + stage.sequence * 86_400_000);
    const endedAt = new Date(baseDate.getTime() + (stage.sequence + 1) * 86_400_000);

    await context.prisma.processStage.update({
      where: { id: stage.id },
      data: { startedAt, endedAt },
    });

    await populateCompletedStage(context.prisma, {
      processId: process.id,
      stageId: stage.id,
      stageSequence: stage.sequence,
      supervisorUserId: options.supervisorUserId,
      evaluatedUserId: options.evaluatedUserId,
      cesadMemberUserId: options.cesadMemberUserId,
      cesadMemberName: options.cesadMemberName,
      cesadMemberEmail: options.cesadMemberEmail,
      commissionId: commission.id,
      commissionMemberId: commissionMember.id,
      referenceDate: endedAt,
    });
  }

  const finalAssignment = await createCesadStageAssignment(
    context.prisma,
    process.id,
    stageIds[4]!,
    commission.id,
    options.supervisorUserId,
  );

  return {
    processId: process.id,
    stageIds,
    commissionId: commission.id,
    finalAssignmentId: finalAssignment.id,
  };
}

async function populateCompletedStage(
  prisma: PrismaClient,
  options: {
    processId: string;
    stageId: string;
    stageSequence: number;
    supervisorUserId: string;
    evaluatedUserId: string;
    cesadMemberUserId: string;
    cesadMemberName: string;
    cesadMemberEmail: string;
    commissionId: string;
    commissionMemberId: string;
    referenceDate: Date;
  },
): Promise<void> {
  await prisma.supervisorEvaluation.create({
    data: {
      processId: options.processId,
      processStageId: options.stageId,
      evaluatorUserId: options.supervisorUserId,
      status: 'SUBMITTED',
      summary: `Síntese da etapa ${options.stageSequence}.`,
      generalComments: `Comentários da etapa ${options.stageSequence}.`,
      content: { criteria: [{ code: 'X', label: 'Y', rating: 5 }] },
      submittedAt: options.referenceDate,
    },
  });

  await prisma.selfEvaluation.create({
    data: {
      processId: options.processId,
      processStageId: options.stageId,
      authorUserId: options.evaluatedUserId,
      status: 'SUBMITTED',
      selfReflection: `Reflexão da etapa ${options.stageSequence}.`,
      additionalNotes: null,
      submittedAt: options.referenceDate,
    },
  });

  await prisma.processDocument.create({
    data: {
      evaluationProcessId: options.processId,
      processStageId: options.stageId,
      documentType: 'SUPERVISOR_EVALUATION',
      documentStatus: 'SIGNED',
      signatureRecords: {
        create: [
          {
            signatoryUserId: options.supervisorUserId,
            signatoryRole: 'IMMEDIATE_SUPERVISOR',
            provider: 'INTERNAL',
            status: 'COMPLETED',
            signedAt: options.referenceDate,
          },
          {
            signatoryUserId: options.evaluatedUserId,
            signatoryRole: 'INTERN_SERVER',
            provider: 'INTERNAL',
            status: 'COMPLETED',
            signedAt: options.referenceDate,
          },
        ],
      },
    },
  });

  await prisma.processDocument.create({
    data: {
      evaluationProcessId: options.processId,
      processStageId: options.stageId,
      documentType: 'SELF_EVALUATION',
      documentStatus: 'SIGNED',
      signatureRecords: {
        create: [
          {
            signatoryUserId: options.evaluatedUserId,
            signatoryRole: 'INTERN_SERVER',
            provider: 'INTERNAL',
            status: 'COMPLETED',
            signedAt: options.referenceDate,
          },
          {
            signatoryUserId: options.supervisorUserId,
            signatoryRole: 'IMMEDIATE_SUPERVISOR',
            provider: 'INTERNAL',
            status: 'COMPLETED',
            signedAt: options.referenceDate,
          },
        ],
      },
    },
  });

  const opinion = await prisma.cesadStageOpinion.create({
    data: {
      processId: options.processId,
      processStageId: options.stageId,
      authorUserId: options.cesadMemberUserId,
      status: 'COMPLETED',
      reportText: `Parecer da etapa ${options.stageSequence}.`,
      conclusion: `Conclusão da etapa ${options.stageSequence}.`,
      stageConcept: 'Satisfatório',
      stageResult: 'Favorável',
      completedAt: options.referenceDate,
    },
  });

  const expectedSigner = await prisma.cesadStageOpinionExpectedSigner.create({
    data: {
      cesadStageOpinionId: opinion.id,
      commissionId: options.commissionId,
      actingCommissionMemberId: options.commissionMemberId,
      actingUserId: options.cesadMemberUserId,
      derivationType: 'ACTIVE_TITULAR',
      signingCapacity: 'EFFECTIVE_MEMBER',
      nameSnapshot: options.cesadMemberName,
      emailSnapshot: options.cesadMemberEmail,
      roleTypeSnapshot: 'TITULAR',
      sortOrder: 1,
      frozenAt: options.referenceDate,
    },
  });

  await prisma.processDocument.create({
    data: {
      evaluationProcessId: options.processId,
      processStageId: options.stageId,
      documentType: 'CESAD_OPINION',
      documentStatus: 'SIGNED',
      signatureRecords: {
        create: [
          {
            signatoryUserId: options.cesadMemberUserId,
            signatoryRole: 'CESAD_MEMBER',
            provider: 'INTERNAL',
            status: 'COMPLETED',
            signedAt: options.referenceDate,
            cesadStageOpinionExpectedSignerId: expectedSigner.id,
          },
        ],
      },
    },
  });

  await prisma.cesadStageAssignment.create({
    data: {
      processId: options.processId,
      processStageId: options.stageId,
      commissionId: options.commissionId,
      status: 'ACTIVE',
      assignedAt: options.referenceDate,
      referenceDate: options.referenceDate,
    },
  });
}

function buildFinalServices(context: TestContext): {
  eligibility: CesadFinalOpinionEligibilityService;
  consolidation: CesadFinalOpinionConsolidationService;
  service: CesadFinalOpinionsService;
} {
  const eligibility = new CesadFinalOpinionEligibilityService(context.prisma as never);
  const consolidation = new CesadFinalOpinionConsolidationService(context.prisma as never);
  const service = new CesadFinalOpinionsService(
    context.prisma as never,
    context.service,
    context.cesadContextAuthorizationService,
    eligibility,
    consolidation,
  );
  return { eligibility, consolidation, service };
}

function buildPayload(overrides: Partial<{
  reportText: string;
  legalBasis: string;
  finalConclusion: string;
  finalResult: string;
  finalConcept: string;
  recommendation: string;
  comment: string;
}> = {}) {
  return {
    reportText: overrides.reportText ?? 'Relatório consolidado das quatro etapas.',
    legalBasis: overrides.legalBasis ?? 'Fundamento legal consolidado.',
    finalConclusion:
      overrides.finalConclusion ?? 'A comissão CESAD conclui pela aprovação final do servidor.',
    finalResult: overrides.finalResult ?? 'Apto',
    finalConcept: overrides.finalConcept ?? 'Satisfatório',
    recommendation: overrides.recommendation ?? 'Recomenda-se a homologação.',
    ...(overrides.comment ? { comment: overrides.comment } : {}),
  };
}

export async function runCesadFinalOpinionsServiceTests() {
  const context = await createTestContext('cesad-final-opinions-service-test');
  const services = buildFinalServices(context);

  try {
    const evaluatedUser = await createUser(context.prisma, UserRole.INTERN_SERVER, 'cfo-evaluated@test.local');
    const supervisor = await createUser(
      context.prisma,
      UserRole.IMMEDIATE_SUPERVISOR,
      'cfo-supervisor@test.local',
    );
    const cesadMember = await createUser(
      context.prisma,
      UserRole.CESAD_MEMBER,
      'cfo-cesad@test.local',
      'CESAD Titular Final',
    );
    const unrelatedCesad = await createUser(
      context.prisma,
      UserRole.CESAD_MEMBER,
      'cfo-unrelated-cesad@test.local',
    );
    const assistant = await createUser(
      context.prisma,
      UserRole.COMMISSION_ASSISTANT,
      'cfo-assistant@test.local',
    );
    const homologationAuthority = await createUser(
      context.prisma,
      UserRole.HOMOLOGATION_AUTHORITY,
      'cfo-authority@test.local',
    );
    const admin = await createUser(context.prisma, UserRole.ADMIN, 'cfo-admin@test.local');

    // === ELIGIBILITY TESTS ===

    // 1. Fully eligible: process in PARECER_EMITIDO with all 4 stages complete
    const ready = await buildFullyCompletedProcess(context, {
      supervisorUserId: supervisor.id,
      evaluatedUserId: evaluatedUser.id,
      cesadMemberUserId: cesadMember.id,
      cesadMemberName: cesadMember.name,
      cesadMemberEmail: cesadMember.email,
    });

    const eligibilityResult = await services.eligibility.evaluate(ready.processId);
    assert.equal(eligibilityResult.isEligible, true, `expected eligible, reasons: ${eligibilityResult.reasons.join('; ')}`);
    assert.equal(eligibilityResult.stageCount, 4);
    assert.equal(eligibilityResult.completedStageCount, 4);
    assert.equal(eligibilityResult.processStatus, PrismaProcessStatus.PARECER_EMITIDO);
    assert.deepEqual(eligibilityResult.reasons, []);

    // 2. Process not in PARECER_EMITIDO
    const wrongStatusProcess = await createProcess(
      context.prisma,
      ProcessStatus.EM_AVALIACAO,
      evaluatedUser.id,
      supervisor.id,
    );
    const wrongStatusEligibility = await services.eligibility.evaluate(wrongStatusProcess.id);
    assert.equal(wrongStatusEligibility.isEligible, false);
    assert.ok(
      wrongStatusEligibility.reasons.some((reason) =>
        reason.includes('Process must be in PARECER_EMITIDO'),
      ),
      'expected PARECER_EMITIDO reason',
    );

    // 3. Process with active stage
    const activeStageProcess = await createProcess(
      context.prisma,
      ProcessStatus.PARECER_EMITIDO,
      evaluatedUser.id,
      supervisor.id,
    );
    const activeStageEligibility = await services.eligibility.evaluate(activeStageProcess.id);
    assert.equal(activeStageEligibility.isEligible, false);
    assert.ok(
      activeStageEligibility.reasons.some((reason) => reason.includes('must not have an active stage')),
      'expected active-stage reason',
    );

    // 4. Stage missing endedAt
    const missingEndAtProcess = await createProcess(
      context.prisma,
      ProcessStatus.PARECER_EMITIDO,
      evaluatedUser.id,
      supervisor.id,
    );
    await context.prisma.processStage.updateMany({
      where: { evaluationProcessId: missingEndAtProcess.id },
      data: { startedAt: new Date('2026-01-01T00:00:00.000Z'), endedAt: null },
    });
    const missingEndAtEligibility = await services.eligibility.evaluate(missingEndAtProcess.id);
    assert.equal(missingEndAtEligibility.isEligible, false);
    assert.ok(
      missingEndAtEligibility.reasons.some((reason) => reason.includes('endedAt is null')),
      'expected endedAt reason',
    );

    // 5. Missing supervisor evaluation (and other artifacts)
    const missingArtifactsProcess = await createProcess(
      context.prisma,
      ProcessStatus.PARECER_EMITIDO,
      evaluatedUser.id,
      supervisor.id,
    );
    await context.prisma.processStage.updateMany({
      where: { evaluationProcessId: missingArtifactsProcess.id },
      data: {
        startedAt: new Date('2026-01-01T00:00:00.000Z'),
        endedAt: new Date('2026-02-01T00:00:00.000Z'),
      },
    });
    const missingArtifactsEligibility = await services.eligibility.evaluate(missingArtifactsProcess.id);
    assert.equal(missingArtifactsEligibility.isEligible, false);
    assert.ok(
      missingArtifactsEligibility.reasons.some((reason) =>
        reason.includes('missing the supervisor evaluation'),
      ),
      'expected supervisor evaluation reason',
    );
    assert.ok(
      missingArtifactsEligibility.reasons.some((reason) =>
        reason.includes('missing the self evaluation'),
      ),
      'expected self evaluation reason',
    );
    assert.ok(
      missingArtifactsEligibility.reasons.some((reason) =>
        reason.includes('missing the CESAD stage opinion'),
      ),
      'expected CESAD stage opinion reason',
    );
    assert.ok(
      missingArtifactsEligibility.reasons.some((reason) =>
        reason.includes('CESAD opinion document'),
      ),
      'expected CESAD opinion document reason',
    );

    // === CONSOLIDATION TESTS ===
    const snapshot = await services.consolidation.buildSnapshot(ready.processId);
    assert.equal(snapshot.processId, ready.processId);
    assert.equal(snapshot.stageCount, 4);
    assert.equal(snapshot.completedStageCount, 4);
    assert.equal(snapshot.stages.length, 4);
    assert.deepEqual(
      snapshot.stages.map((stage) => stage.sequence),
      [1, 2, 3, 4],
    );
    snapshot.stages.forEach((stage) => {
      assert.equal(stage.isComplete, true);
      assert.ok(stage.supervisorEvaluation, 'supervisorEvaluation present');
      assert.ok(stage.selfEvaluation, 'selfEvaluation present');
      assert.ok(stage.cesadStageOpinion, 'cesadStageOpinion present');
      assert.equal(stage.cesadStageOpinion?.stageConcept, 'Satisfatório');
      assert.equal(stage.cesadStageOpinion?.stageResult, 'Favorável');
      assert.ok(stage.cesadOpinionDocument, 'cesadOpinionDocument present');
      assert.equal(stage.cesadOpinionDocument?.documentStatus, 'SIGNED');
      assert.equal(stage.cesadExpectedSignersCount, 1);
      assert.equal(stage.cesadCompletedSignaturesCount, 1);
    });

    // === FLOW TESTS ===
    // Cannot complete before a DRAFT final opinion exists
    const completeWithoutDraftReady = await buildFullyCompletedProcess(context, {
      supervisorUserId: supervisor.id,
      evaluatedUserId: evaluatedUser.id,
      cesadMemberUserId: cesadMember.id,
      cesadMemberName: cesadMember.name,
      cesadMemberEmail: cesadMember.email,
    });
    await assert.rejects(
      () =>
        services.service.complete(
          completeWithoutDraftReady.processId,
          authenticatedUser(cesadMember.id, cesadMember.role),
          buildPayload(),
        ),
      /must be started as DRAFT before completion/,
    );
    const missingDraftOpinion = await context.prisma.cesadFinalOpinion.findUnique({
      where: { processId: completeWithoutDraftReady.processId },
    });
    assert.equal(
      missingDraftOpinion,
      null,
      'complete without DRAFT must not create a completed final opinion',
    );
    const missingDraftAuditEvents = await context.prisma.auditEvent.findMany({
      where: {
        evaluationProcessId: completeWithoutDraftReady.processId,
        eventType: {
          in: [
            PrismaAuditEventType.CESAD_FINAL_OPINION_STARTED,
            PrismaAuditEventType.CESAD_FINAL_OPINION_COMPLETED,
          ],
        },
      },
    });
    assert.equal(
      missingDraftAuditEvents.length,
      0,
      'complete without DRAFT must not create synthetic final opinion audit events',
    );

    // Start opinion
    const started = await services.service.start(
      ready.processId,
      authenticatedUser(cesadMember.id, cesadMember.role),
      { comment: 'Iniciando parecer final.' },
    );
    assert.equal(started.scope, 'FINAL');
    assert.equal(started.processId, ready.processId);
    assert.equal(started.status, CesadFinalOpinionStatus.DRAFT);
    assert.equal(started.reportText, '');
    assert.equal(started.finalConclusion, '');
    assert.equal(started.completedAt, null);
    assert.equal(started.consolidatedSnapshot, null);

    // Cannot start again
    await assert.rejects(
      () =>
        services.service.start(
          ready.processId,
          authenticatedUser(cesadMember.id, cesadMember.role),
        ),
      /already exists/,
    );

    // Save draft
    const draft = await services.service.saveDraft(
      ready.processId,
      authenticatedUser(cesadMember.id, cesadMember.role),
      buildPayload({ comment: 'Rascunho do parecer final.' }),
    );
    assert.equal(draft.id, started.id);
    assert.equal(draft.status, CesadFinalOpinionStatus.DRAFT);
    assert.equal(draft.reportText, 'Relatório consolidado das quatro etapas.');
    assert.equal(draft.finalConclusion, 'A comissão CESAD conclui pela aprovação final do servidor.');
    assert.equal(draft.finalResult, 'Apto');

    // Cannot complete with missing required fields
    await assert.rejects(
      () =>
        services.service.complete(
          ready.processId,
          authenticatedUser(cesadMember.id, cesadMember.role),
          { reportText: '', finalConclusion: '' },
        ),
      /required to complete/,
    );

    // Complete
    const completed = await services.service.complete(
      ready.processId,
      authenticatedUser(cesadMember.id, cesadMember.role),
      buildPayload({ comment: 'Conclusão do parecer final.' }),
    );
    assert.equal(completed.id, started.id);
    assert.equal(completed.status, CesadFinalOpinionStatus.COMPLETED);
    assert.notEqual(completed.completedAt, null);
    assert.ok(completed.consolidatedSnapshot, 'consolidated snapshot present after completion');
    assert.equal(completed.consolidatedSnapshot?.stageCount, 4);
    assert.equal(completed.consolidatedSnapshot?.completedStageCount, 4);

    // Cannot edit after completion
    await assert.rejects(
      () =>
        services.service.saveDraft(
          ready.processId,
          authenticatedUser(cesadMember.id, cesadMember.role),
          buildPayload(),
        ),
      /cannot be edited as draft/,
    );
    await assert.rejects(
      () =>
        services.service.complete(
          ready.processId,
          authenticatedUser(cesadMember.id, cesadMember.role),
          buildPayload(),
        ),
      /already been completed/,
    );

    // Process status remains PARECER_EMITIDO
    const processAfterCompletion = await context.prisma.evaluationProcess.findUniqueOrThrow({
      where: { id: ready.processId },
    });
    assert.equal(processAfterCompletion.status, PrismaProcessStatus.PARECER_EMITIDO);

    // No ProcessDocument was created for final opinion
    const finalOpinionDocuments = await context.prisma.processDocument.findMany({
      where: {
        evaluationProcessId: ready.processId,
        processStageId: null,
      },
    });
    assert.equal(
      finalOpinionDocuments.length,
      0,
      'no ProcessDocument should be created for final opinion in this slice',
    );

    // === AUTHORIZATION TESTS ===
    // Build a fresh process for authorization tests
    const authReady = await buildFullyCompletedProcess(context, {
      supervisorUserId: supervisor.id,
      evaluatedUserId: evaluatedUser.id,
      cesadMemberUserId: cesadMember.id,
      cesadMemberName: cesadMember.name,
      cesadMemberEmail: cesadMember.email,
    });

    // Unrelated CESAD member is blocked
    await assert.rejects(
      () =>
        services.service.start(
          authReady.processId,
          authenticatedUser(unrelatedCesad.id, unrelatedCesad.role),
        ),
      /CESAD contextual authorization denied/,
    );

    // Supervisor blocked
    await assert.rejects(
      () =>
        services.service.start(
          authReady.processId,
          authenticatedUser(supervisor.id, supervisor.role),
        ),
      /CESAD contextual authorization denied/,
    );

    // Intern server blocked
    await assert.rejects(
      () =>
        services.service.start(
          authReady.processId,
          authenticatedUser(evaluatedUser.id, evaluatedUser.role),
        ),
      /CESAD contextual authorization denied/,
    );

    // Homologation authority blocked
    await assert.rejects(
      () =>
        services.service.start(
          authReady.processId,
          authenticatedUser(homologationAuthority.id, homologationAuthority.role),
        ),
      /CESAD contextual authorization denied/,
    );

    // Assistant blocked for writes
    await assert.rejects(
      () =>
        services.service.start(
          authReady.processId,
          authenticatedUser(assistant.id, assistant.role),
        ),
      /CESAD contextual authorization denied/,
    );

    // ADMIN can operate
    const adminStarted = await services.service.start(
      authReady.processId,
      authenticatedUser(admin.id, admin.role),
    );
    assert.equal(adminStarted.status, CesadFinalOpinionStatus.DRAFT);

    // ADMIN can complete
    const adminCompleted = await services.service.complete(
      authReady.processId,
      authenticatedUser(admin.id, admin.role),
      buildPayload(),
    );
    assert.equal(adminCompleted.status, CesadFinalOpinionStatus.COMPLETED);

    // Assistant CAN read eligibility on yet another fully-completed process where they're in commission
    const readReady = await buildFullyCompletedProcess(context, {
      supervisorUserId: supervisor.id,
      evaluatedUserId: evaluatedUser.id,
      cesadMemberUserId: cesadMember.id,
      cesadMemberName: cesadMember.name,
      cesadMemberEmail: cesadMember.email,
    });
    await context.prisma.cesadCommissionMember.create({
      data: {
        commissionId: readReady.commissionId,
        userId: assistant.id,
        roleType: 'TITULAR',
        startDate: new Date('2020-01-01T00:00:00.000Z'),
      },
    });
    const assistantEligibility = await services.service.getEligibility(
      readReady.processId,
      authenticatedUser(assistant.id, assistant.role),
    );
    assert.equal(assistantEligibility.isEligible, true);

    // Assistant CANNOT complete
    await assert.rejects(
      () =>
        services.service.start(
          readReady.processId,
          authenticatedUser(assistant.id, assistant.role),
        ),
      /CESAD contextual authorization denied/,
    );

    // === AUDIT TESTS ===
    const auditEvents = await context.prisma.auditEvent.findMany({
      where: { evaluationProcessId: ready.processId },
      orderBy: { occurredAt: 'asc' },
    });
    const finalOpinionEventTypes: PrismaAuditEventType[] = [
      PrismaAuditEventType.CESAD_FINAL_OPINION_STARTED,
      PrismaAuditEventType.CESAD_FINAL_OPINION_DRAFT_SAVED,
      PrismaAuditEventType.CESAD_FINAL_OPINION_COMPLETED,
    ];
    const finalOpinionEvents = auditEvents.filter((event) =>
      finalOpinionEventTypes.includes(event.eventType),
    );

    const startEvent = finalOpinionEvents.find(
      (event) => event.eventType === PrismaAuditEventType.CESAD_FINAL_OPINION_STARTED,
    );
    const draftEvent = finalOpinionEvents.find(
      (event) => event.eventType === PrismaAuditEventType.CESAD_FINAL_OPINION_DRAFT_SAVED,
    );
    const completedEvent = finalOpinionEvents.find(
      (event) => event.eventType === PrismaAuditEventType.CESAD_FINAL_OPINION_COMPLETED,
    );

    assert.ok(startEvent, 'expected CESAD_FINAL_OPINION_STARTED audit event');
    assert.ok(draftEvent, 'expected CESAD_FINAL_OPINION_DRAFT_SAVED audit event');
    assert.ok(completedEvent, 'expected CESAD_FINAL_OPINION_COMPLETED audit event');
    assert.equal(
      finalOpinionEvents.filter(
        (event) => event.eventType === PrismaAuditEventType.CESAD_FINAL_OPINION_STARTED,
      ).length,
      1,
      'normal completion must not create an extra synthetic start event',
    );
    assert.equal(
      finalOpinionEvents.filter(
        (event) => event.eventType === PrismaAuditEventType.CESAD_FINAL_OPINION_COMPLETED,
      ).length,
      1,
      'normal completion should create one completion event',
    );

    for (const event of [startEvent, draftEvent, completedEvent]) {
      const metadata = event!.metadata as Record<string, unknown>;
      assert.equal(metadata.origin, 'CESAD_FINAL_OPINION');
      assert.equal(metadata.scope, 'FINAL');
      assert.equal(metadata.processId, ready.processId);
      assert.equal(metadata.performedByUserId, cesadMember.id);
      assert.equal(metadata.performedByRole, UserRole.CESAD_MEMBER);
      assert.equal(typeof metadata.cesadFinalOpinionId, 'string');
      assert.equal(metadata.processStatus, ProcessStatus.PARECER_EMITIDO);
      assert.equal(metadata.action, expectedActionFor(event!.eventType));
    }

    const completedMetadata = completedEvent!.metadata as Record<string, unknown>;
    assert.equal(completedMetadata.stageCount, 4);
    assert.equal(completedMetadata.completedStageCount, 4);
    assert.equal(completedMetadata.snapshotStageCount, 4);
    assert.equal(completedMetadata.snapshotCompletedStageCount, 4);
    assert.equal(typeof completedMetadata.snapshotGeneratedAt, 'string');
    assert.equal(completedMetadata.finalResult, 'Apto');
    assert.equal(completedMetadata.finalConcept, 'Satisfatório');
    assert.equal(completedMetadata.recommendation, 'Recomenda-se a homologação.');

    // === EXTRA CHECK: completion blocked if process status is not PARECER_EMITIDO ===
    const noPareceProcess = await createProcess(
      context.prisma,
      ProcessStatus.EM_AVALIACAO,
      evaluatedUser.id,
      supervisor.id,
    );
    await assert.rejects(
      () =>
        services.service.start(
          noPareceProcess.id,
          authenticatedUser(cesadMember.id, cesadMember.role),
        ),
      /can only be manipulated while process is in PARECER_EMITIDO/,
    );
  } finally {
    await disposeTestContext(context);
  }
}

function expectedActionFor(eventType: PrismaAuditEventType): ProcessAction {
  switch (eventType) {
    case PrismaAuditEventType.CESAD_FINAL_OPINION_STARTED:
      return ProcessAction.START_CESAD_FINAL_OPINION;
    case PrismaAuditEventType.CESAD_FINAL_OPINION_DRAFT_SAVED:
      return ProcessAction.SAVE_CESAD_FINAL_OPINION_DRAFT;
    case PrismaAuditEventType.CESAD_FINAL_OPINION_COMPLETED:
      return ProcessAction.COMPLETE_CESAD_FINAL_OPINION;
    default:
      throw new Error(`Unexpected event type ${eventType}`);
  }
}
