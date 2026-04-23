import assert from 'node:assert/strict';

import {
  AuditEventType as PrismaAuditEventType,
  DocumentStatus as PrismaDocumentStatus,
  DocumentType as PrismaDocumentType,
  Prisma,
  ProcessStatus as PrismaProcessStatus,
  SignatureProvider as PrismaSignatureProvider,
  SignatureStatus as PrismaSignatureStatus,
} from '@prisma/client';
import {
  AuditEventType,
  CesadStageOpinionStatus,
  DocumentType,
  ProcessAction,
  ProcessStatus,
  UserRole,
} from '@aep-pa/contracts';

import {
  authenticatedUser,
  createProcess,
  createProcessStage,
  createTestContext,
  createUser,
  disposeTestContext,
} from './test-helpers';

export async function runCesadStageReadServiceTests() {
  const context = await createTestContext('cesad-stage-read-service-test');

  try {
    const intern = await createUser(context.prisma, UserRole.INTERN_SERVER, 'maria.silva@test.local');
    const supervisor = await createUser(
      context.prisma,
      UserRole.IMMEDIATE_SUPERVISOR,
      'stage-read-supervisor@test.local',
    );
    const cesad = await createUser(context.prisma, UserRole.CESAD_MEMBER, 'stage-read-cesad@test.local');

    const process = await createProcess(context.prisma, ProcessStatus.EM_ANALISE_CESAD, intern.id);
    const stageOne = await context.prisma.processStage.findUniqueOrThrow({
      where: { id: process.defaultStageId },
    });
    const stageTwo = await createProcessStage(context.prisma, process.id, 2, 'ETAPA_2');

    await context.prisma.supervisorEvaluation.createMany({
      data: [
        {
          processId: process.id,
          processStageId: stageOne.id,
          evaluatorUserId: supervisor.id,
          status: 'SUBMITTED',
          summary: 'Síntese consolidada da avaliação da chefia da etapa 1.',
          generalComments: 'Comentários gerais da chefia sobre a etapa 1.',
          content: {
            criteria: [
              {
                code: 'ASSIDUIDADE',
                label: 'Assiduidade',
                rating: 4,
                comment: 'Desempenho consistente na etapa 1.',
              },
            ],
          },
          submittedAt: new Date('2026-04-01T10:00:00.000Z'),
        },
        {
          processId: process.id,
          processStageId: stageTwo.id,
          evaluatorUserId: supervisor.id,
          status: 'SUBMITTED',
          summary: 'Síntese consolidada da avaliação da chefia da etapa 2.',
          generalComments: 'Comentários gerais da chefia sobre a etapa 2.',
          content: {
            criteria: [
              {
                code: 'ENTREGAS',
                label: 'Entregas',
                rating: 5,
                comment: 'Entregas concluídas com alta qualidade na etapa 2.',
              },
            ],
          },
          submittedAt: new Date('2026-05-01T10:00:00.000Z'),
        },
      ],
    });

    await context.prisma.selfEvaluation.createMany({
      data: [
        {
          processId: process.id,
          processStageId: stageOne.id,
          authorUserId: intern.id,
          status: 'SUBMITTED',
          selfReflection: 'Reflexão do servidor sobre a etapa 1.',
          additionalNotes: 'Observações adicionais da etapa 1.',
          submittedAt: new Date('2026-04-03T11:00:00.000Z'),
        },
        {
          processId: process.id,
          processStageId: stageTwo.id,
          authorUserId: intern.id,
          status: 'SUBMITTED',
          selfReflection: 'Reflexão do servidor sobre a etapa 2.',
          additionalNotes: 'Observações adicionais da etapa 2.',
          submittedAt: new Date('2026-05-03T11:00:00.000Z'),
        },
      ],
    });

    const [stageOneSupervisorDocument, stageOneSelfDocument, stageTwoSupervisorDocument, stageTwoSelfDocument] =
      await Promise.all([
        context.prisma.processDocument.create({
          data: {
            evaluationProcessId: process.id,
            processStageId: stageOne.id,
            documentType: PrismaDocumentType.SUPERVISOR_EVALUATION,
            documentStatus: PrismaDocumentStatus.SIGNED,
            artifactPath: 'documents/supervisor-evaluation-stage-1.pdf',
          },
        }),
        context.prisma.processDocument.create({
          data: {
            evaluationProcessId: process.id,
            processStageId: stageOne.id,
            documentType: PrismaDocumentType.SELF_EVALUATION,
            documentStatus: PrismaDocumentStatus.SIGNED,
            artifactPath: 'documents/self-evaluation-stage-1.pdf',
          },
        }),
        context.prisma.processDocument.create({
          data: {
            evaluationProcessId: process.id,
            processStageId: stageTwo.id,
            documentType: PrismaDocumentType.SUPERVISOR_EVALUATION,
            documentStatus: PrismaDocumentStatus.SIGNED,
            artifactPath: 'documents/supervisor-evaluation-stage-2.pdf',
          },
        }),
        context.prisma.processDocument.create({
          data: {
            evaluationProcessId: process.id,
            processStageId: stageTwo.id,
            documentType: PrismaDocumentType.SELF_EVALUATION,
            documentStatus: PrismaDocumentStatus.SIGNED,
            artifactPath: null,
          },
        }),
      ]);

    await context.prisma.signatureRecord.createMany({
      data: [
        {
          processDocumentId: stageOneSupervisorDocument.id,
          signatoryUserId: supervisor.id,
          signatoryRole: 'IMMEDIATE_SUPERVISOR',
          provider: PrismaSignatureProvider.INTERNAL,
          status: PrismaSignatureStatus.COMPLETED,
          signedAt: new Date('2026-04-01T10:10:00.000Z'),
        },
        {
          processDocumentId: stageOneSupervisorDocument.id,
          signatoryUserId: intern.id,
          signatoryRole: 'INTERN_SERVER',
          provider: PrismaSignatureProvider.INTERNAL,
          status: PrismaSignatureStatus.COMPLETED,
          signedAt: new Date('2026-04-02T09:00:00.000Z'),
        },
        {
          processDocumentId: stageOneSelfDocument.id,
          signatoryUserId: intern.id,
          signatoryRole: 'INTERN_SERVER',
          provider: PrismaSignatureProvider.INTERNAL,
          status: PrismaSignatureStatus.COMPLETED,
          signedAt: new Date('2026-04-03T11:10:00.000Z'),
        },
        {
          processDocumentId: stageOneSelfDocument.id,
          signatoryUserId: supervisor.id,
          signatoryRole: 'IMMEDIATE_SUPERVISOR',
          provider: PrismaSignatureProvider.INTERNAL,
          status: PrismaSignatureStatus.COMPLETED,
          signedAt: new Date('2026-04-04T08:00:00.000Z'),
        },
        {
          processDocumentId: stageTwoSupervisorDocument.id,
          signatoryUserId: supervisor.id,
          signatoryRole: 'IMMEDIATE_SUPERVISOR',
          provider: PrismaSignatureProvider.INTERNAL,
          status: PrismaSignatureStatus.COMPLETED,
          signedAt: new Date('2026-05-01T10:10:00.000Z'),
        },
        {
          processDocumentId: stageTwoSupervisorDocument.id,
          signatoryUserId: intern.id,
          signatoryRole: 'INTERN_SERVER',
          provider: PrismaSignatureProvider.INTERNAL,
          status: PrismaSignatureStatus.COMPLETED,
          signedAt: new Date('2026-05-02T09:00:00.000Z'),
        },
        {
          processDocumentId: stageTwoSelfDocument.id,
          signatoryUserId: intern.id,
          signatoryRole: 'INTERN_SERVER',
          provider: PrismaSignatureProvider.INTERNAL,
          status: PrismaSignatureStatus.COMPLETED,
          signedAt: new Date('2026-05-03T11:10:00.000Z'),
        },
        {
          processDocumentId: stageTwoSelfDocument.id,
          signatoryUserId: supervisor.id,
          signatoryRole: 'IMMEDIATE_SUPERVISOR',
          provider: PrismaSignatureProvider.INTERNAL,
          status: PrismaSignatureStatus.COMPLETED,
          signedAt: new Date('2026-05-04T08:00:00.000Z'),
        },
      ],
    });

    const stageTwoCesadOpinion = await context.prisma.cesadStageOpinion.create({
      data: {
        processId: process.id,
        processStageId: stageTwo.id,
        authorUserId: cesad.id,
        status: 'COMPLETED',
        reportText: 'Relatório funcional da CESAD para a etapa 2.',
        legalBasis: 'Lei municipal X, art. 10.',
        conclusion: 'Conclusão funcional da CESAD para a etapa 2.',
        stageConcept: 'Satisfatório',
        stageResult: 'Etapa favorável',
        completedAt: new Date('2026-05-05T09:00:00.000Z'),
      },
    });

    await context.prisma.auditEvent.createMany({
      data: [
        {
          evaluationProcessId: process.id,
          actorUserId: supervisor.id,
          actorRole: 'IMMEDIATE_SUPERVISOR',
          eventType: PrismaAuditEventType.EVALUATION_COMPLETED,
          beforeState: {},
          afterState: { status: PrismaProcessStatus.AGUARDANDO_ASSINATURA },
          metadata: {
            action: 'COMPLETE_EVALUATION',
            comment: 'Avaliação concluída para a etapa 1.',
            processStageId: stageOne.id,
            stageSequence: stageOne.sequence,
          },
          occurredAt: new Date('2026-04-01T10:00:00.000Z'),
        },
        {
          evaluationProcessId: process.id,
          actorUserId: intern.id,
          actorRole: 'INTERN_SERVER',
          eventType: PrismaAuditEventType.SELF_EVALUATION_SUBMITTED,
          beforeState: {},
          afterState: { status: PrismaProcessStatus.AGUARDANDO_ASSINATURA },
          metadata: {
            action: 'SUBMIT_SELF_EVALUATION',
            comment: 'Autoavaliação submetida na etapa 1.',
            processStageId: stageOne.id,
            stageSequence: stageOne.sequence,
            documentId: stageOneSelfDocument.id,
          },
          occurredAt: new Date('2026-04-03T11:00:00.000Z'),
        },
        {
          evaluationProcessId: process.id,
          actorUserId: supervisor.id,
          actorRole: 'IMMEDIATE_SUPERVISOR',
          eventType: PrismaAuditEventType.EVALUATION_COMPLETED,
          beforeState: {},
          afterState: { status: PrismaProcessStatus.AGUARDANDO_ASSINATURA },
          metadata: {
            action: 'COMPLETE_EVALUATION',
            comment: 'Avaliação concluída para a etapa 2.',
            processStageId: stageTwo.id,
            stageSequence: stageTwo.sequence,
            documentId: stageTwoSupervisorDocument.id,
          },
          occurredAt: new Date('2026-05-01T10:00:00.000Z'),
        },
        {
          evaluationProcessId: process.id,
          actorUserId: intern.id,
          actorRole: 'INTERN_SERVER',
          eventType: PrismaAuditEventType.SELF_EVALUATION_SUBMITTED,
          beforeState: {},
          afterState: { status: PrismaProcessStatus.AGUARDANDO_ASSINATURA },
          metadata: {
            action: 'SUBMIT_SELF_EVALUATION',
            comment: 'Autoavaliação submetida na etapa 2.',
            processStageId: stageTwo.id,
            stageSequence: stageTwo.sequence,
            documentId: stageTwoSelfDocument.id,
          },
          occurredAt: new Date('2026-05-03T11:00:00.000Z'),
        },
        {
          evaluationProcessId: process.id,
          actorUserId: supervisor.id,
          actorRole: 'IMMEDIATE_SUPERVISOR',
          eventType: PrismaAuditEventType.SENT_TO_CESAD,
          beforeState: { status: PrismaProcessStatus.AGUARDANDO_ASSINATURA },
          afterState: { status: PrismaProcessStatus.EM_ANALISE_CESAD },
          metadata: {
            action: 'SEND_TO_CESAD',
            comment: 'Etapa 2 encaminhada à CESAD.',
            processStageId: stageTwo.id,
            stageSequence: stageTwo.sequence,
          },
          occurredAt: new Date('2026-05-04T08:30:00.000Z'),
        },
        {
          evaluationProcessId: process.id,
          actorUserId: cesad.id,
          actorRole: 'CESAD_MEMBER',
          eventType: PrismaAuditEventType.CESAD_STAGE_OPINION_STARTED,
          beforeState: Prisma.JsonNull,
          afterState: { cesadStageOpinionStatus: 'DRAFT' },
          metadata: {
            eventType: 'CESAD_STAGE_OPINION_STARTED',
            action: 'START_CESAD_OPINION',
            comment: 'Parecer funcional iniciado para a etapa 2.',
            origin: 'CESAD_STAGE_OPINION',
            processStageId: stageTwo.id,
            stageSequence: stageTwo.sequence,
            scope: 'STAGE',
            cesadStageOpinionId: stageTwoCesadOpinion.id,
          },
          occurredAt: new Date('2026-05-05T08:00:00.000Z'),
        },
        {
          evaluationProcessId: process.id,
          actorUserId: cesad.id,
          actorRole: 'CESAD_MEMBER',
          eventType: PrismaAuditEventType.CESAD_STAGE_OPINION_DRAFT_SAVED,
          beforeState: { cesadStageOpinionStatus: 'DRAFT' },
          afterState: { cesadStageOpinionStatus: 'DRAFT' },
          metadata: {
            eventType: 'CESAD_STAGE_OPINION_DRAFT_SAVED',
            action: 'SAVE_CESAD_OPINION_DRAFT',
            comment: 'Rascunho funcional revisado para a etapa 2.',
            origin: 'CESAD_STAGE_OPINION',
            processStageId: stageTwo.id,
            stageSequence: stageTwo.sequence,
            scope: 'STAGE',
            cesadStageOpinionId: stageTwoCesadOpinion.id,
          },
          occurredAt: new Date('2026-05-05T08:30:00.000Z'),
        },
        {
          evaluationProcessId: process.id,
          actorUserId: cesad.id,
          actorRole: 'CESAD_MEMBER',
          eventType: PrismaAuditEventType.CESAD_STAGE_OPINION_COMPLETED,
          beforeState: { cesadStageOpinionStatus: 'DRAFT' },
          afterState: { cesadStageOpinionStatus: 'COMPLETED' },
          metadata: {
            eventType: 'CESAD_STAGE_OPINION_COMPLETED',
            action: 'COMPLETE_CESAD_STAGE_OPINION',
            comment: 'Parecer funcional concluído para a etapa 2.',
            origin: 'CESAD_STAGE_OPINION',
            processStageId: stageTwo.id,
            stageSequence: stageTwo.sequence,
            scope: 'STAGE',
            cesadStageOpinionId: stageTwoCesadOpinion.id,
          },
          occurredAt: new Date('2026-05-05T09:00:00.000Z'),
        },
      ],
    });

    const auditEventsBeforeRead = await context.prisma.auditEvent.count({
      where: { evaluationProcessId: process.id },
    });

    const snapshot = await context.cesadStageReadService.getStageReadSnapshot(
      process.id,
      2,
      authenticatedUser(cesad.id, cesad.role),
    );

    assert.equal(snapshot.readOnly, true);
    assert.equal(snapshot.process.status, ProcessStatus.EM_ANALISE_CESAD);
    assert.equal(snapshot.server.displayName, 'Maria Silva');
    assert.equal(snapshot.server.positionName, 'Cargo não informado no cadastro');
    assert.equal(snapshot.server.registrationNumber, 'Matrícula não informada no cadastro');
    assert.equal(snapshot.stage.stageId, stageTwo.id);
    assert.equal(snapshot.stage.sequence, 2);
    assert.equal(snapshot.stage.totalStages, 2);
    assert.equal(snapshot.supervisorEvaluation?.processStageId, stageTwo.id);
    assert.equal(snapshot.supervisorEvaluation?.summary, 'Síntese consolidada da avaliação da chefia da etapa 2.');
    assert.equal(snapshot.selfEvaluation?.processStageId, stageTwo.id);
    assert.equal(snapshot.selfEvaluation?.selfReflection, 'Reflexão do servidor sobre a etapa 2.');
    assert.equal(snapshot.cesadStageOpinion?.id, stageTwoCesadOpinion.id);
    assert.equal(snapshot.cesadStageOpinion?.processStageId, stageTwo.id);
    assert.equal(snapshot.cesadStageOpinion?.status, CesadStageOpinionStatus.COMPLETED);
    assert.equal(snapshot.cesadStageOpinion?.reportText, 'Relatório funcional da CESAD para a etapa 2.');
    assert.equal(snapshot.cesadStageOpinion?.conclusion, 'Conclusão funcional da CESAD para a etapa 2.');
    assert.equal(snapshot.cesadStageOpinion?.completedAt, '2026-05-05T09:00:00.000Z');
    assert.equal(snapshot.documentationStatus.allRequiredDocumentsPresent, true);
    assert.equal(snapshot.documentationStatus.allRequiredDocumentsSigned, true);
    assert.equal(snapshot.documentationStatus.stageInstructionStatus, 'COMPLETE');
    assert.deepEqual(snapshot.documentationStatus.missingRequiredDocumentTypes, []);

    const supervisorDocumentSnapshot = snapshot.documents.find(
      (document) => document.documentType === DocumentType.SUPERVISOR_EVALUATION,
    );
    assert.equal(supervisorDocumentSnapshot?.exists, true);
    assert.equal(supervisorDocumentSnapshot?.documentId, stageTwoSupervisorDocument.id);
    assert.equal(supervisorDocumentSnapshot?.stageLinkMode, 'STAGE_BOUND');
    assert.equal(supervisorDocumentSnapshot?.hasArtifact, true);
    assert.equal(supervisorDocumentSnapshot?.signatures.length, 2);
    assert.equal(supervisorDocumentSnapshot?.artifactPath, 'documents/supervisor-evaluation-stage-2.pdf');

    const selfDocumentSnapshot = snapshot.documents.find(
      (document) => document.documentType === DocumentType.SELF_EVALUATION,
    );
    assert.equal(selfDocumentSnapshot?.exists, true);
    assert.equal(selfDocumentSnapshot?.documentId, stageTwoSelfDocument.id);
    assert.equal(selfDocumentSnapshot?.stageLinkMode, 'STAGE_BOUND');
    assert.equal(selfDocumentSnapshot?.hasArtifact, false);
    assert.equal(selfDocumentSnapshot?.artifactPath, null);
    assert.equal(selfDocumentSnapshot?.signatures.length, 2);

    const opinionDocumentSnapshot = snapshot.documents.find(
      (document) => document.documentType === DocumentType.CESAD_OPINION,
    );
    assert.equal(opinionDocumentSnapshot?.exists, false);
    assert.equal(opinionDocumentSnapshot?.stageLinkMode, 'MISSING');
    assert.match(opinionDocumentSnapshot?.missingReason ?? '', /não possui vínculo explícito|ainda não foi formalizado/i);

    assert.equal(snapshot.history.length, 6);
    assert.deepEqual(
      snapshot.history.map((item) => item.action),
      [
        ProcessAction.COMPLETE_EVALUATION,
        ProcessAction.SUBMIT_SELF_EVALUATION,
        ProcessAction.SEND_TO_CESAD,
        ProcessAction.START_CESAD_OPINION,
        ProcessAction.SAVE_CESAD_OPINION_DRAFT,
        ProcessAction.COMPLETE_CESAD_STAGE_OPINION,
      ],
    );
    assert.deepEqual(
      snapshot.history.slice(-3).map((item) => item.eventType),
      [
        AuditEventType.CESAD_STAGE_OPINION_STARTED,
        AuditEventType.CESAD_STAGE_OPINION_DRAFT_SAVED,
        AuditEventType.CESAD_STAGE_OPINION_COMPLETED,
      ],
    );
    assert(snapshot.history.some((item) => item.comment === 'Parecer funcional concluído para a etapa 2.'));
    assert(snapshot.history.every((item) => !(item.comment ?? '').includes('etapa 1')));
    assert.equal(snapshot.warnings.length, 0);

    const processAfterRead = await context.prisma.evaluationProcess.findUniqueOrThrow({
      where: { id: process.id },
      select: { status: true },
    });
    const auditEventsAfterRead = await context.prisma.auditEvent.count({
      where: { evaluationProcessId: process.id },
    });

    assert.equal(processAfterRead.status, PrismaProcessStatus.EM_ANALISE_CESAD);
    assert.equal(auditEventsAfterRead, auditEventsBeforeRead);

    await assert.rejects(
      () =>
        context.cesadStageReadService.getStageReadSnapshot(
          process.id,
          2,
          authenticatedUser(supervisor.id, supervisor.role),
        ),
      /Only CESAD_MEMBER can access the consolidated stage read view/,
    );

    const processOutsideCesadWindow = await createProcess(
      context.prisma,
      ProcessStatus.EM_AVALIACAO,
      intern.id,
    );

    await assert.rejects(
      () =>
        context.cesadStageReadService.getStageReadSnapshot(
          processOutsideCesadWindow.id,
          1,
          authenticatedUser(cesad.id, cesad.role),
        ),
      /CESAD consolidated stage read is only available while process is in EM_ANALISE_CESAD or PARECER_EMITIDO status/,
    );
  } finally {
    await disposeTestContext(context);
  }
}
