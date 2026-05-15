import assert from 'node:assert/strict';

import {
  AuditEventType as PrismaAuditEventType,
  Prisma,
  type PrismaClient,
  ProcessStatus as PrismaProcessStatus,
} from '@prisma/client';
import {
  CesadOpinionKind,
  CesadFinalOpinionStatus,
  DocumentStatus,
  DocumentType,
  ProcessAction,
  ProcessStatus,
  SignatureStatus,
  UserRole,
} from '@sadep/contracts';

import { CesadFinalOpinionConsolidationService } from '../cesad-final-opinions/cesad-final-opinion-consolidation.service';
import { CesadFinalOpinionEligibilityService } from '../cesad-final-opinions/cesad-final-opinion-eligibility.service';
import { CesadFinalOpinionsService } from '../cesad-final-opinions/cesad-final-opinions.service';
import {
  authenticatedUser,
  applyProcessDocumentFinalCesadOpinionDatabaseConstraints,
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
      opinionKind: 'STAGE',
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

type FinalDocumentAfterConflict = {
  id: string;
  documentStatus: 'DRAFT' | 'CONSOLIDATED' | 'READY_FOR_SIGNATURE' | 'SIGNED' | 'INVALIDATED_OR_SUPERSEDED';
};

type FinalDocumentPrivateService = {
  ensureCesadFinalOpinionDocument(
    transaction: Prisma.TransactionClient,
    processId: string,
    cesadFinalOpinionId: string,
    user: ReturnType<typeof authenticatedUser>,
    processStatus: ProcessStatus,
  ): Promise<{ documentId: string }>;
};

function buildFinalDocumentConflictTransaction(existingAfterConflict: FinalDocumentAfterConflict | null) {
  let findFirstCalls = 0;
  const updates: Array<{ where: { id: string }; data: { documentStatus: string } }> = [];
  const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: '6.19.3',
  });

  const transaction = {
    processDocument: {
      findFirst: async () => {
        findFirstCalls += 1;
        return findFirstCalls < 3 ? null : existingAfterConflict;
      },
      create: async () => {
        throw p2002;
      },
      update: async (args: { where: { id: string }; data: { documentStatus: string } }) => {
        updates.push(args);
        return { ...existingAfterConflict, ...args.data };
      },
    },
    auditEvent: {
      create: async () => {
        throw new Error('P2002 idempotency path must not emit document generation audit');
      },
    },
  } as unknown as Prisma.TransactionClient;

  return { transaction, updates, p2002 };
}

async function ensureFinalDocumentAfterP2002ForTest(
  context: TestContext,
  existingAfterConflict: FinalDocumentAfterConflict | null,
) {
  const { transaction, updates, p2002 } = buildFinalDocumentConflictTransaction(existingAfterConflict);
  const service = context.processDocumentsService as unknown as FinalDocumentPrivateService;

  return {
    result: await service.ensureCesadFinalOpinionDocument(
      transaction,
      'process-final-p2002',
      'final-opinion-p2002',
      authenticatedUser('admin-p2002', UserRole.ADMIN),
      ProcessStatus.PARECER_EMITIDO,
    ),
    updates,
    p2002,
  };
}

