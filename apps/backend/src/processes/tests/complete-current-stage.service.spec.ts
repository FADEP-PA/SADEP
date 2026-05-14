import assert from 'node:assert/strict';

import {
  AuditEventType,
  ProcessAction,
  ProcessStatus,
  UserRole,
} from '@sadep/contracts';
import type { PrismaClient } from '@prisma/client';

import {
  authenticatedUser,
  createActiveCesadCommission,
  createCesadStageAssignment,
  createProcess,
  createSignedRequiredStageDocuments,
  createTestContext,
  createUser,
  disposeTestContext,
  type TestContext,
} from './test-helpers';

type ReadyStageContext = {
  processId: string;
  stageId: string;
  stageSequence: number;
  cesadOpinionDocumentId: string;
  cesadStageOpinionId: string;
  expectedSignerIds: string[];
};

async function prepareStageReadyForCompletion(
  prisma: PrismaClient,
  options: {
    processId: string;
    stageId: string;
    stageSequence: number;
    supervisorUserId: string;
    evaluatedUserId: string;
    cesadMemberUserId: string;
    commissionId: string;
    commissionMemberId: string;
    cesadMemberName: string;
    cesadMemberEmail: string;
    referenceDate?: Date;
  },
): Promise<ReadyStageContext> {
  const referenceDate = options.referenceDate ?? new Date('2026-04-20T10:00:00.000Z');

  await createSignedRequiredStageDocuments(
    prisma,
    options.processId,
    options.stageId,
    options.supervisorUserId,
    options.evaluatedUserId,
  );

  const opinion = await prisma.cesadStageOpinion.create({
    data: {
      processId: options.processId,
      processStageId: options.stageId,
      authorUserId: options.cesadMemberUserId,
      status: 'COMPLETED',
      reportText: 'Parecer CESAD da etapa concluido.',
      conclusion: 'Conclusao tecnica da etapa.',
      completedAt: referenceDate,
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
      frozenAt: referenceDate,
    },
  });

  const document = await prisma.processDocument.create({
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
            signedAt: referenceDate,
            cesadStageOpinionExpectedSignerId: expectedSigner.id,
          },
        ],
      },
    },
  });

  return {
    processId: options.processId,
    stageId: options.stageId,
    stageSequence: options.stageSequence,
    cesadOpinionDocumentId: document.id,
    cesadStageOpinionId: opinion.id,
    expectedSignerIds: [expectedSigner.id],
  };
}

