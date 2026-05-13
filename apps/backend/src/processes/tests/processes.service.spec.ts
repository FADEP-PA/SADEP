import assert from 'node:assert/strict';

import {
  AuditEventType,
  CesadCommissionMemberRoleType,
  CesadStageOpinionExpectedSignerDerivationType,
  CesadStageOpinionSigningCapacity,
  ProcessAction,
  ProcessStatus,
  UserRole,
} from '@sadep/contracts';

import {
  authenticatedUser,
  createActiveCesadCommission,
  createCesadStageAssignment,
  createProcess,
  createSignedRequiredStageDocuments,
  createTestContext,
  createUser,
  disposeTestContext,
  workflowActions,
} from './test-helpers';

export async function runProcessesServiceTests() {
  const context = await createTestContext('workflow-service-test');

  try {
    const evaluatedUser = await createUser(context.prisma, UserRole.INTERN_SERVER, 'evaluated@test.local');
    const supervisor = await createUser(context.prisma, UserRole.IMMEDIATE_SUPERVISOR, 'supervisor@test.local');
    const otherSupervisor = await createUser(
      context.prisma,
      UserRole.IMMEDIATE_SUPERVISOR,
      'other-supervisor@test.local',
    );
    const cesad = await createUser(context.prisma, UserRole.CESAD_MEMBER, 'cesad@test.local');
    const assistant = await createUser(
      context.prisma,
      UserRole.COMMISSION_ASSISTANT,
      'assistant@test.local',
    );
    const unrelatedCesad = await createUser(
      context.prisma,
      UserRole.CESAD_MEMBER,
      'unrelated-cesad@test.local',
    );
    const unrelatedAssistant = await createUser(
      context.prisma,
      UserRole.COMMISSION_ASSISTANT,
      'unrelated-assistant@test.local',
    );
    const intern = await createUser(context.prisma, UserRole.INTERN_SERVER, 'intern@test.local');
    const admin = await createUser(context.prisma, UserRole.ADMIN, 'workflow-admin@test.local');
    const homologationAuthority = await createUser(
      context.prisma,
      UserRole.HOMOLOGATION_AUTHORITY,
      'workflow-authority@test.local',
    );
    const commission = await createActiveCesadCommission(context.prisma, [
      { userId: cesad.id, roleType: 'SUPLENTE' },
      { userId: assistant.id, roleType: 'SUPLENTE' },
    ]);

    const process = await createProcess(
      context.prisma,
      ProcessStatus.EM_AVALIACAO,
      evaluatedUser.id,
      supervisor.id,
    );

    await assert.rejects(
      () =>
        context.service.getWorkflow(
          process.id,
          authenticatedUser(supervisor.id, supervisor.role),
        ),
      /public workflow endpoint/,
    );

    const ownWorkflow = await context.service.getWorkflow(
      process.id,
      authenticatedUser(evaluatedUser.id, evaluatedUser.role),
    );
    assert.deepEqual(ownWorkflow.availableActions, []);

    await assert.rejects(
      () =>
        context.service.getWorkflow(
          process.id,
          authenticatedUser(otherSupervisor.id, otherSupervisor.role),
        ),
      /public workflow endpoint/,
    );

    await assert.rejects(
      () =>
        context.service.getWorkflow(
          process.id,
          authenticatedUser(cesad.id, cesad.role),
        ),
      /does not have an active link to this process/,
    );

    await assert.rejects(
      () =>
        context.service.getWorkflow(
          process.id,
          authenticatedUser(admin.id, admin.role),
        ),
      /legitimate link to this process/,
    );

    await context.prisma.auditEvent.create({
      data: {
        evaluationProcessId: process.id,
        actorUserId: supervisor.id,
        actorRole: 'IMMEDIATE_SUPERVISOR',
        eventType: 'SIGNATURE_REQUESTED',
        beforeState: { status: ProcessStatus.EM_AVALIACAO },
        afterState: { status: ProcessStatus.AGUARDANDO_ASSINATURA },
        metadata: {
          eventType: 'SIGNATURE_REQUESTED',
          action: ProcessAction.RELEASE_FOR_SERVER_SIGNATURE,
          performedByUserId: supervisor.id,
          performedByRole: supervisor.role,
          occurredAt: new Date('2026-04-17T12:00:00.000Z').toISOString(),
          processStatus: ProcessStatus.AGUARDANDO_ASSINATURA,
          processStageId: process.defaultStageId,
          stageSequence: 1,
          stageCode: 'ETAPA_1',
          comment: 'Liberação válida do workflow.',
        },
        occurredAt: new Date('2026-04-17T12:00:00.000Z'),
      },
    });

    const historyProcess = await createProcess(
      context.prisma,
      ProcessStatus.PARECER_EMITIDO,
      evaluatedUser.id,
      supervisor.id,
    );
    const cesadReadableProcess = await createProcess(
      context.prisma,
      ProcessStatus.EM_ANALISE_CESAD,
      evaluatedUser.id,
      supervisor.id,
    );
    await createCesadStageAssignment(
      context.prisma,
      historyProcess.id,
      historyProcess.defaultStageId,
      commission.id,
      supervisor.id,
    );
    await createCesadStageAssignment(
      context.prisma,
      cesadReadableProcess.id,
      cesadReadableProcess.defaultStageId,
      commission.id,
      supervisor.id,
    );

    await context.prisma.auditEvent.createMany({
      data: [
        {
          evaluationProcessId: historyProcess.id,
          actorUserId: supervisor.id,
          actorRole: 'IMMEDIATE_SUPERVISOR',
          eventType: AuditEventType.SIGNATURE_REQUESTED,
          beforeState: { status: ProcessStatus.EM_AVALIACAO },
          afterState: { status: ProcessStatus.AGUARDANDO_ASSINATURA },
          metadata: {
            eventType: AuditEventType.SIGNATURE_REQUESTED,
            action: ProcessAction.RELEASE_FOR_SERVER_SIGNATURE,
            performedByUserId: supervisor.id,
            performedByRole: supervisor.role,
            occurredAt: new Date('2026-04-18T10:00:00.000Z').toISOString(),
            processStatus: ProcessStatus.AGUARDANDO_ASSINATURA,
            processStageId: historyProcess.defaultStageId,
            stageSequence: 1,
            stageCode: 'ETAPA_1',
          },
          occurredAt: new Date('2026-04-18T10:00:00.000Z'),
        },
        {
          evaluationProcessId: historyProcess.id,
          actorUserId: supervisor.id,
          actorRole: 'IMMEDIATE_SUPERVISOR',
          eventType: AuditEventType.SIGNATURE_REQUESTED,
          beforeState: {},
          afterState: {},
          metadata: {
            eventType: AuditEventType.SIGNATURE_REQUESTED,
            action: ProcessAction.SIGN_EVALUATION,
            performedByUserId: supervisor.id,
            performedByRole: supervisor.role,
            occurredAt: new Date('2026-04-18T10:01:00.000Z').toISOString(),
            processStatus: ProcessStatus.AGUARDANDO_ASSINATURA,
            origin: 'PROCESS_DOCUMENT',
            processStageId: historyProcess.defaultStageId,
            stageSequence: 1,
            stageCode: 'ETAPA_1',
            documentId: 'document-supervisor-evaluation',
            signatoryRole: UserRole.INTERN_SERVER,
            signatoryUserId: evaluatedUser.id,
          },
          occurredAt: new Date('2026-04-18T10:01:00.000Z'),
        },
        {
          evaluationProcessId: historyProcess.id,
          actorUserId: evaluatedUser.id,
          actorRole: 'INTERN_SERVER',
          eventType: AuditEventType.SIGNATURE_REQUESTED,
          beforeState: {},
          afterState: {},
          metadata: {
            eventType: AuditEventType.SIGNATURE_REQUESTED,
            action: ProcessAction.SUBMIT_SELF_EVALUATION,
            performedByUserId: evaluatedUser.id,
            performedByRole: evaluatedUser.role,
            occurredAt: new Date('2026-04-18T10:02:00.000Z').toISOString(),
            processStatus: ProcessStatus.AGUARDANDO_ASSINATURA,
            origin: 'PROCESS_DOCUMENT',
            processStageId: historyProcess.defaultStageId,
            stageSequence: 1,
            stageCode: 'ETAPA_1',
            documentId: 'document-self-evaluation',
            signatoryRole: UserRole.IMMEDIATE_SUPERVISOR,
            signatoryUserId: supervisor.id,
          },
          occurredAt: new Date('2026-04-18T10:02:00.000Z'),
        },
        {
          evaluationProcessId: historyProcess.id,
          actorUserId: supervisor.id,
          actorRole: 'IMMEDIATE_SUPERVISOR',
          eventType: AuditEventType.SENT_TO_CESAD,
          beforeState: { status: ProcessStatus.AGUARDANDO_ASSINATURA },
          afterState: { status: ProcessStatus.EM_ANALISE_CESAD },
          metadata: {
            eventType: AuditEventType.SENT_TO_CESAD,
            action: ProcessAction.SEND_TO_CESAD,
            performedByUserId: supervisor.id,
            performedByRole: supervisor.role,
            occurredAt: new Date('2026-04-18T10:03:00.000Z').toISOString(),
            processStatus: ProcessStatus.EM_ANALISE_CESAD,
            processStageId: historyProcess.defaultStageId,
            stageSequence: 1,
            stageCode: 'ETAPA_1',
          },
          occurredAt: new Date('2026-04-18T10:03:00.000Z'),
        },
        {
          evaluationProcessId: historyProcess.id,
          actorUserId: cesad.id,
          actorRole: 'CESAD_MEMBER',
          eventType: AuditEventType.CESAD_OPINION_ISSUED,
          beforeState: { status: ProcessStatus.EM_ANALISE_CESAD },
          afterState: { status: ProcessStatus.PARECER_EMITIDO },
          metadata: {
            eventType: AuditEventType.CESAD_OPINION_ISSUED,
            action: ProcessAction.ISSUE_CESAD_OPINION,
            performedByUserId: cesad.id,
            performedByRole: cesad.role,
            occurredAt: new Date('2026-04-18T10:04:00.000Z').toISOString(),
            processStatus: ProcessStatus.PARECER_EMITIDO,
            processStageId: historyProcess.defaultStageId,
            stageSequence: 1,
            stageCode: 'ETAPA_1',
          },
          occurredAt: new Date('2026-04-18T10:04:00.000Z'),
        },
        {
          evaluationProcessId: historyProcess.id,
          actorUserId: cesad.id,
          actorRole: 'CESAD_MEMBER',
          eventType: AuditEventType.ADJUSTMENT_REQUESTED,
          beforeState: { status: ProcessStatus.EM_ANALISE_CESAD },
          afterState: { status: ProcessStatus.EM_AVALIACAO },
          metadata: {
            eventType: AuditEventType.ADJUSTMENT_REQUESTED,
            action: ProcessAction.REQUEST_ADJUSTMENT,
            performedByUserId: cesad.id,
            performedByRole: cesad.role,
            occurredAt: new Date('2026-04-18T10:05:00.000Z').toISOString(),
            processStatus: ProcessStatus.EM_AVALIACAO,
            processStageId: historyProcess.defaultStageId,
            stageSequence: 1,
            stageCode: 'ETAPA_1',
            comment: 'Solicitação pública de ajuste.',
          },
          occurredAt: new Date('2026-04-18T10:05:00.000Z'),
        },
      ],
    });

    const publicHistory = await context.service.getWorkflowHistory(
      historyProcess.id,
      authenticatedUser(evaluatedUser.id, evaluatedUser.role),
    );

    assert.deepEqual(
      publicHistory.map((item) => item.action),
      [
        ProcessAction.RELEASE_FOR_SERVER_SIGNATURE,
        ProcessAction.SEND_TO_CESAD,
        ProcessAction.ISSUE_CESAD_OPINION,
        ProcessAction.REQUEST_ADJUSTMENT,
      ],
    );
    assert.deepEqual(
      publicHistory.map((item) => item.eventType),
      [
        AuditEventType.SIGNATURE_REQUESTED,
        AuditEventType.SENT_TO_CESAD,
        AuditEventType.CESAD_OPINION_ISSUED,
        AuditEventType.ADJUSTMENT_REQUESTED,
      ],
    );
    assert(!publicHistory.some((item) => item.action === ProcessAction.SIGN_EVALUATION));
    assert(!publicHistory.some((item) => item.action === ProcessAction.SUBMIT_SELF_EVALUATION));

    const assistantWorkflow = await context.service.getWorkflow(
      cesadReadableProcess.id,
      authenticatedUser(assistant.id, assistant.role),
    );
    assert.deepEqual(assistantWorkflow.availableActions, []);

    await assert.rejects(
      () =>
        context.service.getWorkflow(
          cesadReadableProcess.id,
          authenticatedUser(unrelatedCesad.id, unrelatedCesad.role),
        ),
      /CESAD contextual authorization denied/,
    );

    const assistantHistory = await context.service.getWorkflowHistory(
      historyProcess.id,
      authenticatedUser(assistant.id, assistant.role),
    );
    assert.deepEqual(
      assistantHistory.map((item) => item.action),
      [
        ProcessAction.RELEASE_FOR_SERVER_SIGNATURE,
        ProcessAction.SEND_TO_CESAD,
        ProcessAction.ISSUE_CESAD_OPINION,
        ProcessAction.REQUEST_ADJUSTMENT,
      ],
    );

    await assert.rejects(
      () =>
        context.service.getWorkflowHistory(
          historyProcess.id,
          authenticatedUser(unrelatedAssistant.id, unrelatedAssistant.role),
        ),
      /CESAD contextual authorization denied/,
    );

    await assert.rejects(
      () =>
        context.service.getWorkflowHistory(
          process.id,
          authenticatedUser(supervisor.id, supervisor.role),
        ),
      /public workflow endpoint/,
    );

    await assert.rejects(
      () =>
        context.service.getWorkflowHistory(
          process.id,
          authenticatedUser(otherSupervisor.id, otherSupervisor.role),
        ),
      /public workflow endpoint/,
    );

    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          cesadReadableProcess.id,
          authenticatedUser(assistant.id, assistant.role),
          { action: workflowActions.issueOpinion },
        ),
      /Role COMMISSION_ASSISTANT cannot execute action ISSUE_CESAD_OPINION/,
    );

    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          cesadReadableProcess.id,
          authenticatedUser(unrelatedCesad.id, unrelatedCesad.role),
          { action: workflowActions.issueOpinion },
        ),
      /CESAD contextual authorization denied/,
    );

    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          cesadReadableProcess.id,
          authenticatedUser(unrelatedCesad.id, unrelatedCesad.role),
          { action: workflowActions.requestAdjustment, comment: 'Solicitar ajuste.' },
        ),
      /CESAD contextual authorization denied/,
    );

    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          process.id,
          authenticatedUser(cesad.id, cesad.role),
          { action: workflowActions.issueOpinion },
        ),
      /does not have an active link to this process/,
    );

    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          process.id,
          authenticatedUser(supervisor.id, supervisor.role),
          { action: workflowActions.releaseForSignature },
        ),
      /public workflow endpoint/,
    );

    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          process.id,
          authenticatedUser(evaluatedUser.id, evaluatedUser.role),
          { action: workflowActions.releaseForSignature },
        ),
      /cannot execute action RELEASE_FOR_SERVER_SIGNATURE/,
    );

    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          process.id,
          authenticatedUser(intern.id, intern.role),
          { action: workflowActions.releaseForSignature },
        ),
      /evaluated server for this process/,
    );

    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          process.id,
          authenticatedUser(otherSupervisor.id, otherSupervisor.role),
          { action: workflowActions.releaseForSignature },
        ),
      /public workflow endpoint/,
    );

    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          process.id,
          authenticatedUser(supervisor.id, supervisor.role),
          { action: workflowActions.sendToCesad },
        ),
      /public workflow endpoint/,
    );

    const events = await context.prisma.auditEvent.findMany({
      where: { evaluationProcessId: process.id },
      orderBy: { occurredAt: 'asc' },
    });

    assert.equal(events.length, 1);
    assert.equal(events[0]?.eventType, 'SIGNATURE_REQUESTED');

    const awaitingSignatureProcess = await createProcess(
      context.prisma,
      ProcessStatus.AGUARDANDO_ASSINATURA,
      evaluatedUser.id,
      supervisor.id,
    );
    await context.prisma.supervisorEvaluation.create({
      data: {
        processId: awaitingSignatureProcess.id,
        processStageId: awaitingSignatureProcess.defaultStageId,
        evaluatorUserId: supervisor.id,
        status: 'SUBMITTED',
        summary: 'Chefia vinculada para envio à CESAD.',
        generalComments: 'Processo pronto para validação de documentos.',
        content: { criteria: [{ code: 'RESP', label: 'Responsabilidade', rating: 5 }] },
        submittedAt: new Date(),
      },
    });

    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          awaitingSignatureProcess.id,
          authenticatedUser(supervisor.id, supervisor.role),
          { action: workflowActions.sendToCesad },
        ),
      /public workflow endpoint/,
    );

    const sendToCesadProcess = await createProcess(
      context.prisma,
      ProcessStatus.AGUARDANDO_ASSINATURA,
      evaluatedUser.id,
      supervisor.id,
    );
    await createSignedRequiredStageDocuments(
      context.prisma,
      sendToCesadProcess.id,
      sendToCesadProcess.defaultStageId,
      supervisor.id,
      evaluatedUser.id,
    );
    const sendToCesadWorkflow = await context.service.transitionWorkflowAsResponsibleSupervisorInTransaction(
      context.prisma,
      sendToCesadProcess.id,
      authenticatedUser(supervisor.id, supervisor.role),
      { action: workflowActions.sendToCesad },
    );
    assert.equal(sendToCesadWorkflow, ProcessStatus.EM_ANALISE_CESAD);
    const createdAssignment = await context.prisma.cesadStageAssignment.findFirstOrThrow({
      where: {
        processId: sendToCesadProcess.id,
        processStageId: sendToCesadProcess.defaultStageId,
        status: 'ACTIVE',
      },
    });
    assert.equal(createdAssignment.commissionId, commission.id);
    assert.equal(createdAssignment.assignedByUserId, supervisor.id);
    assert.ok(createdAssignment.assignedAt);
    assert.ok(createdAssignment.referenceDate);

    const duplicateAssignmentProcess = await createProcess(
      context.prisma,
      ProcessStatus.AGUARDANDO_ASSINATURA,
      evaluatedUser.id,
      supervisor.id,
    );
    await createSignedRequiredStageDocuments(
      context.prisma,
      duplicateAssignmentProcess.id,
      duplicateAssignmentProcess.defaultStageId,
      supervisor.id,
      evaluatedUser.id,
    );
    await createCesadStageAssignment(
      context.prisma,
      duplicateAssignmentProcess.id,
      duplicateAssignmentProcess.defaultStageId,
      commission.id,
      supervisor.id,
    );
    await context.service.transitionWorkflowAsResponsibleSupervisorInTransaction(
      context.prisma,
      duplicateAssignmentProcess.id,
      authenticatedUser(supervisor.id, supervisor.role),
      { action: workflowActions.sendToCesad },
    );
    assert.equal(
      await context.prisma.cesadStageAssignment.count({
        where: {
          processStageId: duplicateAssignmentProcess.defaultStageId,
          status: 'ACTIVE',
        },
      }),
      1,
    );

    const cesadProcess = await createProcess(
      context.prisma,
      ProcessStatus.EM_ANALISE_CESAD,
      evaluatedUser.id,
    );
    await createCesadStageAssignment(
      context.prisma,
      cesadProcess.id,
      cesadProcess.defaultStageId,
      commission.id,
      supervisor.id,
    );

    const cesadWorkflow = await context.service.getWorkflow(
      cesadProcess.id,
      authenticatedUser(cesad.id, cesad.role),
    );
    assert.deepEqual(cesadWorkflow.availableActions, [
      ProcessAction.ISSUE_CESAD_OPINION,
      ProcessAction.REQUEST_ADJUSTMENT,
    ]);

    const reassignmentNewCesad = await createUser(
      context.prisma,
      UserRole.CESAD_MEMBER,
      'reassignment-new-cesad@test.local',
    );
    const reassignmentOldCommission = await createActiveCesadCommission(context.prisma, [
      { userId: cesad.id, roleType: 'TITULAR' },
    ], {
      name: 'Comissão CESAD antiga para reatribuição',
    });
    const reassignmentNewCommission = await createActiveCesadCommission(context.prisma, [
      { userId: reassignmentNewCesad.id, roleType: 'TITULAR' },
    ], {
      name: 'Comissão CESAD nova para reatribuição',
    });
    const reassignmentProcess = await createProcess(
      context.prisma,
      ProcessStatus.EM_ANALISE_CESAD,
      evaluatedUser.id,
      supervisor.id,
    );
    const reassignmentPreviousAssignment = await createCesadStageAssignment(
      context.prisma,
      reassignmentProcess.id,
      reassignmentProcess.defaultStageId,
      reassignmentOldCommission.id,
      supervisor.id,
    );

    const supersession = await context.service.supersedeCesadStageAssignment(
      reassignmentProcess.id,
      1,
      authenticatedUser(admin.id, admin.role),
      {
        newCommissionId: reassignmentNewCommission.id,
        reason: 'Portaria formal substituiu a comissão responsável pela etapa.',
        referenceDate: new Date('2026-02-01T12:00:00.000Z'),
        formalActReference: 'Portaria 123/2026',
      },
    );

    assert.equal(supersession.processId, reassignmentProcess.id);
    assert.equal(supersession.processStageId, reassignmentProcess.defaultStageId);
    assert.equal(supersession.previousAssignmentId, reassignmentPreviousAssignment.id);
    assert.equal(supersession.previousCommissionId, reassignmentOldCommission.id);
    assert.equal(supersession.newCommissionId, reassignmentNewCommission.id);
    assert.equal(supersession.reason, 'Portaria formal substituiu a comissão responsável pela etapa.');
    assert.equal(supersession.referenceDate, '2026-02-01T12:00:00.000Z');
    assert.equal(supersession.formalActReference, 'Portaria 123/2026');

    const supersededPreviousAssignment = await context.prisma.cesadStageAssignment.findUniqueOrThrow({
      where: { id: reassignmentPreviousAssignment.id },
    });
    assert.equal(supersededPreviousAssignment.status, 'SUPERSEDED');
    assert.equal(supersededPreviousAssignment.supersededByAssignmentId, supersession.newAssignmentId);
    assert.equal(
      supersededPreviousAssignment.supersededReason,
      'Portaria formal substituiu a comissão responsável pela etapa.',
    );
    assert.notEqual(supersededPreviousAssignment.supersededAt, null);

    const activeReassignmentAssignments = await context.prisma.cesadStageAssignment.findMany({
      where: {
        processStageId: reassignmentProcess.defaultStageId,
        status: 'ACTIVE',
      },
    });
    assert.equal(activeReassignmentAssignments.length, 1);
    assert.equal(activeReassignmentAssignments[0]?.id, supersession.newAssignmentId);
    assert.equal(activeReassignmentAssignments[0]?.assignedByUserId, admin.id);
    assert.equal(activeReassignmentAssignments[0]?.assignmentReason, supersession.reason);

    const supersessionAudit = await context.prisma.auditEvent.findFirstOrThrow({
      where: {
        evaluationProcessId: reassignmentProcess.id,
        eventType: AuditEventType.CESAD_STAGE_ASSIGNMENT_SUPERSEDED,
      },
    });
    const supersessionMetadata = supersessionAudit.metadata as {
      action?: string;
      previousAssignmentId?: string;
      newAssignmentId?: string;
      previousCommissionId?: string;
      newCommissionId?: string;
      performedByUserId?: string;
      performedByRole?: string;
      reason?: string;
      referenceDate?: string;
      formalActReference?: string;
    };
    assert.equal(supersessionMetadata.action, ProcessAction.SUPERSEDE_CESAD_STAGE_ASSIGNMENT);
    assert.equal(supersessionMetadata.previousAssignmentId, reassignmentPreviousAssignment.id);
    assert.equal(supersessionMetadata.newAssignmentId, supersession.newAssignmentId);
    assert.equal(supersessionMetadata.previousCommissionId, reassignmentOldCommission.id);
    assert.equal(supersessionMetadata.newCommissionId, reassignmentNewCommission.id);
    assert.equal(supersessionMetadata.performedByUserId, admin.id);
    assert.equal(supersessionMetadata.performedByRole, UserRole.ADMIN);
    assert.equal(supersessionMetadata.reason, supersession.reason);
    assert.equal(supersessionMetadata.referenceDate, '2026-02-01T12:00:00.000Z');
    assert.equal(supersessionMetadata.formalActReference, 'Portaria 123/2026');

    await assert.rejects(
      () =>
        context.cesadStageReadService.getStageReadSnapshot(
          reassignmentProcess.id,
          1,
          authenticatedUser(cesad.id, cesad.role),
        ),
      /CESAD contextual authorization denied/,
    );
    const reassignedSnapshot = await context.cesadStageReadService.getStageReadSnapshot(
      reassignmentProcess.id,
      1,
      authenticatedUser(reassignmentNewCesad.id, reassignmentNewCesad.role),
    );
    assert.equal(reassignedSnapshot.process.id, reassignmentProcess.id);

    const authorityOldCommission = await createActiveCesadCommission(context.prisma);
    const authorityNewCommission = await createActiveCesadCommission(context.prisma);
    const authorityReassignmentProcess = await createProcess(
      context.prisma,
      ProcessStatus.EM_ANALISE_CESAD,
      evaluatedUser.id,
      supervisor.id,
    );
    const authorityPreviousAssignment = await createCesadStageAssignment(
      context.prisma,
      authorityReassignmentProcess.id,
      authorityReassignmentProcess.defaultStageId,
      authorityOldCommission.id,
      supervisor.id,
    );
    const authoritySupersession = await context.service.supersedeCesadStageAssignment(
      authorityReassignmentProcess.id,
      1,
      authenticatedUser(homologationAuthority.id, homologationAuthority.role),
      {
        newCommissionId: authorityNewCommission.id,
        reason: 'Autoridade homologadora formalizou a reatribuição.',
      },
    );
    assert.equal(authoritySupersession.previousAssignmentId, authorityPreviousAssignment.id);
    assert.equal(authoritySupersession.newCommissionId, authorityNewCommission.id);

    const forbiddenSupersessionProcess = await createProcess(
      context.prisma,
      ProcessStatus.EM_ANALISE_CESAD,
      evaluatedUser.id,
      supervisor.id,
    );
    const forbiddenOldCommission = await createActiveCesadCommission(context.prisma);
    const forbiddenNewCommission = await createActiveCesadCommission(context.prisma);
    await createCesadStageAssignment(
      context.prisma,
      forbiddenSupersessionProcess.id,
      forbiddenSupersessionProcess.defaultStageId,
      forbiddenOldCommission.id,
      supervisor.id,
    );

    await assert.rejects(
      () =>
        context.service.supersedeCesadStageAssignment(
          forbiddenSupersessionProcess.id,
          1,
          authenticatedUser(cesad.id, cesad.role),
          { newCommissionId: forbiddenNewCommission.id, reason: 'Tentativa indevida.' },
        ),
      /Role CESAD_MEMBER cannot supersede CESAD stage assignment/,
    );
    await assert.rejects(
      () =>
        context.service.supersedeCesadStageAssignment(
          forbiddenSupersessionProcess.id,
          1,
          authenticatedUser(assistant.id, assistant.role),
          { newCommissionId: forbiddenNewCommission.id, reason: 'Tentativa indevida.' },
        ),
      /Role COMMISSION_ASSISTANT cannot supersede CESAD stage assignment/,
    );
    await assert.rejects(
      () =>
        context.service.supersedeCesadStageAssignment(
          forbiddenSupersessionProcess.id,
          1,
          authenticatedUser(supervisor.id, supervisor.role),
          { newCommissionId: forbiddenNewCommission.id, reason: 'Tentativa indevida.' },
        ),
      /Role IMMEDIATE_SUPERVISOR cannot supersede CESAD stage assignment/,
    );
    await assert.rejects(
      () =>
        context.service.supersedeCesadStageAssignment(
          forbiddenSupersessionProcess.id,
          1,
          authenticatedUser(evaluatedUser.id, evaluatedUser.role),
          { newCommissionId: forbiddenNewCommission.id, reason: 'Tentativa indevida.' },
        ),
      /Role INTERN_SERVER cannot supersede CESAD stage assignment/,
    );

    const statusBlockedProcess = await createProcess(
      context.prisma,
      ProcessStatus.EM_AVALIACAO,
      evaluatedUser.id,
      supervisor.id,
    );
    await createCesadStageAssignment(
      context.prisma,
      statusBlockedProcess.id,
      statusBlockedProcess.defaultStageId,
      forbiddenOldCommission.id,
      supervisor.id,
    );
    await assert.rejects(
      () =>
        context.service.supersedeCesadStageAssignment(
          statusBlockedProcess.id,
          1,
          authenticatedUser(admin.id, admin.role),
          { newCommissionId: forbiddenNewCommission.id, reason: 'Processo fora da análise CESAD.' },
        ),
      /only be superseded while process is in EM_ANALISE_CESAD status/,
    );

    const unassignedSupersessionProcess = await createProcess(
      context.prisma,
      ProcessStatus.EM_ANALISE_CESAD,
      evaluatedUser.id,
      supervisor.id,
    );
    await assert.rejects(
      () =>
        context.service.supersedeCesadStageAssignment(
          unassignedSupersessionProcess.id,
          1,
          authenticatedUser(admin.id, admin.role),
          { newCommissionId: forbiddenNewCommission.id, reason: 'Sem assignment ativa.' },
        ),
      /no active assignment/,
    );

    const multipleAssignmentsProcess = await createProcess(
      context.prisma,
      ProcessStatus.EM_ANALISE_CESAD,
      evaluatedUser.id,
      supervisor.id,
    );
    await createCesadStageAssignment(
      context.prisma,
      multipleAssignmentsProcess.id,
      multipleAssignmentsProcess.defaultStageId,
      forbiddenOldCommission.id,
      supervisor.id,
    );
    await createCesadStageAssignment(
      context.prisma,
      multipleAssignmentsProcess.id,
      multipleAssignmentsProcess.defaultStageId,
      forbiddenNewCommission.id,
      supervisor.id,
    );
    await assert.rejects(
      () =>
        context.service.supersedeCesadStageAssignment(
          multipleAssignmentsProcess.id,
          1,
          authenticatedUser(admin.id, admin.role),
          { newCommissionId: reassignmentNewCommission.id, reason: 'Múltiplas assignments.' },
        ),
      /more than one active assignment/,
    );

    const missingCommissionProcess = await createProcess(
      context.prisma,
      ProcessStatus.EM_ANALISE_CESAD,
      evaluatedUser.id,
      supervisor.id,
    );
    await createCesadStageAssignment(
      context.prisma,
      missingCommissionProcess.id,
      missingCommissionProcess.defaultStageId,
      forbiddenOldCommission.id,
      supervisor.id,
    );
    await assert.rejects(
      () =>
        context.service.supersedeCesadStageAssignment(
          missingCommissionProcess.id,
          1,
          authenticatedUser(admin.id, admin.role),
          { newCommissionId: 'missing-commission-id', reason: 'Comissão inexistente.' },
        ),
      /New CESAD commission was not found/,
    );

    const inactiveTargetCommission = await createActiveCesadCommission(context.prisma, [], {
      status: 'INACTIVE',
    });
    const supersededTargetCommission = await createActiveCesadCommission(context.prisma, [], {
      status: 'SUPERSEDED',
    });
    const inactiveTargetProcess = await createProcess(
      context.prisma,
      ProcessStatus.EM_ANALISE_CESAD,
      evaluatedUser.id,
      supervisor.id,
    );
    await createCesadStageAssignment(
      context.prisma,
      inactiveTargetProcess.id,
      inactiveTargetProcess.defaultStageId,
      forbiddenOldCommission.id,
      supervisor.id,
    );
    await assert.rejects(
      () =>
        context.service.supersedeCesadStageAssignment(
          inactiveTargetProcess.id,
          1,
          authenticatedUser(admin.id, admin.role),
          { newCommissionId: inactiveTargetCommission.id, reason: 'Comissão inativa.' },
        ),
      /commission that is not ACTIVE/,
    );
    await assert.rejects(
      () =>
        context.service.supersedeCesadStageAssignment(
          inactiveTargetProcess.id,
          1,
          authenticatedUser(admin.id, admin.role),
          { newCommissionId: supersededTargetCommission.id, reason: 'Comissão superada.' },
        ),
      /commission that is not ACTIVE/,
    );

    const outOfWindowCommission = await createActiveCesadCommission(context.prisma, [], {
      effectiveStartDate: new Date('2027-01-01T00:00:00.000Z'),
    });
    await assert.rejects(
      () =>
        context.service.supersedeCesadStageAssignment(
          inactiveTargetProcess.id,
          1,
          authenticatedUser(admin.id, admin.role),
          {
            newCommissionId: outOfWindowCommission.id,
            reason: 'Comissão fora da vigência.',
            referenceDate: new Date('2026-01-01T00:00:00.000Z'),
          },
        ),
      /outside the reference date validity window/,
    );

    await assert.rejects(
      () =>
        context.service.supersedeCesadStageAssignment(
          inactiveTargetProcess.id,
          1,
          authenticatedUser(admin.id, admin.role),
          { newCommissionId: forbiddenOldCommission.id, reason: 'Mesma comissão.' },
        ),
      /same CESAD commission/,
    );

    const opinionBlockedProcess = await createProcess(
      context.prisma,
      ProcessStatus.EM_ANALISE_CESAD,
      evaluatedUser.id,
      supervisor.id,
    );
    await createCesadStageAssignment(
      context.prisma,
      opinionBlockedProcess.id,
      opinionBlockedProcess.defaultStageId,
      forbiddenOldCommission.id,
      supervisor.id,
    );
    await context.prisma.cesadStageOpinion.create({
      data: {
        processId: opinionBlockedProcess.id,
        processStageId: opinionBlockedProcess.defaultStageId,
        authorUserId: cesad.id,
        status: 'DRAFT',
        reportText: 'Rascunho já existente.',
        conclusion: '',
      },
    });
    await assert.rejects(
      () =>
        context.service.supersedeCesadStageAssignment(
          opinionBlockedProcess.id,
          1,
          authenticatedUser(admin.id, admin.role),
          { newCommissionId: forbiddenNewCommission.id, reason: 'Parecer já existe.' },
        ),
      /CESAD stage opinion exists/,
    );

    const signerBlockedProcess = await createProcess(
      context.prisma,
      ProcessStatus.EM_ANALISE_CESAD,
      evaluatedUser.id,
      supervisor.id,
    );
    const signerMember = await context.prisma.cesadCommissionMember.create({
      data: {
        commissionId: forbiddenOldCommission.id,
        userId: cesad.id,
        roleType: 'TITULAR',
        startDate: new Date('2020-01-01T00:00:00.000Z'),
      },
    });
    await createCesadStageAssignment(
      context.prisma,
      signerBlockedProcess.id,
      signerBlockedProcess.defaultStageId,
      forbiddenOldCommission.id,
      supervisor.id,
    );
    const signerBlockedOpinion = await context.prisma.cesadStageOpinion.create({
      data: {
        processId: signerBlockedProcess.id,
        processStageId: signerBlockedProcess.defaultStageId,
        authorUserId: cesad.id,
        status: 'COMPLETED',
        reportText: 'Parecer com signatários congelados.',
        conclusion: 'Conclusão.',
        completedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    });
    await context.prisma.cesadStageOpinionExpectedSigner.create({
      data: {
        cesadStageOpinionId: signerBlockedOpinion.id,
        commissionId: forbiddenOldCommission.id,
        actingCommissionMemberId: signerMember.id,
        actingUserId: cesad.id,
        derivationType: 'ACTIVE_TITULAR',
        signingCapacity: 'EFFECTIVE_MEMBER',
        nameSnapshot: cesad.name,
        emailSnapshot: cesad.email,
        roleTypeSnapshot: 'TITULAR',
        sortOrder: 1,
        frozenAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    });
    await assert.rejects(
      () =>
        context.service.supersedeCesadStageAssignment(
          signerBlockedProcess.id,
          1,
          authenticatedUser(admin.id, admin.role),
          { newCommissionId: forbiddenNewCommission.id, reason: 'Signatários congelados.' },
        ),
      /expected signers have been frozen/,
    );

    const documentBlockedProcess = await createProcess(
      context.prisma,
      ProcessStatus.EM_ANALISE_CESAD,
      evaluatedUser.id,
      supervisor.id,
    );
    await createCesadStageAssignment(
      context.prisma,
      documentBlockedProcess.id,
      documentBlockedProcess.defaultStageId,
      forbiddenOldCommission.id,
      supervisor.id,
    );
    await context.prisma.processDocument.create({
      data: {
        evaluationProcessId: documentBlockedProcess.id,
        processStageId: documentBlockedProcess.defaultStageId,
        documentType: 'CESAD_OPINION',
        documentStatus: 'DRAFT',
      },
    });
    await assert.rejects(
      () =>
        context.service.supersedeCesadStageAssignment(
          documentBlockedProcess.id,
          1,
          authenticatedUser(admin.id, admin.role),
          { newCommissionId: forbiddenNewCommission.id, reason: 'Documento já existe.' },
        ),
      /CESAD opinion document exists/,
    );

    const titularOne = await createUser(
      context.prisma,
      UserRole.CESAD_MEMBER,
      'expected-signer-titular-one@test.local',
      'Titular Um',
    );
    const titularTwo = await createUser(
      context.prisma,
      UserRole.CESAD_MEMBER,
      'expected-signer-titular-two@test.local',
      'Titular Dois',
    );
    const suplente = await createUser(
      context.prisma,
      UserRole.CESAD_MEMBER,
      'expected-signer-suplente@test.local',
      'Suplente Fora do Snapshot',
    );
    const titularOneMember = await context.prisma.cesadCommissionMember.create({
      data: {
        commissionId: commission.id,
        userId: titularOne.id,
        roleType: 'TITULAR',
        startDate: new Date('2020-01-01T00:00:00.000Z'),
      },
    });
    const titularTwoMember = await context.prisma.cesadCommissionMember.create({
      data: {
        commissionId: commission.id,
        userId: titularTwo.id,
        roleType: 'TITULAR',
        startDate: new Date('2020-01-02T00:00:00.000Z'),
      },
    });
    await context.prisma.cesadCommissionMember.create({
      data: {
        commissionId: commission.id,
        userId: suplente.id,
        roleType: 'SUPLENTE',
        startDate: new Date('2020-01-03T00:00:00.000Z'),
      },
    });
    await context.prisma.cesadCommissionMember.create({
      data: {
        commissionId: commission.id,
        userId: assistant.id,
        roleType: 'TITULAR',
        startDate: new Date('2020-01-04T00:00:00.000Z'),
      },
    });

    const cesadStageOpinion = await context.prisma.cesadStageOpinion.create({
      data: {
        processId: cesadProcess.id,
        processStageId: cesadProcess.defaultStageId,
        authorUserId: cesad.id,
        status: 'COMPLETED',
        reportText: 'Relatório final para congelamento de signatários esperados.',
        legalBasis: 'Base legal do parecer.',
        conclusion: 'Conclusão final do parecer.',
        stageConcept: 'Satisfatório',
        stageResult: 'Favorável',
        completedAt: new Date('2026-04-24T12:00:00.000Z'),
      },
    });

    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          cesadProcess.id,
          authenticatedUser(cesad.id, cesad.role),
          { action: workflowActions.issueOpinion },
        ),
      /signed CESAD opinion document/,
    );

    const preparedCesadSignatures =
      await context.processDocumentsService.prepareCesadOpinionSignatures(
        cesadProcess.id,
        1,
        authenticatedUser(cesad.id, cesad.role),
      );
    assert.equal(preparedCesadSignatures.document?.documentStatus, 'READY_FOR_SIGNATURE');
    assert.equal(preparedCesadSignatures.expectedSigners.length, 2);
    assert(
      preparedCesadSignatures.expectedSigners.every(
        (signer) => signer.signatureStatus === 'PENDING',
      ),
    );
    await context.processDocumentsService.prepareCesadOpinionSignatures(
      cesadProcess.id,
      1,
      authenticatedUser(cesad.id, cesad.role),
    );
    const preparedCesadDocument = await context.prisma.processDocument.findFirstOrThrow({
      where: {
        evaluationProcessId: cesadProcess.id,
        processStageId: cesadProcess.defaultStageId,
        documentType: 'CESAD_OPINION',
      },
      include: {
        signatureRecords: true,
      },
    });
    assert.equal(preparedCesadDocument.processStageId, cesadProcess.defaultStageId);
    assert.equal(preparedCesadDocument.documentStatus, 'READY_FOR_SIGNATURE');
    assert.equal(preparedCesadDocument.signatureRecords.length, 2);
    assert(
      preparedCesadDocument.signatureRecords.every(
        (signature) => signature.signatoryRole === 'CESAD_MEMBER',
      ),
    );

    await assert.rejects(
      () =>
        context.processDocumentsService.signCesadOpinionDocument(
          cesadProcess.id,
          1,
          authenticatedUser(cesad.id, cesad.role),
        ),
      /not an expected signer/,
    );
    await assert.rejects(
      () =>
        context.processDocumentsService.signCesadOpinionDocument(
          cesadProcess.id,
          1,
          authenticatedUser(assistant.id, assistant.role),
        ),
      /Only an expected CESAD_MEMBER/,
    );
    await assert.rejects(
      () =>
        context.processDocumentsService.signCesadOpinionDocument(
          cesadProcess.id,
          1,
          authenticatedUser(admin.id, admin.role),
        ),
      /Only an expected CESAD_MEMBER/,
    );

    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          cesadProcess.id,
          authenticatedUser(cesad.id, cesad.role),
          { action: workflowActions.issueOpinion },
        ),
      /document is fully signed/,
    );

    const partiallySignedCesadOpinion =
      await context.processDocumentsService.signCesadOpinionDocument(
        cesadProcess.id,
        1,
        authenticatedUser(titularOne.id, titularOne.role),
      );
    assert.equal(partiallySignedCesadOpinion.document?.documentStatus, 'READY_FOR_SIGNATURE');
    assert.equal(partiallySignedCesadOpinion.allExpectedSignersSigned, false);

    const fullySignedCesadOpinion =
      await context.processDocumentsService.signCesadOpinionDocument(
        cesadProcess.id,
        1,
        authenticatedUser(titularTwo.id, titularTwo.role),
      );
    assert.equal(fullySignedCesadOpinion.document?.documentStatus, 'SIGNED');
    assert.equal(fullySignedCesadOpinion.allExpectedSignersSigned, true);
    await assert.rejects(
      () =>
        context.processDocumentsService.signCesadOpinionDocument(
          cesadProcess.id,
          1,
          authenticatedUser(titularOne.id, titularOne.role),
        ),
      /not ready for signature|already been completed/,
    );

    const issuedWorkflow = await context.service.transitionWorkflow(
      cesadProcess.id,
      authenticatedUser(cesad.id, cesad.role),
      { action: workflowActions.issueOpinion },
    );
    assert.equal(issuedWorkflow.status, ProcessStatus.PARECER_EMITIDO);

    const expectedSigners = await context.prisma.cesadStageOpinionExpectedSigner.findMany({
      where: { cesadStageOpinionId: cesadStageOpinion.id },
      orderBy: { sortOrder: 'asc' },
    });
    assert.equal(expectedSigners.length, 2);
    assert.deepEqual(
      expectedSigners.map((signer) => signer.actingUserId),
      [titularOne.id, titularTwo.id],
    );
    assert(!expectedSigners.some((signer) => signer.actingUserId === suplente.id));
    assert(!expectedSigners.some((signer) => signer.actingUserId === assistant.id));
    assert.equal(expectedSigners[0]?.cesadStageOpinionId, cesadStageOpinion.id);
    assert.equal(expectedSigners[0]?.commissionId, commission.id);
    assert.equal(expectedSigners[0]?.actingCommissionMemberId, titularOneMember.id);
    assert.equal(expectedSigners[0]?.derivationType, CesadStageOpinionExpectedSignerDerivationType.ACTIVE_TITULAR);
    assert.equal(expectedSigners[0]?.signingCapacity, CesadStageOpinionSigningCapacity.EFFECTIVE_MEMBER);
    assert.equal(expectedSigners[0]?.substitutedCommissionMemberId, null);
    assert.equal(expectedSigners[0]?.nameSnapshot, 'Titular Um');
    assert.equal(expectedSigners[0]?.emailSnapshot, titularOne.email);
    assert.equal(expectedSigners[0]?.roleTypeSnapshot, CesadCommissionMemberRoleType.TITULAR);
    assert.equal(expectedSigners[1]?.actingCommissionMemberId, titularTwoMember.id);
    assert.equal(expectedSigners[1]?.nameSnapshot, 'Titular Dois');

    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          cesadProcess.id,
          authenticatedUser(cesad.id, cesad.role),
          { action: workflowActions.issueOpinion },
        ),
      /Action ISSUE_CESAD_OPINION is not allowed when process is in status PARECER_EMITIDO/,
    );
    assert.equal(
      await context.prisma.cesadStageOpinionExpectedSigner.count({
        where: { cesadStageOpinionId: cesadStageOpinion.id },
      }),
      2,
    );

    const adjustmentProcess = await createProcess(
      context.prisma,
      ProcessStatus.EM_ANALISE_CESAD,
      evaluatedUser.id,
      supervisor.id,
    );
    await createCesadStageAssignment(
      context.prisma,
      adjustmentProcess.id,
      adjustmentProcess.defaultStageId,
      commission.id,
      supervisor.id,
    );
    const adjustmentWorkflow = await context.service.transitionWorkflow(
      adjustmentProcess.id,
      authenticatedUser(cesad.id, cesad.role),
      { action: workflowActions.requestAdjustment, comment: 'Solicitar ajuste pela comissão atribuída.' },
    );
    assert.equal(adjustmentWorkflow.status, ProcessStatus.EM_AVALIACAO);

    const unassignedOpinionProcess = await createProcess(
      context.prisma,
      ProcessStatus.EM_ANALISE_CESAD,
      evaluatedUser.id,
      supervisor.id,
    );
    await context.prisma.cesadStageOpinion.create({
      data: {
        processId: unassignedOpinionProcess.id,
        processStageId: unassignedOpinionProcess.defaultStageId,
        authorUserId: cesad.id,
        status: 'COMPLETED',
        reportText: 'Relatório final sem assignment ativa.',
        conclusion: 'Conclusão final sem assignment ativa.',
        completedAt: new Date('2026-04-24T12:15:00.000Z'),
      },
    });
    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          unassignedOpinionProcess.id,
          authenticatedUser(cesad.id, cesad.role),
          { action: workflowActions.issueOpinion },
        ),
      /CESAD contextual authorization denied/,
    );

    await context.prisma.user.update({
      where: { id: titularOne.id },
      data: {
        name: 'Titular Um Renomeado',
        email: 'expected-signer-titular-one-updated@test.local',
      },
    });
    await context.prisma.cesadCommissionMember.update({
      where: { id: titularOneMember.id },
      data: { endDate: new Date('2020-12-31T23:59:59.000Z') },
    });

    const persistedSnapshotAfterCompositionChange = await context.prisma.cesadStageOpinionExpectedSigner.findMany({
      where: { cesadStageOpinionId: cesadStageOpinion.id },
      orderBy: { sortOrder: 'asc' },
    });
    assert.equal(persistedSnapshotAfterCompositionChange[0]?.nameSnapshot, 'Titular Um');
    assert.equal(persistedSnapshotAfterCompositionChange[0]?.emailSnapshot, titularOne.email);

    const readSnapshot = await context.cesadStageReadService.getStageReadSnapshot(
      cesadProcess.id,
      1,
      authenticatedUser(assistant.id, assistant.role),
    );
    assert.equal(readSnapshot.cesadStageOpinion?.id, cesadStageOpinion.id);
    assert.equal(readSnapshot.cesadStageOpinion?.expectedSigners.length, 2);
    assert.equal(readSnapshot.cesadStageOpinion?.expectedSigners[0]?.nameSnapshot, 'Titular Um');
    assert.equal(readSnapshot.cesadStageOpinion?.expectedSigners[0]?.emailSnapshot, titularOne.email);

    const conflictingCommission = await context.prisma.cesadCommission.create({
      data: {
        name: 'Comissão CESAD conflitante',
        status: 'ACTIVE',
        effectiveStartDate: new Date('2020-01-01T00:00:00.000Z'),
      },
    });
    await context.prisma.cesadCommissionMember.create({
      data: {
        commissionId: conflictingCommission.id,
        userId: titularTwo.id,
        roleType: 'TITULAR',
        startDate: new Date('2020-01-01T00:00:00.000Z'),
      },
    });
    const conflictingProcess = await createProcess(
      context.prisma,
      ProcessStatus.EM_ANALISE_CESAD,
      evaluatedUser.id,
    );
    await createCesadStageAssignment(
      context.prisma,
      conflictingProcess.id,
      conflictingProcess.defaultStageId,
      commission.id,
      supervisor.id,
    );
    const conflictingOpinion = await context.prisma.cesadStageOpinion.create({
      data: {
        processId: conflictingProcess.id,
        processStageId: conflictingProcess.defaultStageId,
        authorUserId: cesad.id,
        status: 'COMPLETED',
        reportText: 'Relatório final com comissão vigente conflitante.',
        conclusion: 'Conclusão final com comissão vigente conflitante.',
        completedAt: new Date('2026-04-24T12:30:00.000Z'),
      },
    });
    await context.processDocumentsService.prepareCesadOpinionSignatures(
      conflictingProcess.id,
      1,
      authenticatedUser(cesad.id, cesad.role),
    );
    await context.processDocumentsService.signCesadOpinionDocument(
      conflictingProcess.id,
      1,
      authenticatedUser(titularTwo.id, titularTwo.role),
    );
    const conflictingIssuedWorkflow = await context.service.transitionWorkflow(
      conflictingProcess.id,
      authenticatedUser(cesad.id, cesad.role),
      { action: workflowActions.issueOpinion },
    );
    assert.equal(conflictingIssuedWorkflow.status, ProcessStatus.PARECER_EMITIDO);
    const assignmentBasedExpectedSigners =
      await context.prisma.cesadStageOpinionExpectedSigner.findMany({
        where: { cesadStageOpinionId: conflictingOpinion.id },
      });
    assert(assignmentBasedExpectedSigners.length > 0);
    assert(
      assignmentBasedExpectedSigners.every((signer) => signer.commissionId === commission.id),
    );
    assert(
      assignmentBasedExpectedSigners.every((signer) => signer.commissionId !== conflictingCommission.id),
    );

    await context.prisma.cesadCommission.updateMany({
      data: { status: 'INACTIVE' },
    });

    const noActiveCommissionProcess = await createProcess(
      context.prisma,
      ProcessStatus.AGUARDANDO_ASSINATURA,
      evaluatedUser.id,
      supervisor.id,
    );
    await createSignedRequiredStageDocuments(
      context.prisma,
      noActiveCommissionProcess.id,
      noActiveCommissionProcess.defaultStageId,
      supervisor.id,
      evaluatedUser.id,
    );
    await assert.rejects(
      () =>
        context.service.transitionWorkflowAsResponsibleSupervisorInTransaction(
          context.prisma,
          noActiveCommissionProcess.id,
          authenticatedUser(supervisor.id, supervisor.role),
          { action: workflowActions.sendToCesad },
        ),
      /no active CESAD commission/,
    );

    const supersededCommissionProcess = await createProcess(
      context.prisma,
      ProcessStatus.AGUARDANDO_ASSINATURA,
      evaluatedUser.id,
      supervisor.id,
    );
    await createSignedRequiredStageDocuments(
      context.prisma,
      supersededCommissionProcess.id,
      supersededCommissionProcess.defaultStageId,
      supervisor.id,
      evaluatedUser.id,
    );
    await context.prisma.cesadCommission.create({
      data: {
        name: 'Comissão CESAD superada',
        status: 'SUPERSEDED',
        effectiveStartDate: new Date('2020-01-01T00:00:00.000Z'),
      },
    });
    await assert.rejects(
      () =>
        context.service.transitionWorkflowAsResponsibleSupervisorInTransaction(
          context.prisma,
          supersededCommissionProcess.id,
          authenticatedUser(supervisor.id, supervisor.role),
          { action: workflowActions.sendToCesad },
        ),
      /no active CESAD commission/,
    );

    await context.prisma.cesadCommission.createMany({
      data: [
        {
          name: 'Comissão CESAD ativa concorrente A',
          status: 'ACTIVE',
          effectiveStartDate: new Date('2020-01-01T00:00:00.000Z'),
        },
        {
          name: 'Comissão CESAD ativa concorrente B',
          status: 'ACTIVE',
          effectiveStartDate: new Date('2020-01-01T00:00:00.000Z'),
        },
      ],
    });
    const multipleActiveCommissionProcess = await createProcess(
      context.prisma,
      ProcessStatus.AGUARDANDO_ASSINATURA,
      evaluatedUser.id,
      supervisor.id,
    );
    await createSignedRequiredStageDocuments(
      context.prisma,
      multipleActiveCommissionProcess.id,
      multipleActiveCommissionProcess.defaultStageId,
      supervisor.id,
      evaluatedUser.id,
    );
    await assert.rejects(
      () =>
        context.service.transitionWorkflowAsResponsibleSupervisorInTransaction(
          context.prisma,
          multipleActiveCommissionProcess.id,
          authenticatedUser(supervisor.id, supervisor.role),
          { action: workflowActions.sendToCesad },
        ),
      /more than one active CESAD commission/,
    );
  } finally {
    await disposeTestContext(context);
  }
}
