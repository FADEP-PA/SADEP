import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  AuditEventType,
  EvaluationAttachmentOrigin,
  ProcessAction,
  ProcessStatus,
  UserRole,
} from '@sadep/contracts';

import { AppConfigService } from '../../config/app-config.service';
import { FilesystemDocumentArtifactStorage } from '../../infrastructure/documents/document-artifact-storage';
import type { EvaluationAttachmentUploadInput } from '../evaluation-attachments/evaluation-attachment-file-validation';
import { EvaluationAttachmentsService } from '../evaluation-attachments/evaluation-attachments.service';
import {
  authenticatedUser,
  createProcess,
  createTestContext,
  createUser,
  disposeTestContext,
} from './test-helpers';

function pdfUpload(name = 'evidencia.pdf', sizeBytes = 64): EvaluationAttachmentUploadInput {
  const buffer = Buffer.alloc(sizeBytes);
  Buffer.from('%PDF-1.7\n').copy(buffer);
  return { originalname: name, mimetype: 'application/pdf', buffer };
}

function pngUpload(name = 'imagem.png', sizeBytes = 64): EvaluationAttachmentUploadInput {
  const buffer = Buffer.alloc(sizeBytes);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer);
  return { originalname: name, mimetype: 'image/png', buffer };
}

function jpegUpload(name = 'foto.jpg', sizeBytes = 64): EvaluationAttachmentUploadInput {
  const buffer = Buffer.alloc(sizeBytes);
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]).copy(buffer);
  return { originalname: name, mimetype: 'image/jpeg', buffer };
}

async function expectRejection(
  operation: Promise<unknown>,
  expectedError: new (...args: never[]) => Error,
  messagePattern: RegExp,
): Promise<void> {
  await assert.rejects(operation, (error: unknown) => {
    assert.ok(
      error instanceof expectedError,
      `expected ${expectedError.name} but received ${String(error)}`,
    );
    assert.match((error as Error).message, messagePattern);
    return true;
  });
}