async function buildReadyToCompleteStage(
  context: TestContext,
  options: {
    supervisorUserId: string;
    evaluatedUserId: string;
    cesadMemberUserId: string;
    cesadMemberName: string;
    cesadMemberEmail: string;
    activeStageSequence: number;
    initialStatus?: ProcessStatus;
  },
): Promise<{
  processId: string;
  defaultStageId: string;
  activeStageId: string;
  activeStageSequence: number;
  commissionId: string;
  cesadOpinionDocumentId: string;
}> {
  const commission = await createActiveCesadCommission(context.prisma, [
    { userId: options.cesadMemberUserId, roleType: 'TITULAR' },
  ]);
  const commissionMember = await context.prisma.cesadCommissionMember.findFirstOrThrow({
    where: { commissionId: commission.id, userId: options.cesadMemberUserId },
  });

  const process = await createProcess(
    context.prisma,
    options.initialStatus ?? ProcessStatus.PARECER_EMITIDO,
    options.evaluatedUserId,
    options.supervisorUserId,
  );

  const stages = await context.prisma.processStage.findMany({
    where: { evaluationProcessId: process.id },
    orderBy: { sequence: 'asc' },
  });

  const targetStage = stages.find((stage) => stage.sequence === options.activeStageSequence);
  if (!targetStage) {
    throw new Error(`Target stage ${options.activeStageSequence} not found`);
  }

  if (options.activeStageSequence > 1) {
    for (const stage of stages) {
      if (stage.sequence < options.activeStageSequence) {
        await context.prisma.processStage.update({
          where: { id: stage.id },
          data: {
            startedAt: stage.startedAt ?? new Date('2026-01-01T00:00:00.000Z'),
            endedAt: new Date('2026-02-01T00:00:00.000Z'),
          },
        });
      } else if (stage.sequence === options.activeStageSequence) {
        await context.prisma.processStage.update({
          where: { id: stage.id },
          data: {
            startedAt: new Date('2026-03-01T00:00:00.000Z'),
            endedAt: null,
          },
        });
      } else {
        await context.prisma.processStage.update({
          where: { id: stage.id },
          data: {
            startedAt: null,
            endedAt: null,
          },
        });
      }
    }
  }

  await createCesadStageAssignment(
    context.prisma,
    process.id,
    targetStage.id,
    commission.id,
    options.supervisorUserId,
  );

  await prepareStageReadyForCompletion(context.prisma, {
    processId: process.id,
    stageId: targetStage.id,
    stageSequence: options.activeStageSequence,
    supervisorUserId: options.supervisorUserId,
    evaluatedUserId: options.evaluatedUserId,
    cesadMemberUserId: options.cesadMemberUserId,
    commissionId: commission.id,
    commissionMemberId: commissionMember.id,
    cesadMemberName: options.cesadMemberName,
    cesadMemberEmail: options.cesadMemberEmail,
  });

  const refreshedStages = await context.prisma.processStage.findMany({
    where: { evaluationProcessId: process.id },
    orderBy: { sequence: 'asc' },
  });
  const refreshedTarget = refreshedStages.find((stage) => stage.sequence === options.activeStageSequence);
  if (!refreshedTarget) {
    throw new Error('Active stage missing after preparation');
  }
  const opinionDocument = await context.prisma.processDocument.findFirstOrThrow({
    where: {
      evaluationProcessId: process.id,
      processStageId: refreshedTarget.id,
      documentType: 'CESAD_OPINION',
    },
  });

  return {
    processId: process.id,
    defaultStageId: process.defaultStageId,
    activeStageId: refreshedTarget.id,
    activeStageSequence: options.activeStageSequence,
    commissionId: commission.id,
    cesadOpinionDocumentId: opinionDocument.id,
  };
}