export async function runCesadFinalOpinionsServiceTests() {
  const context = await createTestContext('cesad-final-opinions-service-test');
  applyProcessDocumentFinalCesadOpinionDatabaseConstraints();
  const services = buildFinalServices(context);

  try {
    const readyAfterConflict = await ensureFinalDocumentAfterP2002ForTest(context, {
      id: 'ready-final-doc',
      documentStatus: 'READY_FOR_SIGNATURE',
    });
    assert.equal(readyAfterConflict.result.documentId, 'ready-final-doc');
    assert.equal(readyAfterConflict.updates.length, 0);

    const draftAfterConflict = await ensureFinalDocumentAfterP2002ForTest(context, {
      id: 'draft-final-doc',
      documentStatus: 'DRAFT',
    });
    assert.equal(draftAfterConflict.result.documentId, 'draft-final-doc');
    assert.deepEqual(draftAfterConflict.updates, [
      {
        where: { id: 'draft-final-doc' },
        data: { documentStatus: 'READY_FOR_SIGNATURE' },
      },
    ]);

    await assert.rejects(
      () =>
        ensureFinalDocumentAfterP2002ForTest(context, {
          id: 'invalidated-final-doc',
          documentStatus: 'INVALIDATED_OR_SUPERSEDED',
        }),
      /invalidated CESAD final opinion document/,
    );

    await assert.rejects(
      () => ensureFinalDocumentAfterP2002ForTest(context, null),
      (error) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002',
    );

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
    const secondCesadSigner = await createUser(
      context.prisma,
      UserRole.CESAD_MEMBER,
      'cfo-second-signer@test.local',
      'CESAD Segundo Titular',
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

    const draftOnlyReady = await buildFullyCompletedProcess(context, {
      supervisorUserId: supervisor.id,
      evaluatedUserId: evaluatedUser.id,
      cesadMemberUserId: cesadMember.id,
      cesadMemberName: cesadMember.name,
      cesadMemberEmail: cesadMember.email,
    });
    await services.service.start(
      draftOnlyReady.processId,
      authenticatedUser(cesadMember.id, cesadMember.role),
    );
    await assert.rejects(
      () =>
        context.processDocumentsService.prepareCesadFinalOpinionSignatures(
          draftOnlyReady.processId,
          authenticatedUser(cesadMember.id, cesadMember.role),
        ),
      /require a completed CESAD final opinion/,
    );
    const draftOnlyFinalDocuments = await context.prisma.processDocument.findMany({
      where: {
        evaluationProcessId: draftOnlyReady.processId,
        processStageId: null,
        documentType: 'CESAD_OPINION',
      },
    });
    assert.equal(draftOnlyFinalDocuments.length, 0);

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

    // Functional completion does not automatically create the final ProcessDocument
    const finalOpinionDocuments = await context.prisma.processDocument.findMany({
      where: {
        evaluationProcessId: ready.processId,
        processStageId: null,
      },
    });
    assert.equal(
      finalOpinionDocuments.length,
      0,
      'functional completion must not create the final ProcessDocument before signature preparation',
    );

    await context.prisma.cesadCommissionMember.createMany({
      data: [
        {
          commissionId: ready.commissionId,
          userId: secondCesadSigner.id,
          roleType: 'TITULAR',
          startDate: new Date('2020-01-01T00:00:00.000Z'),
        },
        {
          commissionId: ready.commissionId,
          userId: assistant.id,
          roleType: 'TITULAR',
          startDate: new Date('2020-01-01T00:00:00.000Z'),
        },
        {
          commissionId: ready.commissionId,
          userId: admin.id,
          roleType: 'TITULAR',
          startDate: new Date('2020-01-01T00:00:00.000Z'),
        },
      ],
    });

    const prepared = await context.processDocumentsService.prepareCesadFinalOpinionSignatures(
      ready.processId,
      authenticatedUser(cesadMember.id, cesadMember.role),
    );
    assert.equal(prepared.processId, ready.processId);
    assert.equal(prepared.cesadFinalOpinionId, completed.id);
    assert.equal(prepared.document?.documentType, DocumentType.CESAD_OPINION);
    assert.equal(prepared.document?.opinionKind, CesadOpinionKind.FINAL_CONCLUSIVE);
    assert.equal(prepared.document?.documentStatus, DocumentStatus.READY_FOR_SIGNATURE);
    assert.equal(prepared.expectedSigners.length, 2);
    assert.deepEqual(
      prepared.expectedSigners.map((signer) => signer.actingUserId).sort(),
      [cesadMember.id, secondCesadSigner.id].sort(),
    );
    assert.equal(prepared.expectedSigners.some((signer) => signer.actingUserId === assistant.id), false);
    assert.equal(prepared.expectedSigners.some((signer) => signer.actingUserId === admin.id), false);
    assert.equal(
      prepared.expectedSigners.every((signer) => signer.signatureStatus === SignatureStatus.PENDING),
      true,
    );
    assert.equal(prepared.allExpectedSignersSigned, false);

    const finalDocument = await context.prisma.processDocument.findUniqueOrThrow({
      where: { id: prepared.document!.documentId },
      include: { signatureRecords: true },
    });
    assert.equal(finalDocument.processStageId, null);
    assert.equal(finalDocument.opinionKind, 'FINAL_CONCLUSIVE');
    assert.equal(finalDocument.signatureRecords.length, 2);
    assert.equal(
      finalDocument.signatureRecords.every(
        (signature) =>
          signature.cesadFinalOpinionExpectedSignerId !== null &&
          signature.cesadStageOpinionExpectedSignerId === null,
      ),
      true,
    );

    const stageOpinionDocuments = await context.prisma.processDocument.findMany({
      where: {
        evaluationProcessId: ready.processId,
        documentType: 'CESAD_OPINION',
        processStageId: { not: null },
      },
    });
    assert.equal(stageOpinionDocuments.length, 4);
    assert.equal(
      stageOpinionDocuments.every((document) => document.opinionKind === 'STAGE'),
      true,
    );

    const secondPrepare = await context.processDocumentsService.prepareCesadFinalOpinionSignatures(
      ready.processId,
      authenticatedUser(admin.id, admin.role),
    );
    assert.equal(secondPrepare.document?.documentId, prepared.document?.documentId);
    assert.equal(secondPrepare.expectedSigners.length, 2);
    const finalDocumentsAfterIdempotentPrepare = await context.prisma.processDocument.findMany({
      where: {
        evaluationProcessId: ready.processId,
        processStageId: null,
        documentType: 'CESAD_OPINION',
        opinionKind: 'FINAL_CONCLUSIVE',
      },
    });
    assert.equal(finalDocumentsAfterIdempotentPrepare.length, 1);
    await assert.rejects(
      context.prisma.processDocument.create({
        data: {
          evaluationProcessId: ready.processId,
          processStageId: null,
          documentType: 'CESAD_OPINION',
          opinionKind: 'FINAL_CONCLUSIVE',
          documentStatus: 'READY_FOR_SIGNATURE',
          artifactPath: null,
        },
      }),
      (error) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002',
    );
    assert.equal(
      await context.prisma.cesadFinalOpinionExpectedSigner.count({
        where: { cesadFinalOpinionId: completed.id },
      }),
      2,
    );

    const assistantReadStatus = await context.processDocumentsService.getCesadFinalOpinionSignatureStatus(
      ready.processId,
      authenticatedUser(assistant.id, assistant.role),
    );
    assert.equal(assistantReadStatus.document?.documentId, prepared.document?.documentId);

    await assert.rejects(
      () =>
        context.processDocumentsService.prepareCesadFinalOpinionSignatures(
          ready.processId,
          authenticatedUser(assistant.id, assistant.role),
        ),
      /Only CESAD_MEMBER can prepare CESAD final opinion signatures|CESAD contextual authorization denied/,
    );
    await assert.rejects(
      () =>
        context.processDocumentsService.signCesadFinalOpinionDocument(
          ready.processId,
          authenticatedUser(admin.id, admin.role),
        ),
      /Only an expected CESAD_MEMBER can sign CESAD final opinion document/,
    );
    await assert.rejects(
      () =>
        context.processDocumentsService.signCesadFinalOpinionDocument(
          ready.processId,
          authenticatedUser(assistant.id, assistant.role),
        ),
      /Only an expected CESAD_MEMBER can sign CESAD final opinion document/,
    );
    await assert.rejects(
      () =>
        context.processDocumentsService.signCesadFinalOpinionDocument(
          ready.processId,
          authenticatedUser(unrelatedCesad.id, unrelatedCesad.role),
        ),
      /CESAD contextual authorization denied|not an expected signer/,
    );

    const partialSignature = await context.processDocumentsService.signCesadFinalOpinionDocument(
      ready.processId,
      authenticatedUser(cesadMember.id, cesadMember.role),
    );
    assert.equal(partialSignature.document?.documentStatus, DocumentStatus.READY_FOR_SIGNATURE);
    assert.equal(partialSignature.allExpectedSignersSigned, false);

    await assert.rejects(
      () =>
        context.processDocumentsService.signCesadFinalOpinionDocument(
          ready.processId,
          authenticatedUser(cesadMember.id, cesadMember.role),
        ),
      /already been completed or canceled/,
    );

    const completedSignature = await context.processDocumentsService.signCesadFinalOpinionDocument(
      ready.processId,
      authenticatedUser(secondCesadSigner.id, secondCesadSigner.role),
    );
    assert.equal(completedSignature.document?.documentStatus, DocumentStatus.SIGNED);
    assert.equal(completedSignature.allExpectedSignersSigned, true);

    const processAfterFinalSignatures = await context.prisma.evaluationProcess.findUniqueOrThrow({
      where: { id: ready.processId },
    });
    assert.equal(processAfterFinalSignatures.status, PrismaProcessStatus.PARECER_EMITIDO);

    const supervisorAndSelfDocuments = await context.prisma.processDocument.findMany({
      where: {
        evaluationProcessId: ready.processId,
        documentType: { in: ['SUPERVISOR_EVALUATION', 'SELF_EVALUATION'] },
      },
    });
    assert.equal(
      supervisorAndSelfDocuments.every((document) => document.opinionKind === null),
      true,
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

    const finalDocumentGeneratedEvents = auditEvents.filter((event) => {
      const metadata = event.metadata as Record<string, unknown>;
      return (
        event.eventType === PrismaAuditEventType.DOCUMENT_GENERATED &&
        metadata.action === ProcessAction.PREPARE_CESAD_FINAL_OPINION_SIGNATURES
      );
    });
    assert.equal(finalDocumentGeneratedEvents.length, 1);
    assert.equal(
      (finalDocumentGeneratedEvents[0]!.metadata as Record<string, unknown>).opinionKind,
      CesadOpinionKind.FINAL_CONCLUSIVE,
    );

    const finalSignatureRequestedEvents = auditEvents.filter((event) => {
      const metadata = event.metadata as Record<string, unknown>;
      return (
        event.eventType === PrismaAuditEventType.SIGNATURE_REQUESTED &&
        metadata.action === ProcessAction.PREPARE_CESAD_FINAL_OPINION_SIGNATURES
      );
    });
    assert.equal(finalSignatureRequestedEvents.length, 2);
    assert.equal(
      finalSignatureRequestedEvents.every((event) => {
        const metadata = event.metadata as Record<string, unknown>;
        return (
          metadata.documentId === prepared.document?.documentId &&
          metadata.cesadFinalOpinionId === completed.id &&
          metadata.opinionKind === CesadOpinionKind.FINAL_CONCLUSIVE
        );
      }),
      true,
    );

    const finalSignedEvents = auditEvents.filter(
      (event) => event.eventType === PrismaAuditEventType.CESAD_FINAL_OPINION_SIGNED,
    );
    assert.equal(finalSignedEvents.length, 2);
    assert.equal(
      finalSignedEvents.every((event) => {
        const metadata = event.metadata as Record<string, unknown>;
        return (
          metadata.action === ProcessAction.SIGN_CESAD_FINAL_OPINION &&
          metadata.documentId === prepared.document?.documentId &&
          metadata.cesadFinalOpinionId === completed.id &&
          metadata.opinionKind === CesadOpinionKind.FINAL_CONCLUSIVE
        );
      }),
      true,
    );

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