export async function runEvaluationAttachmentsServiceTests() {
  const context = await createTestContext('evaluation-attachments-service-test');
  const storageRoot = mkdtempSync(path.join(tmpdir(), 'sadep-attachments-'));
  const storage = new FilesystemDocumentArtifactStorage({
    artifactStorageRoot: storageRoot,
  } as unknown as AppConfigService);
  const service = new EvaluationAttachmentsService(
    context.prisma as never,
    context.service,
    storage,
  );
  const { prisma } = context;

  try {
    const intern = await createUser(prisma, UserRole.INTERN_SERVER, 'attach-intern@test.local');
    const supervisor = await createUser(
      prisma,
      UserRole.IMMEDIATE_SUPERVISOR,
      'attach-supervisor@test.local',
    );
    const otherSupervisor = await createUser(
      prisma,
      UserRole.IMMEDIATE_SUPERVISOR,
      'attach-other-supervisor@test.local',
    );
    const otherIntern = await createUser(
      prisma,
      UserRole.INTERN_SERVER,
      'attach-other-intern@test.local',
    );
    const admin = await createUser(prisma, UserRole.ADMIN, 'attach-admin@test.local');

    const internUser = authenticatedUser(intern.id, intern.role);
    const supervisorUser = authenticatedUser(supervisor.id, supervisor.role);
    const otherSupervisorUser = authenticatedUser(otherSupervisor.id, otherSupervisor.role);
    const otherInternUser = authenticatedUser(otherIntern.id, otherIntern.role);
    const adminUser = authenticatedUser(admin.id, admin.role);

    const supervisedProcess = await createProcess(
      prisma,
      ProcessStatus.EM_AVALIACAO,
      intern.id,
      supervisor.id,
    );
    const supervisedStage = await prisma.processStage.findUniqueOrThrow({
      where: {
        evaluationProcessId_sequence: {
          evaluationProcessId: supervisedProcess.id,
          sequence: 1,
        },
      },
    });
    await prisma.supervisorEvaluation.create({
      data: {
        processId: supervisedProcess.id,
        processStageId: supervisedStage.id,
        evaluatorUserId: supervisor.id,
        status: 'DRAFT',
        summary: 'Síntese de teste para anexos.',
        generalComments: 'Comentários de teste para anexos.',
        content: { criteria: [] },
      },
    });

    const unrelatedProcess = await createProcess(
      prisma,
      ProcessStatus.EM_AVALIACAO,
      otherIntern.id,
      otherSupervisor.id,
    );
    const unrelatedStage = await prisma.processStage.findUniqueOrThrow({
      where: {
        evaluationProcessId_sequence: {
          evaluationProcessId: unrelatedProcess.id,
          sequence: 1,
        },
      },
    });

    const notStartedProcess = await createProcess(
      prisma,
      ProcessStatus.EM_AVALIACAO,
      intern.id,
      supervisor.id,
    );

    const selfProcess = await createProcess(
      prisma,
      ProcessStatus.AGUARDANDO_ASSINATURA,
      intern.id,
      supervisor.id,
    );
    const selfStage = await prisma.processStage.findUniqueOrThrow({
      where: {
        evaluationProcessId_sequence: {
          evaluationProcessId: selfProcess.id,
          sequence: 1,
        },
      },
    });
    await prisma.supervisorEvaluation.create({
      data: {
        processId: selfProcess.id,
        processStageId: selfStage.id,
        evaluatorUserId: supervisor.id,
        status: 'SUBMITTED',
        submittedAt: new Date(),
        summary: 'Síntese submetida.',
        generalComments: 'Comentários submetidos.',
        content: { criteria: [] },
      },
    });
    await prisma.selfEvaluation.create({
      data: {
        processId: selfProcess.id,
        processStageId: selfStage.id,
        authorUserId: intern.id,
        status: 'DRAFT',
        selfReflection: 'Reflexão de teste para anexos da autoavaliação.',
      },
    });

    const supervisorOrigin = EvaluationAttachmentOrigin.SUPERVISOR_EVALUATION;
    const selfOrigin = EvaluationAttachmentOrigin.SELF_EVALUATION;

    // --- A. Upload happy path com storage, contrato e auditoria -----------------
    const firstUpload = await service.upload(
      supervisedProcess.id,
      supervisedStage.id,
      supervisorOrigin,
      pdfUpload('evidencia.pdf'),
      supervisorUser,
    );
    assert.equal(firstUpload.attachment.origin, supervisorOrigin);
    assert.equal(firstUpload.attachment.evaluationProcessId, supervisedProcess.id);
    assert.equal(firstUpload.attachment.processStageId, supervisedStage.id);
    assert.equal(firstUpload.attachment.uploaderUserId, supervisor.id);
    assert.equal(firstUpload.attachment.originalFilename, 'evidencia.pdf');
    assert.equal(firstUpload.attachment.mimeType, 'application/pdf');
    assert.equal(firstUpload.attachment.sizeBytes, 64);
    assert.match(firstUpload.attachment.createdAt, /^\d{4}-\d{2}-\d{2}T/);

    const expectedKey = `processes/${supervisedProcess.id}/stages/${supervisedStage.id}/attachments/${firstUpload.attachment.id}`;
    const firstRow = await prisma.evaluationAttachment.findUniqueOrThrow({
      where: { id: firstUpload.attachment.id },
    });
    assert.equal(firstRow.storageKey, expectedKey);
    assert.ok(!firstRow.storageKey.includes('evidencia'));
    assert.ok(existsSync(path.join(storageRoot, expectedKey)));
    assert.deepEqual(readFileSync(path.join(storageRoot, expectedKey)), pdfUpload().buffer);

    const uploadAudit = await prisma.auditEvent.findFirst({
      where: { eventType: AuditEventType.EVALUATION_ATTACHMENT_UPLOADED },
      orderBy: { occurredAt: 'desc' },
    });
    assert.ok(uploadAudit);
    assert.equal(uploadAudit.actorUserId, supervisor.id);
    assert.equal(uploadAudit.actorRole, 'IMMEDIATE_SUPERVISOR');
    assert.equal(uploadAudit.evaluationProcessId, supervisedProcess.id);
    const uploadMetadata = uploadAudit.metadata as Record<string, unknown>;
    assert.equal(uploadMetadata.action, ProcessAction.UPLOAD_EVALUATION_ATTACHMENT);
    assert.equal(uploadMetadata.performedByUserId, supervisor.id);
    assert.equal(uploadMetadata.performedByRole, UserRole.IMMEDIATE_SUPERVISOR);
    assert.equal(uploadMetadata.processStatus, ProcessStatus.EM_AVALIACAO);
    assert.equal(uploadMetadata.origin, supervisorOrigin);
    assert.equal(uploadMetadata.processStageId, supervisedStage.id);
    assert.equal(uploadMetadata.attachmentId, firstUpload.attachment.id);
    assert.equal(uploadMetadata.originalFilename, 'evidencia.pdf');
    assert.equal(uploadMetadata.mimeType, 'application/pdf');
    assert.equal(uploadMetadata.sizeBytes, 64);
    assert.equal(JSON.stringify(uploadAudit.afterState).includes('buffer'), false);

    // --- B. JPEG e PNG aceitos ---------------------------------------------------
    const secondUpload = await service.upload(
      supervisedProcess.id,
      supervisedStage.id,
      supervisorOrigin,
      jpegUpload('foto.jpg'),
      supervisorUser,
    );
    assert.equal(secondUpload.attachment.mimeType, 'image/jpeg');
    const thirdUpload = await service.upload(
      supervisedProcess.id,
      supervisedStage.id,
      supervisorOrigin,
      pngUpload('imagem.png'),
      supervisorUser,
    );
    assert.equal(thirdUpload.attachment.mimeType, 'image/png');

    // --- C. Arquivos inválidos rejeitados ---------------------------------------
    const oversized = pdfUpload('grande.pdf', 10 * 1024 * 1024 + 1);
    await expectRejection(
      service.upload(supervisedProcess.id, supervisedStage.id, supervisorOrigin, oversized, supervisorUser),
      BadRequestException,
      /exceeds the/,
    );
    await expectRejection(
      service.upload(
        supervisedProcess.id,
        supervisedStage.id,
        supervisorOrigin,
        pngUpload('relatorio.pdf'),
        supervisorUser,
      ),
      BadRequestException,
      /file extension does not match/,
    );
    await expectRejection(
      service.upload(
        supervisedProcess.id,
        supervisedStage.id,
        supervisorOrigin,
        { originalname: 'disfarce.pdf', mimetype: 'application/pdf', buffer: pngUpload().buffer },
        supervisorUser,
      ),
      BadRequestException,
      /does not match the file content signature/,
    );
    assert.equal(
      await prisma.evaluationAttachment.count({
        where: { evaluationProcessId: supervisedProcess.id },
      }),
      3,
    );

    // --- D. Papéis e ownership ---------------------------------------------------
    await expectRejection(
      service.upload(supervisedProcess.id, supervisedStage.id, supervisorOrigin, pdfUpload(), internUser),
      ForbiddenException,
      /cannot manipulate supervisor evaluation attachments/,
    );
    await expectRejection(
      service.upload(supervisedProcess.id, supervisedStage.id, supervisorOrigin, pdfUpload(), adminUser),
      ForbiddenException,
      /Role ADMIN cannot manipulate supervisor evaluation attachments/,
    );
    await expectRejection(
      service.upload(
        supervisedProcess.id,
        supervisedStage.id,
        supervisorOrigin,
        pdfUpload(),
        otherSupervisorUser,
      ),
      ForbiddenException,
      /not the responsible supervisor/,
    );
    await expectRejection(
      service.upload(supervisedProcess.id, supervisedStage.id, supervisorOrigin, pdfUpload(), otherInternUser),
      ForbiddenException,
      /cannot manipulate supervisor evaluation attachments/,
    );

    // --- E. Proteção de outro processo (IDOR de etapa) ---------------------------
    await expectRejection(
      service.upload(supervisedProcess.id, unrelatedStage.id, supervisorOrigin, pdfUpload(), supervisorUser),
      NotFoundException,
      /Process stage not found/,
    );
    await expectRejection(
      service.upload(unrelatedProcess.id, supervisedStage.id, supervisorOrigin, pdfUpload(), otherSupervisorUser),
      NotFoundException,
      /Process stage not found/,
    );

    // --- F. Instrumento ainda não iniciado ---------------------------------------
    await expectRejection(
      service.upload(notStartedProcess.id, supervisedStage.id, supervisorOrigin, pdfUpload(), supervisorUser),
      NotFoundException,
      /Process stage not found/,
    );
    const notStartedStage = await prisma.processStage.findUniqueOrThrow({
      where: {
        evaluationProcessId_sequence: {
          evaluationProcessId: notStartedProcess.id,
          sequence: 1,
        },
      },
    });
    await expectRejection(
      service.upload(notStartedProcess.id, notStartedStage.id, supervisorOrigin, pdfUpload(), supervisorUser),
      BadRequestException,
      /has not started yet/,
    );

    // --- G. Contraparte não lê antes da submissão --------------------------------
    await expectRejection(
      service.list(supervisedProcess.id, supervisedStage.id, supervisorOrigin, internUser),
      ForbiddenException,
      /only be read after submission/,
    );
    await expectRejection(
      service.download(
        supervisedProcess.id,
        supervisedStage.id,
        supervisorOrigin,
        firstUpload.attachment.id,
        internUser,
      ),
      ForbiddenException,
      /only be read after submission/,
    );
    await expectRejection(
      service.list(supervisedProcess.id, supervisedStage.id, supervisorOrigin, otherInternUser),
      ForbiddenException,
      /not the evaluated server/,
    );
    await expectRejection(
      service.list(supervisedProcess.id, supervisedStage.id, supervisorOrigin, adminUser),
      ForbiddenException,
      /Role ADMIN cannot read supervisor evaluation attachments/,
    );
    await expectRejection(
      service.list(supervisedProcess.id, supervisedStage.id, supervisorOrigin, otherSupervisorUser),
      ForbiddenException,
      /Role IMMEDIATE_SUPERVISOR cannot read supervisor evaluation attachments/,
    );

    // --- H. Autor lê e baixa enquanto rascunho -----------------------------------
    const supervisorListing = await service.list(
      supervisedProcess.id,
      supervisedStage.id,
      supervisorOrigin,
      supervisorUser,
    );
    assert.equal(supervisorListing.attachments.length, 3);
    const downloaded = await service.download(
      supervisedProcess.id,
      supervisedStage.id,
      supervisorOrigin,
      firstUpload.attachment.id,
      supervisorUser,
    );
    assert.equal(downloaded.filename, 'evidencia.pdf');
    assert.equal(downloaded.mimeType, 'application/pdf');
    assert.deepEqual(downloaded.content, pdfUpload().buffer);

    // --- I. Quota de 5 por instrumento/autor -------------------------------------
    await service.upload(supervisedProcess.id, supervisedStage.id, supervisorOrigin, pdfUpload('quarto.pdf'), supervisorUser);
    await service.upload(supervisedProcess.id, supervisedStage.id, supervisorOrigin, pdfUpload('quinto.pdf'), supervisorUser);
    assert.equal(
      await prisma.evaluationAttachment.count({
        where: { evaluationProcessId: supervisedProcess.id, uploaderUserId: supervisor.id },
      }),
      5,
    );
    await expectRejection(
      service.upload(
        supervisedProcess.id,
        supervisedStage.id,
        supervisorOrigin,
        pdfUpload('sexto.pdf'),
        supervisorUser,
      ),
      BadRequestException,
      /limited to 5 files/,
    );
    assert.equal(
      await prisma.evaluationAttachment.count({
        where: { evaluationProcessId: supervisedProcess.id, uploaderUserId: supervisor.id },
      }),
      5,
    );
    const scopeStorageFiles = readdirSync(
      path.join(
        storageRoot,
        'processes',
        supervisedProcess.id,
        'stages',
        supervisedStage.id,
        'attachments',
      ),
    );
    assert.equal(scopeStorageFiles.length, 5);

    // --- J. Remoção pelo autor enquanto editável ---------------------------------
    const listingBeforeRemoval = await service.list(
      supervisedProcess.id,
      supervisedStage.id,
      supervisorOrigin,
      supervisorUser,
    );
    assert.equal(listingBeforeRemoval.attachments.length, 5);
    const fifthAttachment = listingBeforeRemoval.attachments[4];
    assert.ok(fifthAttachment);
    const removal = await service.remove(
      supervisedProcess.id,
      supervisedStage.id,
      supervisorOrigin,
      fifthAttachment.id,
      supervisorUser,
    );
    assert.deepEqual(removal, { attachmentId: fifthAttachment.id, removed: true });
    assert.equal(
      await prisma.evaluationAttachment.findUnique({ where: { id: fifthAttachment.id } }),
      null,
    );
    assert.equal(existsSync(path.join(storageRoot, expectedKey)), true);
    const fifthKey = `processes/${supervisedProcess.id}/stages/${supervisedStage.id}/attachments/${fifthAttachment.id}`;
    assert.equal(existsSync(path.join(storageRoot, fifthKey)), false);
    const removalAudit = await prisma.auditEvent.findFirst({
      where: { eventType: AuditEventType.EVALUATION_ATTACHMENT_REMOVED },
      orderBy: { occurredAt: 'desc' },
    });
    assert.ok(removalAudit);
    assert.equal(removalAudit.actorUserId, supervisor.id);
    const removalMetadata = removalAudit.metadata as Record<string, unknown>;
    assert.equal(removalMetadata.action, ProcessAction.REMOVE_EVALUATION_ATTACHMENT);
    assert.equal(removalMetadata.attachmentId, fifthAttachment.id);
    const removalBeforeState = removalAudit.beforeState as Record<string, unknown>;
    assert.equal(removalBeforeState.attachmentId, fifthAttachment.id);

    // Slot volta a ficar disponível após a remoção.
    const refillUpload = await service.upload(
      supervisedProcess.id,
      supervisedStage.id,
      supervisorOrigin,
      pdfUpload('reposicao.pdf'),
      supervisorUser,
    );
    assert.equal(refillUpload.attachment.originalFilename, 'reposicao.pdf');

    // --- K. Remoção negada para quem não é o autor -------------------------------
    await expectRejection(
      service.remove(
        supervisedProcess.id,
        supervisedStage.id,
        supervisorOrigin,
        firstUpload.attachment.id,
        internUser,
      ),
      ForbiddenException,
      /cannot manipulate supervisor evaluation attachments/,
    );
    await expectRejection(
      service.remove(
        supervisedProcess.id,
        supervisedStage.id,
        supervisorOrigin,
        firstUpload.attachment.id,
        otherSupervisorUser,
      ),
      ForbiddenException,
      /not the responsible supervisor/,
    );
    await expectRejection(
      service.remove(
        supervisedProcess.id,
        supervisedStage.id,
        supervisorOrigin,
        'attachment-que-nao-existe',
        supervisorUser,
      ),
      NotFoundException,
      /Evaluation attachment not found/,
    );

    // --- L. Após submissão: anexos imutáveis, contraparte lê ----------------------
    await prisma.supervisorEvaluation.update({
      where: { processStageId: supervisedStage.id },
      data: { status: 'SUBMITTED', submittedAt: new Date() },
    });
    await expectRejection(
      service.upload(supervisedProcess.id, supervisedStage.id, supervisorOrigin, pdfUpload('tarde.pdf'), supervisorUser),
      BadRequestException,
      /immutable after submission/,
    );
    await expectRejection(
      service.remove(
        supervisedProcess.id,
        supervisedStage.id,
        supervisorOrigin,
        refillUpload.attachment.id,
        supervisorUser,
      ),
      BadRequestException,
      /immutable after submission/,
    );
    const counterpartListing = await service.list(
      supervisedProcess.id,
      supervisedStage.id,
      supervisorOrigin,
      internUser,
    );
    assert.equal(counterpartListing.attachments.length, 5);
    const counterpartDownload = await service.download(
      supervisedProcess.id,
      supervisedStage.id,
      supervisorOrigin,
      firstUpload.attachment.id,
      internUser,
    );
    assert.deepEqual(counterpartDownload.content, pdfUpload().buffer);
    const authorListingAfterSubmit = await service.list(
      supervisedProcess.id,
      supervisedStage.id,
      supervisorOrigin,
      supervisorUser,
    );
    assert.equal(authorListingAfterSubmit.attachments.length, 5);

    // --- M. Escopo por origem e id -----------------------------------------------
    await expectRejection(
      service.download(
        supervisedProcess.id,
        supervisedStage.id,
        selfOrigin,
        firstUpload.attachment.id,
        internUser,
      ),
      NotFoundException,
      /Evaluation attachment not found/,
    );
    await expectRejection(
      service.download(
        supervisedProcess.id,
        supervisedStage.id,
        supervisorOrigin,
        'attachment-que-nao-existe',
        supervisorUser,
      ),
      NotFoundException,
      /Evaluation attachment not found/,
    );
    await expectRejection(
      service.list(supervisedProcess.id, supervisedStage.id, 'ORIGEM_INVALIDA', supervisorUser),
      BadRequestException,
      /Unsupported evaluation attachment origin/,
    );

    // --- N. Autoavaliação ---------------------------------------------------------
    await expectRejection(
      service.upload(selfProcess.id, selfStage.id, selfOrigin, pdfUpload('contraponto.pdf'), supervisorUser),
      ForbiddenException,
      /cannot manipulate self evaluation attachments/,
    );
    await expectRejection(
      service.upload(selfProcess.id, selfStage.id, selfOrigin, pdfUpload('intruso.pdf'), otherInternUser),
      ForbiddenException,
      /not the evaluated server/,
    );
    const selfUpload = await service.upload(
      selfProcess.id,
      selfStage.id,
      selfOrigin,
      pngUpload('autoavaliacao.png'),
      internUser,
    );
    assert.equal(selfUpload.attachment.origin, selfOrigin);
    assert.equal(selfUpload.attachment.uploaderUserId, intern.id);
    await expectRejection(
      service.list(selfProcess.id, selfStage.id, selfOrigin, supervisorUser),
      ForbiddenException,
      /only be read after submission/,
    );
    await expectRejection(
      service.list(selfProcess.id, selfStage.id, selfOrigin, adminUser),
      ForbiddenException,
      /only be read after submission/,
    );
    const ownSelfListing = await service.list(selfProcess.id, selfStage.id, selfOrigin, internUser);
    assert.equal(ownSelfListing.attachments.length, 1);

    await prisma.selfEvaluation.update({
      where: { processStageId: selfStage.id },
      data: { status: 'SUBMITTED', submittedAt: new Date() },
    });
    await expectRejection(
      service.upload(selfProcess.id, selfStage.id, selfOrigin, pdfUpload('tarde-tambem.pdf'), internUser),
      BadRequestException,
      /immutable after submission/,
    );
    await expectRejection(
      service.remove(selfProcess.id, selfStage.id, selfOrigin, selfUpload.attachment.id, internUser),
      BadRequestException,
      /immutable after submission/,
    );
    const supervisorSelfListing = await service.list(
      selfProcess.id,
      selfStage.id,
      selfOrigin,
      supervisorUser,
    );
    assert.equal(supervisorSelfListing.attachments.length, 1);
    const supervisorSelfDownload = await service.download(
      selfProcess.id,
      selfStage.id,
      selfOrigin,
      selfUpload.attachment.id,
      supervisorUser,
    );
    assert.deepEqual(supervisorSelfDownload.content, pngUpload().buffer);
    const adminSelfListing = await service.list(selfProcess.id, selfStage.id, selfOrigin, adminUser);
    assert.equal(adminSelfListing.attachments.length, 1);
    await expectRejection(
      service.list(selfProcess.id, selfStage.id, selfOrigin, otherSupervisorUser),
      ForbiddenException,
      /not the responsible supervisor/,
    );
    await expectRejection(
      service.list(selfProcess.id, selfStage.id, selfOrigin, otherInternUser),
      ForbiddenException,
      /not the evaluated server/,
    );

    // --- O. Auditoria consistente -------------------------------------------------
    const uploadAuditCount = await prisma.auditEvent.count({
      where: { eventType: AuditEventType.EVALUATION_ATTACHMENT_UPLOADED },
    });
    // A, B, C, quarta, quinta, reposicao (scope supervisionado) + autoavaliacao
    assert.equal(uploadAuditCount, 7);
    const removalAuditCount = await prisma.auditEvent.count({
      where: { eventType: AuditEventType.EVALUATION_ATTACHMENT_REMOVED },
    });
    assert.equal(removalAuditCount, 1);
    const totalAttachments = await prisma.evaluationAttachment.count();
    // 5 no processo supervisionado + 1 na autoavaliação
    assert.equal(totalAttachments, 6);
  } finally {
    rmSync(storageRoot, { recursive: true, force: true });
    await disposeTestContext(context);
  }
}
