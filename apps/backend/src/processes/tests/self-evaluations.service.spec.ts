import assert from 'node:assert/strict';

import {
  AuditEventType,
  DocumentStatus,
  DocumentType,
  ProcessAction,
  ProcessStatus,
  SelfEvaluationStatus,
  SignatureStatus,
  UserRole,
} from '@aep-pa/contracts';

import {
  authenticatedUser,
  buildSelfEvaluationPayload,
  buildSupervisorEvaluationPayload,
  createProcess,
  createTestContext,
  createUser,
  disposeTestContext,
} from './test-helpers';

export async function runSelfEvaluationsTests() {
  const context = await createTestContext('self-evaluations-service-test');

  try {
    const evaluatedUser = await createUser(context.prisma, UserRole.INTERN_SERVER, 'self-evaluated@test.local');
    const otherIntern = await createUser(context.prisma, UserRole.INTERN_SERVER, 'other-intern@test.local');
    const supervisor = await createUser(
      context.prisma,
      UserRole.IMMEDIATE_SUPERVISOR,
      'self-supervisor@test.local',
    );
    const otherSupervisor = await createUser(
      context.prisma,
      UserRole.IMMEDIATE_SUPERVISOR,
      'other-self-supervisor@test.local',
    );
    const admin = await createUser(context.prisma, UserRole.ADMIN, 'self-admin@test.local');

    const process = await createProcess(context.prisma, ProcessStatus.EM_AVALIACAO, evaluatedUser.id);
    const ownInternUser = authenticatedUser(evaluatedUser.id, evaluatedUser.role);
    const otherInternUser = authenticatedUser(otherIntern.id, otherIntern.role);
    const supervisorUser = authenticatedUser(supervisor.id, supervisor.role);
    const otherSupervisorUser = authenticatedUser(otherSupervisor.id, otherSupervisor.role);
    const adminUser = authenticatedUser(admin.id, admin.role);

    await context.supervisorEvaluationsService.submit(
      process.id,
      supervisorUser,
      buildSupervisorEvaluationPayload({
        comment: 'Encaminhando para ciência e assinatura do servidor.',
      }),
    );

    await assert.rejects(
      () =>
        context.selfEvaluationsService.saveDraft(
          process.id,
          ownInternUser,
          buildSelfEvaluationPayload(),
        ),
      /Self evaluation can only start after the evaluated server signs the supervisor evaluation document/,
    );

    await context.processDocumentsService.signSupervisorEvaluationDocument(process.id, ownInternUser);

    const processAfterSupervisorSignature = await context.prisma.evaluationProcess.findUniqueOrThrow({
      where: { id: process.id },
    });
    assert.equal(processAfterSupervisorSignature.status, ProcessStatus.AGUARDANDO_ASSINATURA);

    const initialFetch = await context.selfEvaluationsService.getByProcessId(process.id, ownInternUser);
    assert.equal(initialFetch, null);
    assert.equal(await context.prisma.selfEvaluation.count({ where: { processStageId: process.defaultStageId } }), 0);

    const createdDraft = await context.selfEvaluationsService.saveDraft(
      process.id,
      ownInternUser,
      buildSelfEvaluationPayload({ selfReflection: 'Primeira versão em rascunho.' }),
    );

    assert.equal(createdDraft.status, SelfEvaluationStatus.DRAFT);
    assert.equal(createdDraft.selfReflection, 'Primeira versão em rascunho.');

    const updatedDraft = await context.selfEvaluationsService.saveDraft(
      process.id,
      ownInternUser,
      buildSelfEvaluationPayload({
        selfReflection: 'Rascunho atualizado com observações mais completas.',
        additionalNotes: 'Observações adicionais do servidor.',
      }),
    );

    assert.equal(updatedDraft.status, SelfEvaluationStatus.DRAFT);
    assert.equal(updatedDraft.additionalNotes, 'Observações adicionais do servidor.');

    const ownDraftView = await context.selfEvaluationsService.getByProcessId(process.id, ownInternUser);
    assert.equal(ownDraftView?.status, SelfEvaluationStatus.DRAFT);
    assert.equal(
      ownDraftView?.selfReflection,
      'Rascunho atualizado com observações mais completas.',
    );

    const supervisorDraftView = await context.selfEvaluationsService.getByProcessId(process.id, supervisorUser);
    assert.equal(supervisorDraftView, null);

    await assert.rejects(
      () =>
        context.selfEvaluationsService.submit(
          process.id,
          adminUser,
          buildSelfEvaluationPayload(),
        ),
      /Only INTERN_SERVER can manipulate self evaluation/,
    );

    await assert.rejects(
      () =>
        context.selfEvaluationsService.submit(
          process.id,
          otherInternUser,
          buildSelfEvaluationPayload(),
        ),
      /Authenticated user is not the evaluated server for this process/,
    );

    const submitted = await context.selfEvaluationsService.submit(
      process.id,
      ownInternUser,
      buildSelfEvaluationPayload({
        selfReflection: 'Versão final da autoavaliação submetida pelo servidor.',
        additionalNotes: 'Observações finais facultativas.',
        comment: 'Submetendo autoavaliação da etapa.',
      }),
    );

    assert.equal(submitted.status, SelfEvaluationStatus.SUBMITTED);
    assert.ok(submitted.submittedAt);
    assert.equal(submitted.documentContext?.documentType, DocumentType.SELF_EVALUATION);
    assert.equal(submitted.documentContext?.documentStatus, DocumentStatus.READY_FOR_SIGNATURE);
    assert.equal(submitted.documentContext?.hasArtifact, false);
    assert.equal(submitted.documentContext?.artifactPath, null);
    assert.equal(submitted.documentContext?.supervisorSignaturePending, true);

    const persistedProcess = await context.prisma.evaluationProcess.findUniqueOrThrow({
      where: { id: process.id },
    });
    assert.equal(persistedProcess.status, ProcessStatus.AGUARDANDO_ASSINATURA);

    const persistedDocument = await context.prisma.processDocument.findFirstOrThrow({
      where: {
        evaluationProcessId: process.id,
        processStageId: process.defaultStageId,
        documentType: DocumentType.SELF_EVALUATION,
      },
      include: {
        signatureRecords: true,
      },
    });

    assert.equal(persistedDocument.documentStatus, DocumentStatus.READY_FOR_SIGNATURE);
    assert.equal(persistedDocument.artifactPath, null);
    assert.equal(persistedDocument.signatureRecords.length, 2);

    const internSignature = persistedDocument.signatureRecords.find(
      (signature) => signature.signatoryRole === UserRole.INTERN_SERVER,
    );
    const supervisorSignature = persistedDocument.signatureRecords.find(
      (signature) => signature.signatoryRole === UserRole.IMMEDIATE_SUPERVISOR,
    );

    assert.equal(internSignature?.status, SignatureStatus.COMPLETED);
    assert.ok(internSignature?.signedAt);
    assert.equal(supervisorSignature?.status, SignatureStatus.PENDING);
    assert.equal(supervisorSignature?.signedAt, null);

    const supervisorSubmittedView = await context.selfEvaluationsService.getByProcessId(process.id, supervisorUser);
    assert.equal(supervisorSubmittedView?.status, SelfEvaluationStatus.SUBMITTED);
    assert.equal(supervisorSubmittedView?.documentContext?.supervisorSignaturePending, true);

    await assert.rejects(
      () => context.selfEvaluationsService.getByProcessId(process.id, otherSupervisorUser),
      /expected supervisor/,
    );

    await assert.rejects(
      () => context.selfEvaluationsService.sign(process.id, adminUser, { comment: 'Tentativa indevida.' }),
      /Only IMMEDIATE_SUPERVISOR can sign self evaluation/,
    );

    await assert.rejects(
      () =>
        context.selfEvaluationsService.sign(process.id, ownInternUser, {
          comment: 'Servidor não pode assinar pela chefia.',
        }),
      /Only IMMEDIATE_SUPERVISOR can sign self evaluation/,
    );

    await assert.rejects(
      () =>
        context.selfEvaluationsService.sign(process.id, otherSupervisorUser, {
          comment: 'Chefia não vinculada.',
        }),
      /expected supervisor/,
    );

    const signedBySupervisor = await context.selfEvaluationsService.sign(process.id, supervisorUser, {
      comment: 'Assinando autoavaliação e encaminhando à CESAD.',
    });
    assert.equal(signedBySupervisor.status, SelfEvaluationStatus.SUBMITTED);
    assert.equal(signedBySupervisor.documentContext?.documentStatus, DocumentStatus.SIGNED);
    assert.equal(signedBySupervisor.documentContext?.hasArtifact, false);
    assert.equal(signedBySupervisor.documentContext?.artifactPath, null);
    assert.equal(signedBySupervisor.documentContext?.supervisorSignaturePending, false);

    const signedDocument = await context.prisma.processDocument.findFirstOrThrow({
      where: {
        evaluationProcessId: process.id,
        processStageId: process.defaultStageId,
        documentType: DocumentType.SELF_EVALUATION,
      },
      include: {
        signatureRecords: true,
      },
    });
    assert.equal(signedDocument.documentStatus, DocumentStatus.SIGNED);
    assert.equal(signedDocument.artifactPath, null);

    const signedSupervisorSignature = signedDocument.signatureRecords.find(
      (signature) => signature.signatoryRole === UserRole.IMMEDIATE_SUPERVISOR,
    );
    assert.equal(signedSupervisorSignature?.status, SignatureStatus.COMPLETED);
    assert.ok(signedSupervisorSignature?.signedAt);

    const processAfterSelfEvaluationSignature = await context.prisma.evaluationProcess.findUniqueOrThrow({
      where: { id: process.id },
    });
    assert.equal(processAfterSelfEvaluationSignature.status, ProcessStatus.EM_ANALISE_CESAD);

    await assert.rejects(
      () =>
        context.selfEvaluationsService.saveDraft(
          process.id,
          ownInternUser,
          buildSelfEvaluationPayload({ selfReflection: 'Tentativa indevida após submissão.' }),
        ),
      /Self evaluation can only be manipulated while process is in status AGUARDANDO_ASSINATURA/,
    );

    await assert.rejects(
      () =>
        context.selfEvaluationsService.submit(
          process.id,
          ownInternUser,
          buildSelfEvaluationPayload({ selfReflection: 'Nova submissão indevida.' }),
        ),
      /Self evaluation can only be manipulated while process is in status AGUARDANDO_ASSINATURA/,
    );

    const auditEvents = await context.prisma.auditEvent.findMany({
      where: { evaluationProcessId: process.id },
      orderBy: { occurredAt: 'asc' },
    });
    const selfEvaluationAuditEvents = auditEvents.filter((event) => {
      const metadata = event.metadata as Record<string, unknown> | null;
      return metadata?.origin === 'SELF_EVALUATION';
    });
    const selfEvaluationDocumentAuditEvents = auditEvents.filter((event) => {
      const metadata = event.metadata as Record<string, unknown> | null;
      return metadata?.documentId === persistedDocument.id;
    });

    assert.deepEqual(
      selfEvaluationAuditEvents.map((event) => event.eventType),
      [
        AuditEventType.EVALUATION_STARTED,
        AuditEventType.EVALUATION_DRAFT_SAVED,
        AuditEventType.SELF_EVALUATION_SUBMITTED,
      ],
    );
    assert(
      selfEvaluationAuditEvents.every((event) => {
        const metadata = event.metadata as { processStageId?: string; stageSequence?: number };
        return metadata.processStageId === process.defaultStageId && metadata.stageSequence === 1;
      }),
    );
    assert.deepEqual(
      selfEvaluationDocumentAuditEvents.map((event) => event.eventType),
      [
        AuditEventType.DOCUMENT_GENERATED,
        AuditEventType.DOCUMENT_SIGNED,
        AuditEventType.SIGNATURE_REQUESTED,
        AuditEventType.DOCUMENT_SIGNED,
      ],
    );
    assert(
      selfEvaluationDocumentAuditEvents.every((event) => {
        const metadata = event.metadata as { processStageId?: string; stageSequence?: number };
        return metadata.processStageId === process.defaultStageId && metadata.stageSequence === 1;
      }),
    );

    const workflowAuditEvents = auditEvents.filter((event) => event.eventType === AuditEventType.SENT_TO_CESAD);
    assert.equal(workflowAuditEvents.length, 1);
    assert.equal(
      (workflowAuditEvents[0].afterState as { status?: ProcessStatus }).status,
      ProcessStatus.EM_ANALISE_CESAD,
    );
    assert.equal(
      (workflowAuditEvents[0].metadata as { action?: string }).action,
      ProcessAction.SEND_TO_CESAD,
    );
    assert.equal(
      (workflowAuditEvents[0].metadata as { processStageId?: string }).processStageId,
      process.defaultStageId,
    );

    const finalSelfDocumentSignedEvent = selfEvaluationDocumentAuditEvents.at(-1);
    assert.equal(
      (finalSelfDocumentSignedEvent?.metadata as { documentStatus?: string }).documentStatus,
      DocumentStatus.SIGNED,
    );

    const noPendingSignatureProcess = await createProcess(
      context.prisma,
      ProcessStatus.EM_AVALIACAO,
      evaluatedUser.id,
    );
    await context.supervisorEvaluationsService.submit(
      noPendingSignatureProcess.id,
      supervisorUser,
      buildSupervisorEvaluationPayload(),
    );
    await context.processDocumentsService.signSupervisorEvaluationDocument(
      noPendingSignatureProcess.id,
      ownInternUser,
    );
    await context.selfEvaluationsService.submit(
      noPendingSignatureProcess.id,
      ownInternUser,
      buildSelfEvaluationPayload({ selfReflection: 'Fluxo com assinatura pendente removida artificialmente.' }),
    );
    const noPendingSelfDocument = await context.prisma.processDocument.findFirstOrThrow({
      where: {
        evaluationProcessId: noPendingSignatureProcess.id,
        processStageId: noPendingSignatureProcess.defaultStageId,
        documentType: DocumentType.SELF_EVALUATION,
      },
      include: {
        signatureRecords: true,
      },
    });
    const noPendingSupervisorSignature = noPendingSelfDocument.signatureRecords.find(
      (signature) => signature.signatoryRole === UserRole.IMMEDIATE_SUPERVISOR,
    );
    assert.ok(noPendingSupervisorSignature);
    await context.prisma.signatureRecord.update({
      where: { id: noPendingSupervisorSignature.id },
      data: {
        status: SignatureStatus.COMPLETED,
        signedAt: new Date(),
      },
    });
    await context.prisma.processDocument.update({
      where: { id: noPendingSelfDocument.id },
      data: { documentStatus: DocumentStatus.SIGNED },
    });
    await assert.rejects(
      () =>
        context.selfEvaluationsService.sign(noPendingSignatureProcess.id, supervisorUser, {
          comment: 'Nova assinatura indevida.',
        }),
      /No pending supervisor signature found/,
    );

    const missingSelfEvaluationProcess = await createProcess(
      context.prisma,
      ProcessStatus.EM_AVALIACAO,
      evaluatedUser.id,
    );
    await context.supervisorEvaluationsService.submit(
      missingSelfEvaluationProcess.id,
      supervisorUser,
      buildSupervisorEvaluationPayload(),
    );
    await context.processDocumentsService.signSupervisorEvaluationDocument(
      missingSelfEvaluationProcess.id,
      ownInternUser,
    );
    await assert.rejects(
      () => context.selfEvaluationsService.sign(missingSelfEvaluationProcess.id, supervisorUser),
      /Self evaluation not found/,
    );

    const draftOnlyProcess = await createProcess(context.prisma, ProcessStatus.EM_AVALIACAO, evaluatedUser.id);
    await context.supervisorEvaluationsService.submit(
      draftOnlyProcess.id,
      supervisorUser,
      buildSupervisorEvaluationPayload(),
    );
    await context.processDocumentsService.signSupervisorEvaluationDocument(draftOnlyProcess.id, ownInternUser);
    await context.selfEvaluationsService.saveDraft(
      draftOnlyProcess.id,
      ownInternUser,
      buildSelfEvaluationPayload({ selfReflection: 'Rascunho ainda não submetido.' }),
    );
    await assert.rejects(
      () => context.selfEvaluationsService.sign(draftOnlyProcess.id, supervisorUser),
      /Only submitted self evaluation can be signed by the supervisor/,
    );

    const missingDocumentProcess = await createProcess(
      context.prisma,
      ProcessStatus.EM_AVALIACAO,
      evaluatedUser.id,
    );
    await context.supervisorEvaluationsService.submit(
      missingDocumentProcess.id,
      supervisorUser,
      buildSupervisorEvaluationPayload(),
    );
    await context.processDocumentsService.signSupervisorEvaluationDocument(
      missingDocumentProcess.id,
      ownInternUser,
    );
    await context.selfEvaluationsService.submit(
      missingDocumentProcess.id,
      ownInternUser,
      buildSelfEvaluationPayload({ selfReflection: 'Autoavaliação submetida sem documento ao final do teste.' }),
    );
    await context.prisma.signatureRecord.deleteMany({
      where: {
        processDocument: {
          evaluationProcessId: missingDocumentProcess.id,
          processStageId: missingDocumentProcess.defaultStageId,
          documentType: DocumentType.SELF_EVALUATION,
        },
      },
    });
    const missingSelfDocument = await context.prisma.processDocument.findFirstOrThrow({
      where: {
        evaluationProcessId: missingDocumentProcess.id,
        processStageId: missingDocumentProcess.defaultStageId,
        documentType: DocumentType.SELF_EVALUATION,
      },
    });
    await context.prisma.processDocument.delete({
      where: { id: missingSelfDocument.id },
    });
    await assert.rejects(
      () => context.selfEvaluationsService.sign(missingDocumentProcess.id, supervisorUser),
      /Self evaluation document not found/,
    );

    const incompleteStageProcess = await createProcess(
      context.prisma,
      ProcessStatus.EM_AVALIACAO,
      evaluatedUser.id,
    );
    await context.supervisorEvaluationsService.submit(
      incompleteStageProcess.id,
      supervisorUser,
      buildSupervisorEvaluationPayload(),
    );
    await context.processDocumentsService.signSupervisorEvaluationDocument(
      incompleteStageProcess.id,
      ownInternUser,
    );
    await context.selfEvaluationsService.submit(
      incompleteStageProcess.id,
      ownInternUser,
      buildSelfEvaluationPayload({ selfReflection: 'Fluxo com completude documental artificialmente quebrada.' }),
    );
    await context.prisma.signatureRecord.deleteMany({
      where: {
        processDocument: {
          evaluationProcessId: incompleteStageProcess.id,
          processStageId: incompleteStageProcess.defaultStageId,
          documentType: DocumentType.SUPERVISOR_EVALUATION,
        },
      },
    });
    const incompleteSupervisorDocument = await context.prisma.processDocument.findFirstOrThrow({
      where: {
        evaluationProcessId: incompleteStageProcess.id,
        processStageId: incompleteStageProcess.defaultStageId,
        documentType: DocumentType.SUPERVISOR_EVALUATION,
      },
    });
    await context.prisma.processDocument.delete({
      where: { id: incompleteSupervisorDocument.id },
    });
    const signedWithoutStageCompletion = await context.selfEvaluationsService.sign(
      incompleteStageProcess.id,
      supervisorUser,
      { comment: 'Assinando autoavaliação mesmo com etapa incompleta.' },
    );
    assert.equal(signedWithoutStageCompletion.documentContext?.documentStatus, DocumentStatus.SIGNED);
    const incompleteStagePersistedProcess = await context.prisma.evaluationProcess.findUniqueOrThrow({
      where: { id: incompleteStageProcess.id },
    });
    assert.equal(incompleteStagePersistedProcess.status, ProcessStatus.AGUARDANDO_ASSINATURA);
  } finally {
    await disposeTestContext(context);
  }
}
