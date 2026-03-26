import assert from 'node:assert/strict';

import {
  AuditEventType,
  DocumentStatus,
  DocumentType,
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
    const admin = await createUser(context.prisma, UserRole.ADMIN, 'self-admin@test.local');

    const process = await createProcess(context.prisma, ProcessStatus.EM_AVALIACAO, evaluatedUser.id);
    const ownInternUser = authenticatedUser(evaluatedUser.id, evaluatedUser.role);
    const otherInternUser = authenticatedUser(otherIntern.id, otherIntern.role);
    const supervisorUser = authenticatedUser(supervisor.id, supervisor.role);
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
    assert.equal(await context.prisma.selfEvaluation.count({ where: { processId: process.id } }), 0);

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
    assert.equal(submitted.documentContext?.supervisorSignaturePending, true);

    const persistedProcess = await context.prisma.evaluationProcess.findUniqueOrThrow({
      where: { id: process.id },
    });
    assert.equal(persistedProcess.status, ProcessStatus.AGUARDANDO_ASSINATURA);

    const persistedDocument = await context.prisma.processDocument.findUniqueOrThrow({
      where: {
        evaluationProcessId_documentType: {
          evaluationProcessId: process.id,
          documentType: DocumentType.SELF_EVALUATION,
        },
      },
      include: {
        signatureRecords: true,
      },
    });

    assert.equal(persistedDocument.documentStatus, DocumentStatus.READY_FOR_SIGNATURE);
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
      () =>
        context.selfEvaluationsService.saveDraft(
          process.id,
          ownInternUser,
          buildSelfEvaluationPayload({ selfReflection: 'Tentativa indevida após submissão.' }),
        ),
      /Submitted self evaluation cannot be edited/,
    );

    await assert.rejects(
      () =>
        context.selfEvaluationsService.submit(
          process.id,
          ownInternUser,
          buildSelfEvaluationPayload({ selfReflection: 'Nova submissão indevida.' }),
        ),
      /already been submitted/,
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
    assert.deepEqual(
      selfEvaluationDocumentAuditEvents.map((event) => event.eventType),
      [
        AuditEventType.DOCUMENT_GENERATED,
        AuditEventType.DOCUMENT_SIGNED,
        AuditEventType.SIGNATURE_REQUESTED,
      ],
    );
  } finally {
    await disposeTestContext(context);
  }
}
