import assert from 'node:assert/strict';

import {
  AuditEventType,
  CesadCommissionMemberRoleType,
  CesadStageOpinionExpectedSignerDerivationType,
  CesadStageOpinionSigningCapacity,
  ProcessAction,
  ProcessStatus,
  UserRole,
} from '@aep-pa/contracts';

import {
  authenticatedUser,
  createProcess,
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
    const intern = await createUser(context.prisma, UserRole.INTERN_SERVER, 'intern@test.local');
    const admin = await createUser(context.prisma, UserRole.ADMIN, 'workflow-admin@test.local');

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

    const cesadProcess = await createProcess(
      context.prisma,
      ProcessStatus.EM_ANALISE_CESAD,
      evaluatedUser.id,
    );

    const cesadWorkflow = await context.service.getWorkflow(
      cesadProcess.id,
      authenticatedUser(cesad.id, cesad.role),
    );
    assert.deepEqual(cesadWorkflow.availableActions, [
      ProcessAction.ISSUE_CESAD_OPINION,
      ProcessAction.REQUEST_ADJUSTMENT,
    ]);

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
    const commission = await context.prisma.cesadCommission.create({
      data: {
        name: 'Comissão CESAD vigente para snapshot',
        status: 'ACTIVE',
        effectiveStartDate: new Date('2020-01-01T00:00:00.000Z'),
      },
    });
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
    await context.prisma.cesadStageOpinion.create({
      data: {
        processId: conflictingProcess.id,
        processStageId: conflictingProcess.defaultStageId,
        authorUserId: cesad.id,
        status: 'COMPLETED',
        reportText: 'Relatório final com comissão conflitante.',
        conclusion: 'Conclusão final com comissão conflitante.',
        completedAt: new Date('2026-04-24T12:30:00.000Z'),
      },
    });
    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          conflictingProcess.id,
          authenticatedUser(cesad.id, cesad.role),
          { action: workflowActions.issueOpinion },
        ),
      /more than one active CESAD commission/,
    );
  } finally {
    await disposeTestContext(context);
  }
}