export async function runCompleteCurrentStageServiceTests() {
  const context = await createTestContext('complete-current-stage-test');

  try {
    const evaluatedUser = await createUser(context.prisma, UserRole.INTERN_SERVER, 'ccs-evaluated@test.local');
    const supervisor = await createUser(
      context.prisma,
      UserRole.IMMEDIATE_SUPERVISOR,
      'ccs-supervisor@test.local',
    );
    const cesadMember = await createUser(
      context.prisma,
      UserRole.CESAD_MEMBER,
      'ccs-cesad@test.local',
      'CESAD Titular',
    );
    const unrelatedCesad = await createUser(
      context.prisma,
      UserRole.CESAD_MEMBER,
      'ccs-unrelated-cesad@test.local',
    );
    const assistant = await createUser(
      context.prisma,
      UserRole.COMMISSION_ASSISTANT,
      'ccs-assistant@test.local',
    );
    const admin = await createUser(context.prisma, UserRole.ADMIN, 'ccs-admin@test.local');
    const homologationAuthority = await createUser(
      context.prisma,
      UserRole.HOMOLOGATION_AUTHORITY,
      'ccs-authority@test.local',
    );

    const stage1Ready = await buildReadyToCompleteStage(context, {
      supervisorUserId: supervisor.id,
      evaluatedUserId: evaluatedUser.id,
      cesadMemberUserId: cesadMember.id,
      cesadMemberName: cesadMember.name,
      cesadMemberEmail: cesadMember.email,
      activeStageSequence: 1,
    });

    const workflowAvailable = await context.service.getWorkflow(
      stage1Ready.processId,
      authenticatedUser(cesadMember.id, cesadMember.role),
    );
    assert.deepEqual(workflowAvailable.availableActions, [ProcessAction.COMPLETE_CURRENT_STAGE]);

    const completedAtStage1 = new Date();
    const stage1Result = await context.service.transitionWorkflow(
      stage1Ready.processId,
      authenticatedUser(cesadMember.id, cesadMember.role),
      { action: ProcessAction.COMPLETE_CURRENT_STAGE },
    );
    assert.equal(stage1Result.status, ProcessStatus.EM_AVALIACAO);

    const stagesAfterStage1Closure = await context.prisma.processStage.findMany({
      where: { evaluationProcessId: stage1Ready.processId },
      orderBy: { sequence: 'asc' },
    });
    assert.equal(stagesAfterStage1Closure.length, 4);
    const stage1AfterClosure = stagesAfterStage1Closure[0]!;
    assert.notEqual(stage1AfterClosure.endedAt, null);
    assert.ok(stage1AfterClosure.endedAt && stage1AfterClosure.endedAt.getTime() >= completedAtStage1.getTime() - 5000);
    const stage2AfterClosure = stagesAfterStage1Closure[1]!;
    assert.notEqual(stage2AfterClosure.startedAt, null);
    assert.equal(stage2AfterClosure.endedAt, null);
    assert.equal(stage2AfterClosure.responsibleSupervisorUserId, supervisor.id);
    assert.equal(stagesAfterStage1Closure[2]?.startedAt, null);
    assert.equal(stagesAfterStage1Closure[3]?.startedAt, null);

    const stage1ProcessAfter = await context.prisma.evaluationProcess.findUniqueOrThrow({
      where: { id: stage1Ready.processId },
    });
    assert.equal(stage1ProcessAfter.status, 'EM_AVALIACAO');

    const stage1AuditEvent = await context.prisma.auditEvent.findFirstOrThrow({
      where: {
        evaluationProcessId: stage1Ready.processId,
        eventType: AuditEventType.STAGE_COMPLETED,
      },
    });
    const stage1Metadata = stage1AuditEvent.metadata as Record<string, unknown>;
    assert.equal(stage1Metadata.action, ProcessAction.COMPLETE_CURRENT_STAGE);
    assert.equal(stage1Metadata.processId, stage1Ready.processId);
    assert.equal(stage1Metadata.completedProcessStageId, stage1Ready.activeStageId);
    assert.equal(stage1Metadata.completedStageSequence, 1);
    assert.equal(stage1Metadata.completedStageCode, 'ETAPA_1');
    assert.equal(stage1Metadata.previousProcessStatus, ProcessStatus.PARECER_EMITIDO);
    assert.equal(stage1Metadata.nextProcessStatus, ProcessStatus.EM_AVALIACAO);
    assert.equal(stage1Metadata.nextProcessStageId, stage2AfterClosure.id);
    assert.equal(stage1Metadata.nextStageSequence, 2);
    assert.equal(stage1Metadata.nextStageCode, 'ETAPA_2');
    assert.equal(stage1Metadata.isFinalStage, false);
    assert.equal(stage1Metadata.performedByUserId, cesadMember.id);
    assert.equal(stage1Metadata.performedByRole, UserRole.CESAD_MEMBER);
    assert.equal(typeof stage1Metadata.occurredAt, 'string');
    assert.ok(stage1Metadata.stageCompletenessSummary);

    const stage1HistoricalDocuments = await context.prisma.processDocument.findMany({
      where: {
        evaluationProcessId: stage1Ready.processId,
        processStageId: stage1Ready.activeStageId,
      },
    });
    assert.equal(stage1HistoricalDocuments.length, 3);

    const adminReady = await buildReadyToCompleteStage(context, {
      supervisorUserId: supervisor.id,
      evaluatedUserId: evaluatedUser.id,
      cesadMemberUserId: cesadMember.id,
      cesadMemberName: cesadMember.name,
      cesadMemberEmail: cesadMember.email,
      activeStageSequence: 1,
    });
    const adminResult = await context.service.transitionWorkflow(
      adminReady.processId,
      authenticatedUser(admin.id, admin.role),
      { action: ProcessAction.COMPLETE_CURRENT_STAGE },
    );
    assert.equal(adminResult.status, ProcessStatus.EM_AVALIACAO);
    const adminAuditEvent = await context.prisma.auditEvent.findFirstOrThrow({
      where: {
        evaluationProcessId: adminReady.processId,
        eventType: AuditEventType.STAGE_COMPLETED,
      },
    });
    const adminMetadata = adminAuditEvent.metadata as Record<string, unknown>;
    assert.equal(adminMetadata.action, ProcessAction.COMPLETE_CURRENT_STAGE);
    assert.equal(adminMetadata.completedProcessStageId, adminReady.activeStageId);
    assert.equal(adminMetadata.performedByUserId, admin.id);
    assert.equal(adminMetadata.performedByRole, UserRole.ADMIN);

    const stage3Ready = await buildReadyToCompleteStage(context, {
      supervisorUserId: supervisor.id,
      evaluatedUserId: evaluatedUser.id,
      cesadMemberUserId: cesadMember.id,
      cesadMemberName: cesadMember.name,
      cesadMemberEmail: cesadMember.email,
      activeStageSequence: 3,
    });
    const stage3Result = await context.service.transitionWorkflow(
      stage3Ready.processId,
      authenticatedUser(cesadMember.id, cesadMember.role),
      { action: ProcessAction.COMPLETE_CURRENT_STAGE },
    );
    assert.equal(stage3Result.status, ProcessStatus.EM_AVALIACAO);
    const stage3AfterClosure = await context.prisma.processStage.findMany({
      where: { evaluationProcessId: stage3Ready.processId },
      orderBy: { sequence: 'asc' },
    });
    assert.notEqual(stage3AfterClosure[2]?.endedAt, null);
    assert.notEqual(stage3AfterClosure[3]?.startedAt, null);
    assert.equal(stage3AfterClosure[3]?.endedAt, null);

    const stage4Ready = await buildReadyToCompleteStage(context, {
      supervisorUserId: supervisor.id,
      evaluatedUserId: evaluatedUser.id,
      cesadMemberUserId: cesadMember.id,
      cesadMemberName: cesadMember.name,
      cesadMemberEmail: cesadMember.email,
      activeStageSequence: 4,
    });
    const stage4Result = await context.service.transitionWorkflow(
      stage4Ready.processId,
      authenticatedUser(cesadMember.id, cesadMember.role),
      { action: ProcessAction.COMPLETE_CURRENT_STAGE },
    );
    assert.equal(stage4Result.status, ProcessStatus.PARECER_EMITIDO);
    const stage4AfterClosure = await context.prisma.processStage.findMany({
      where: { evaluationProcessId: stage4Ready.processId },
      orderBy: { sequence: 'asc' },
    });
    assert.equal(stage4AfterClosure.length, 4);
    assert.notEqual(stage4AfterClosure[3]?.endedAt, null);
    const stage4ProcessAfter = await context.prisma.evaluationProcess.findUniqueOrThrow({
      where: { id: stage4Ready.processId },
    });
    assert.equal(stage4ProcessAfter.status, 'PARECER_EMITIDO');
    const stage4AuditEvent = await context.prisma.auditEvent.findFirstOrThrow({
      where: {
        evaluationProcessId: stage4Ready.processId,
        eventType: AuditEventType.STAGE_COMPLETED,
      },
    });
    const stage4Metadata = stage4AuditEvent.metadata as Record<string, unknown>;
    assert.equal(stage4Metadata.isFinalStage, true);
    assert.equal(stage4Metadata.previousProcessStatus, ProcessStatus.PARECER_EMITIDO);
    assert.equal(stage4Metadata.nextProcessStatus, ProcessStatus.PARECER_EMITIDO);
    assert.equal(stage4Metadata.nextProcessStageId, undefined);
    assert.equal(stage4Metadata.nextStageSequence, undefined);
    const stage4FinalDocuments = await context.prisma.processDocument.findMany({
      where: { evaluationProcessId: stage4Ready.processId },
    });
    assert(!stage4FinalDocuments.some((document) => document.documentType === 'HOMOLOGATION_RECORD'));

    const wrongStatusReady = await buildReadyToCompleteStage(context, {
      supervisorUserId: supervisor.id,
      evaluatedUserId: evaluatedUser.id,
      cesadMemberUserId: cesadMember.id,
      cesadMemberName: cesadMember.name,
      cesadMemberEmail: cesadMember.email,
      activeStageSequence: 1,
      initialStatus: ProcessStatus.EM_ANALISE_CESAD,
    });
    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          wrongStatusReady.processId,
          authenticatedUser(cesadMember.id, cesadMember.role),
          { action: ProcessAction.COMPLETE_CURRENT_STAGE },
        ),
      /not allowed when process is in status EM_ANALISE_CESAD/,
    );

    const supervisorBlockedReady = await buildReadyToCompleteStage(context, {
      supervisorUserId: supervisor.id,
      evaluatedUserId: evaluatedUser.id,
      cesadMemberUserId: cesadMember.id,
      cesadMemberName: cesadMember.name,
      cesadMemberEmail: cesadMember.email,
      activeStageSequence: 1,
    });
    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          supervisorBlockedReady.processId,
          authenticatedUser(supervisor.id, supervisor.role),
          { action: ProcessAction.COMPLETE_CURRENT_STAGE },
        ),
      /public workflow endpoint/,
    );
    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          supervisorBlockedReady.processId,
          authenticatedUser(evaluatedUser.id, evaluatedUser.role),
          { action: ProcessAction.COMPLETE_CURRENT_STAGE },
        ),
      /cannot execute action COMPLETE_CURRENT_STAGE/,
    );
    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          supervisorBlockedReady.processId,
          authenticatedUser(assistant.id, assistant.role),
          { action: ProcessAction.COMPLETE_CURRENT_STAGE },
        ),
      /CESAD contextual authorization denied|Role COMMISSION_ASSISTANT cannot execute action COMPLETE_CURRENT_STAGE/,
    );

    const assistantInCommission = await createUser(
      context.prisma,
      UserRole.COMMISSION_ASSISTANT,
      'ccs-assistant-in-commission@test.local',
    );
    const assistantBlockedReady = await buildReadyToCompleteStage(context, {
      supervisorUserId: supervisor.id,
      evaluatedUserId: evaluatedUser.id,
      cesadMemberUserId: cesadMember.id,
      cesadMemberName: cesadMember.name,
      cesadMemberEmail: cesadMember.email,
      activeStageSequence: 1,
    });
    await context.prisma.cesadCommissionMember.create({
      data: {
        commissionId: assistantBlockedReady.commissionId,
        userId: assistantInCommission.id,
        roleType: 'TITULAR',
        startDate: new Date('2020-01-01T00:00:00.000Z'),
      },
    });
    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          assistantBlockedReady.processId,
          authenticatedUser(assistantInCommission.id, assistantInCommission.role),
          { action: ProcessAction.COMPLETE_CURRENT_STAGE },
        ),
      /Role COMMISSION_ASSISTANT cannot execute action COMPLETE_CURRENT_STAGE/,
    );
    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          supervisorBlockedReady.processId,
          authenticatedUser(homologationAuthority.id, homologationAuthority.role),
          { action: ProcessAction.COMPLETE_CURRENT_STAGE },
        ),
      /legitimate link to this process|cannot execute action COMPLETE_CURRENT_STAGE/,
    );
    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          supervisorBlockedReady.processId,
          authenticatedUser(unrelatedCesad.id, unrelatedCesad.role),
          { action: ProcessAction.COMPLETE_CURRENT_STAGE },
        ),
      /CESAD contextual authorization denied/,
    );

    const adminIncompleteReady = await createProcess(
      context.prisma,
      ProcessStatus.PARECER_EMITIDO,
      evaluatedUser.id,
      supervisor.id,
    );
    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          adminIncompleteReady.id,
          authenticatedUser(admin.id, admin.role),
          { action: ProcessAction.COMPLETE_CURRENT_STAGE },
        ),
      /supervisor evaluation and self evaluation documents are fully signed/,
    );

    const adminOtherActionReady = await buildReadyToCompleteStage(context, {
      supervisorUserId: supervisor.id,
      evaluatedUserId: evaluatedUser.id,
      cesadMemberUserId: cesadMember.id,
      cesadMemberName: cesadMember.name,
      cesadMemberEmail: cesadMember.email,
      activeStageSequence: 1,
      initialStatus: ProcessStatus.EM_ANALISE_CESAD,
    });
    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          adminOtherActionReady.processId,
          authenticatedUser(admin.id, admin.role),
          { action: ProcessAction.ISSUE_CESAD_OPINION },
        ),
      /legitimate link to this process/,
    );

    const missingSupervisorEvaluationReady = await createProcess(
      context.prisma,
      ProcessStatus.PARECER_EMITIDO,
      evaluatedUser.id,
      supervisor.id,
    );
    const commissionMissing = await createActiveCesadCommission(context.prisma, [
      { userId: cesadMember.id, roleType: 'TITULAR' },
    ]);
    await createCesadStageAssignment(
      context.prisma,
      missingSupervisorEvaluationReady.id,
      missingSupervisorEvaluationReady.defaultStageId,
      commissionMissing.id,
      supervisor.id,
    );
    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          missingSupervisorEvaluationReady.id,
          authenticatedUser(cesadMember.id, cesadMember.role),
          { action: ProcessAction.COMPLETE_CURRENT_STAGE },
        ),
      /supervisor evaluation and self evaluation documents are fully signed/,
    );

    const missingCesadOpinionReady = await createProcess(
      context.prisma,
      ProcessStatus.PARECER_EMITIDO,
      evaluatedUser.id,
      supervisor.id,
    );
    const commissionForOpinion = await createActiveCesadCommission(context.prisma, [
      { userId: cesadMember.id, roleType: 'TITULAR' },
    ]);
    await createCesadStageAssignment(
      context.prisma,
      missingCesadOpinionReady.id,
      missingCesadOpinionReady.defaultStageId,
      commissionForOpinion.id,
      supervisor.id,
    );
    await createSignedRequiredStageDocuments(
      context.prisma,
      missingCesadOpinionReady.id,
      missingCesadOpinionReady.defaultStageId,
      supervisor.id,
      evaluatedUser.id,
    );
    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          missingCesadOpinionReady.id,
          authenticatedUser(cesadMember.id, cesadMember.role),
          { action: ProcessAction.COMPLETE_CURRENT_STAGE },
        ),
      /CESAD stage opinion is COMPLETED/,
    );

    const draftCesadOpinionReady = await createProcess(
      context.prisma,
      ProcessStatus.PARECER_EMITIDO,
      evaluatedUser.id,
      supervisor.id,
    );
    const commissionForDraft = await createActiveCesadCommission(context.prisma, [
      { userId: cesadMember.id, roleType: 'TITULAR' },
    ]);
    await createCesadStageAssignment(
      context.prisma,
      draftCesadOpinionReady.id,
      draftCesadOpinionReady.defaultStageId,
      commissionForDraft.id,
      supervisor.id,
    );
    await createSignedRequiredStageDocuments(
      context.prisma,
      draftCesadOpinionReady.id,
      draftCesadOpinionReady.defaultStageId,
      supervisor.id,
      evaluatedUser.id,
    );
    await context.prisma.cesadStageOpinion.create({
      data: {
        processId: draftCesadOpinionReady.id,
        processStageId: draftCesadOpinionReady.defaultStageId,
        authorUserId: cesadMember.id,
        status: 'DRAFT',
        reportText: 'Parecer ainda em rascunho.',
        conclusion: '',
      },
    });
    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          draftCesadOpinionReady.id,
          authenticatedUser(cesadMember.id, cesadMember.role),
          { action: ProcessAction.COMPLETE_CURRENT_STAGE },
        ),
      /CESAD stage opinion is COMPLETED/,
    );

    const missingExpectedSignersReady = await createProcess(
      context.prisma,
      ProcessStatus.PARECER_EMITIDO,
      evaluatedUser.id,
      supervisor.id,
    );
    const commissionForExpected = await createActiveCesadCommission(context.prisma, [
      { userId: cesadMember.id, roleType: 'TITULAR' },
    ]);
    await createCesadStageAssignment(
      context.prisma,
      missingExpectedSignersReady.id,
      missingExpectedSignersReady.defaultStageId,
      commissionForExpected.id,
      supervisor.id,
    );
    await createSignedRequiredStageDocuments(
      context.prisma,
      missingExpectedSignersReady.id,
      missingExpectedSignersReady.defaultStageId,
      supervisor.id,
      evaluatedUser.id,
    );
    await context.prisma.cesadStageOpinion.create({
      data: {
        processId: missingExpectedSignersReady.id,
        processStageId: missingExpectedSignersReady.defaultStageId,
        authorUserId: cesadMember.id,
        status: 'COMPLETED',
        reportText: 'Parecer concluido sem signatarios congelados.',
        conclusion: 'Conclusao.',
        completedAt: new Date('2026-04-21T10:00:00.000Z'),
      },
    });
    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          missingExpectedSignersReady.id,
          authenticatedUser(cesadMember.id, cesadMember.role),
          { action: ProcessAction.COMPLETE_CURRENT_STAGE },
        ),
      /expected signers have been frozen/,
    );

    const draftCesadOpinionDocumentReady = await buildReadyToCompleteStage(context, {
      supervisorUserId: supervisor.id,
      evaluatedUserId: evaluatedUser.id,
      cesadMemberUserId: cesadMember.id,
      cesadMemberName: cesadMember.name,
      cesadMemberEmail: cesadMember.email,
      activeStageSequence: 1,
    });
    await context.prisma.processDocument.update({
      where: { id: draftCesadOpinionDocumentReady.cesadOpinionDocumentId },
      data: { documentStatus: 'DRAFT' },
    });
    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          draftCesadOpinionDocumentReady.processId,
          authenticatedUser(cesadMember.id, cesadMember.role),
          { action: ProcessAction.COMPLETE_CURRENT_STAGE },
        ),
      /CESAD opinion document is fully signed/,
    );

    const pendingCesadSignatureReady = await buildReadyToCompleteStage(context, {
      supervisorUserId: supervisor.id,
      evaluatedUserId: evaluatedUser.id,
      cesadMemberUserId: cesadMember.id,
      cesadMemberName: cesadMember.name,
      cesadMemberEmail: cesadMember.email,
      activeStageSequence: 1,
    });
    await context.prisma.signatureRecord.updateMany({
      where: {
        processDocumentId: pendingCesadSignatureReady.cesadOpinionDocumentId,
      },
      data: { status: 'PENDING', signedAt: null },
    });
    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          pendingCesadSignatureReady.processId,
          authenticatedUser(cesadMember.id, cesadMember.role),
          { action: ProcessAction.COMPLETE_CURRENT_STAGE },
        ),
      /all expected CESAD signers have signed the document/,
    );

    const noActiveStageReady = await buildReadyToCompleteStage(context, {
      supervisorUserId: supervisor.id,
      evaluatedUserId: evaluatedUser.id,
      cesadMemberUserId: cesadMember.id,
      cesadMemberName: cesadMember.name,
      cesadMemberEmail: cesadMember.email,
      activeStageSequence: 1,
    });
    await context.prisma.processStage.update({
      where: { id: noActiveStageReady.activeStageId },
      data: { startedAt: null, endedAt: null },
    });
    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          noActiveStageReady.processId,
          authenticatedUser(cesadMember.id, cesadMember.role),
          { action: ProcessAction.COMPLETE_CURRENT_STAGE },
        ),
      /No active process stage/,
    );

    const multipleActiveStagesReady = await buildReadyToCompleteStage(context, {
      supervisorUserId: supervisor.id,
      evaluatedUserId: evaluatedUser.id,
      cesadMemberUserId: cesadMember.id,
      cesadMemberName: cesadMember.name,
      cesadMemberEmail: cesadMember.email,
      activeStageSequence: 1,
    });
    const nextStageToActivate = await context.prisma.processStage.findFirstOrThrow({
      where: {
        evaluationProcessId: multipleActiveStagesReady.processId,
        sequence: 2,
      },
    });
    await context.prisma.processStage.update({
      where: { id: nextStageToActivate.id },
      data: { startedAt: new Date('2026-03-15T00:00:00.000Z'), endedAt: null },
    });
    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          multipleActiveStagesReady.processId,
          authenticatedUser(cesadMember.id, cesadMember.role),
          { action: ProcessAction.COMPLETE_CURRENT_STAGE },
        ),
      /more than one active process stage/,
    );

    const issueOpinionRegressionContext = await buildReadyToCompleteStage(context, {
      supervisorUserId: supervisor.id,
      evaluatedUserId: evaluatedUser.id,
      cesadMemberUserId: cesadMember.id,
      cesadMemberName: cesadMember.name,
      cesadMemberEmail: cesadMember.email,
      activeStageSequence: 1,
    });
    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          issueOpinionRegressionContext.processId,
          authenticatedUser(cesadMember.id, cesadMember.role),
          { action: ProcessAction.ISSUE_CESAD_OPINION },
        ),
      /not allowed when process is in status PARECER_EMITIDO/,
    );
  } finally {
    await disposeTestContext(context);
  }
}
