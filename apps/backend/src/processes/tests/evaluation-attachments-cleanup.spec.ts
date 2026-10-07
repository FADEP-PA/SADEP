import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  EvaluationAttachmentOrigin,
  ProcessStatus,
  StorageCleanupOrigin,
  StorageCleanupStatus,
  UserRole,
} from '@sadep/contracts';

import { AppConfigService } from '../../config/app-config.service';
import { FilesystemDocumentArtifactStorage } from '../../infrastructure/documents/document-artifact-storage';
import { StorageCleanupService } from '../../infrastructure/storage/storage-cleanup.service';
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

class ControllableStorage {
  private failDelete = false;

  constructor(private readonly inner: FilesystemDocumentArtifactStorage) {}

  setFailDelete(value: boolean): void {
    this.failDelete = value;
  }

  async exists(key: string): Promise<boolean> {
    return this.inner.exists(key);
  }

  async read(key: string): Promise<Buffer> {
    return this.inner.read(key);
  }

  async write(
    key: string,
    content: Buffer,
    mode: 'create' | 'replace',
    contentType?: string,
  ): Promise<void> {
    return this.inner.write(key, content, mode, contentType);
  }

  async delete(key: string): Promise<void> {
    if (this.failDelete) {
      throw new Error('Simulated storage delete failure');
    }
    return this.inner.delete(key);
  }
}

export async function runEvaluationAttachmentsCleanupTests() {
  const context = await createTestContext('evaluation-attachments-cleanup-test');
  const storageRoot = mkdtempSync(path.join(tmpdir(), 'sadep-cleanup-'));
  const fsStorage = new FilesystemDocumentArtifactStorage({
    artifactStorageRoot: storageRoot,
  } as unknown as AppConfigService);
  const storage = new ControllableStorage(fsStorage);

  const config = { artifactStorageDriver: 'filesystem' } as unknown as AppConfigService;
  const cleanupService = new StorageCleanupService(
    context.prisma as never,
    config,
    storage as never,
  );
  const service = new EvaluationAttachmentsService(
    context.prisma as never,
    context.service,
    storage as never,
    cleanupService,
  );
  const { prisma } = context;

  const prismaAny = prisma as unknown as Record<string, unknown>;
  const originalTransaction = prismaAny.$transaction;

  try {
    const intern = await createUser(prisma, UserRole.INTERN_SERVER, 'cleanup-intern@test.local');
    const supervisor = await createUser(
      prisma,
      UserRole.IMMEDIATE_SUPERVISOR,
      'cleanup-supervisor@test.local',
    );
    const internUser = authenticatedUser(intern.id, intern.role);
    const supervisorUser = authenticatedUser(supervisor.id, supervisor.role);

    const process = await createProcess(
      prisma,
      ProcessStatus.EM_AVALIACAO,
      intern.id,
      supervisor.id,
    );
    const stage = await prisma.processStage.findUniqueOrThrow({
      where: {
        evaluationProcessId_sequence: { evaluationProcessId: process.id, sequence: 1 },
      },
    });
    await prisma.supervisorEvaluation.create({
      data: {
        processId: process.id,
        processStageId: stage.id,
        evaluatorUserId: supervisor.id,
        status: 'DRAFT',
        summary: 'Síntese de teste para cleanup.',
        generalComments: 'Comentários de teste para cleanup.',
        content: { criteria: [] },
      },
    });

    const origin = EvaluationAttachmentOrigin.SUPERVISOR_EVALUATION;

    // --- A. Upload happy path: sem registro de cleanup --------------------------------
    const happyUpload = await service.upload(
      process.id,
      stage.id,
      origin,
      pdfUpload('feliz.pdf'),
      supervisorUser,
    );
    const happyKey = `processes/${process.id}/stages/${stage.id}/attachments/${happyUpload.attachment.id}`;
    assert.ok(existsSync(path.join(storageRoot, happyKey)));
    assert.equal(
      await prisma.storageCleanupPending.count({
        where: { storageKey: happyKey },
      }),
      0,
    );

    // --- B. Cenário A: TX falha, compensação com storage.delete OK ---------------------
    prismaAny.$transaction = async () => {
      throw new Error('Simulated transaction failure');
    };
    storage.setFailDelete(false);

    await assert.rejects(
      service.upload(process.id, stage.id, origin, pdfUpload('tx-falha.pdf'), supervisorUser),
      (error: Error) => {
        assert.match(error.message, /Simulated transaction failure/);
        return true;
      },
    );
    // Compensação removeu o blob e NÃO registrou cleanup pendente.
    const txFailUploads = await prisma.evaluationAttachment.findMany({
      where: { originalFilename: 'tx-falha.pdf' },
    });
    assert.equal(txFailUploads.length, 0);
    assert.equal(await prisma.storageCleanupPending.count(), 0);

    prismaAny.$transaction = originalTransaction;

    // --- C. Cenário A: TX falha + storage.delete falha → registro PENDING -------------
    prismaAny.$transaction = async () => {
      throw new Error('Simulated transaction failure');
    };
    storage.setFailDelete(true);

    await assert.rejects(
      service.upload(process.id, stage.id, origin, pdfUpload('duplo-falha.pdf'), supervisorUser),
      (error: Error) => {
        assert.match(error.message, /Simulated transaction failure/);
        return true;
      },
    );
    prismaAny.$transaction = originalTransaction;
    storage.setFailDelete(false);

    const pendingAfterUpload = await prisma.storageCleanupPending.findFirst({
      where: { originContext: StorageCleanupOrigin.UPLOAD_COMPENSATION },
    });
    assert.ok(pendingAfterUpload, 'Expected a PENDING cleanup for upload compensation');
    assert.equal(pendingAfterUpload.status, StorageCleanupStatus.PENDING);
    assert.equal(pendingAfterUpload.originContext, StorageCleanupOrigin.UPLOAD_COMPENSATION);
    assert.equal(pendingAfterStorageKeyExists(pendingAfterUpload.storageKey), true);
    // O blob órfão permanece no storage.
    assert.ok(existsSync(path.join(storageRoot, pendingAfterUpload.storageKey)));
    // Nenhum EvaluationAttachment referencia esta storageKey.
    assert.equal(
      await prisma.evaluationAttachment.findFirst({
        where: { storageKey: pendingAfterUpload.storageKey },
      }),
      null,
    );

    // --- D. Cleanup posterior remove o blob órfão do cenário A -------------------------
    const cleanupA = await cleanupService.processPendingCleanups();
    assert.ok(cleanupA.processed >= 1);
    assert.ok(cleanupA.succeeded >= 1);
    assert.equal(
      existsSync(path.join(storageRoot, pendingAfterUpload.storageKey)),
      false,
      'Blob should be removed after cleanup',
    );
    const completedAfterUpload = await prisma.storageCleanupPending.findUniqueOrThrow({
      where: { id: pendingAfterUpload.id },
    });
    assert.equal(completedAfterUpload.status, StorageCleanupStatus.COMPLETED);

    // --- E. Cenário B: remoção OK, storage.delete falha → registro PENDING ------------
    storage.setFailDelete(false);
    const removalTarget = await service.upload(
      process.id,
      stage.id,
      origin,
      pdfUpload('para-remover.pdf'),
      supervisorUser,
    );
    const removalKey = `processes/${process.id}/stages/${stage.id}/attachments/${removalTarget.attachment.id}`;
    assert.ok(existsSync(path.join(storageRoot, removalKey)));

    storage.setFailDelete(true);
    const removal = await service.remove(
      process.id,
      stage.id,
      origin,
      removalTarget.attachment.id,
      supervisorUser,
    );
    assert.deepEqual(removal, { attachmentId: removalTarget.attachment.id, removed: true });
    storage.setFailDelete(false);

    // Registro lógico removido do banco, mas blob ainda existe.
    assert.equal(
      await prisma.evaluationAttachment.findUnique({
        where: { id: removalTarget.attachment.id },
      }),
      null,
    );
    assert.ok(existsSync(path.join(storageRoot, removalKey)));

    const pendingAfterRemoval = await prisma.storageCleanupPending.findFirst({
      where: { originContext: StorageCleanupOrigin.REMOVAL, storageKey: removalKey },
    });
    assert.ok(pendingAfterRemoval, 'Expected a PENDING cleanup for removal');
    assert.equal(pendingAfterRemoval.status, StorageCleanupStatus.PENDING);
    assert.equal(pendingAfterRemoval.relatedAttachmentId, removalTarget.attachment.id);

    // --- F. Cleanup posterior remove o blob do cenário B -------------------------------
    const cleanupB = await cleanupService.processPendingCleanups();
    assert.ok(cleanupB.processed >= 1);
    assert.equal(
      existsSync(path.join(storageRoot, removalKey)),
      false,
      'Removal blob should be removed after cleanup',
    );
    const completedAfterRemoval = await prisma.storageCleanupPending.findUniqueOrThrow({
      where: { id: pendingAfterRemoval.id },
    });
    assert.equal(completedAfterRemoval.status, StorageCleanupStatus.COMPLETED);

    // --- G. Retry idempotente: processar novamente não causa erro ---------------------
    const cleanupAgain = await cleanupService.processPendingCleanups();
    assert.ok(cleanupAgain.processed >= 0);
    // O registro COMPLETED permanece inalterado.
    const stillCompleted = await prisma.storageCleanupPending.findUniqueOrThrow({
      where: { id: pendingAfterRemoval.id },
    });
    assert.equal(stillCompleted.status, StorageCleanupStatus.COMPLETED);

    // --- H. Segurança: blob ainda referenciado não é apagado --------------------------
    const safeUpload = await service.upload(
      process.id,
      stage.id,
      origin,
      pdfUpload('seguro.pdf'),
      supervisorUser,
    );
    const safeKey = `processes/${process.id}/stages/${stage.id}/attachments/${safeUpload.attachment.id}`;
    assert.ok(existsSync(path.join(storageRoot, safeKey)));

    // Simula um registro de cleanup apontando para um storageKey referenciado.
    await prisma.storageCleanupPending.create({
      data: {
        storageKey: safeKey,
        storageDriver: 'FILESYSTEM',
        originContext: 'REMOVAL',
        errorMessage: 'simulated stale entry',
      },
    });

    const safetyCleanup = await cleanupService.processPendingCleanups();
    assert.ok(safetyCleanup.processed >= 1);
    // O blob referenciado NÃO foi apagado.
    assert.ok(existsSync(path.join(storageRoot, safeKey)), 'Referenced blob must not be deleted');
    const staleRecord = await prisma.storageCleanupPending.findUnique({
      where: { storageKey: safeKey },
    });
    assert.equal(staleRecord?.status, StorageCleanupStatus.COMPLETED);
    // O anexo continua existindo.
    assert.ok(
      await prisma.evaluationAttachment.findUnique({
        where: { id: safeUpload.attachment.id },
      }),
    );

    // --- I. Retry com storage falhando: incrementa retryCount e mantém PENDING --------
    const retryUpload = await service.upload(
      process.id,
      stage.id,
      origin,
      pdfUpload('retry.pdf'),
      supervisorUser,
    );
    const retryKey = `processes/${process.id}/stages/${stage.id}/attachments/${retryUpload.attachment.id}`;

    // Simula registro pendente apontando para inexistente (blob já removido).
    await prisma.storageCleanupPending.create({
      data: {
        storageKey: 'processes/missing/blob-que-nao-existe',
        storageDriver: 'FILESYSTEM',
        originContext: 'REMOVAL',
        errorMessage: 'pre-existing failure',
      },
    });
    // Faz o storage falhar para simular S3/filesystem indisponível.
    storage.setFailDelete(true);
    const failingCleanup = await cleanupService.processPendingCleanups();
    assert.ok(failingCleanup.processed >= 1);
    assert.ok(failingCleanup.failed >= 1);
    storage.setFailDelete(false);

    const retriedRecord = await prisma.storageCleanupPending.findUnique({
      where: { storageKey: 'processes/missing/blob-que-nao-existe' },
    });
    assert.ok(retriedRecord);
    assert.equal(retriedRecord.retryCount, 1);
    assert.equal(retriedRecord.status, StorageCleanupStatus.PENDING);
    assert.ok(retriedRecord.lastRetryAt);

    // --- J. Storage inexistente durante retry: idempotente ----------------------------
    // Remove o registro de retry anterior e cria um novo apontando para key inexistente.
    await prisma.storageCleanupPending.deleteMany({});
    await prisma.storageCleanupPending.create({
      data: {
        storageKey: 'processes/missing/blob-inexistente',
        storageDriver: 'FILESYSTEM',
        originContext: 'REMOVAL',
        errorMessage: 'already gone',
      },
    });
    // Storage funcionando mas o blob não existe: fs.rm force não falha.
    const missingBlobCleanup = await cleanupService.processPendingCleanups();
    assert.equal(missingBlobCleanup.processed, 1);
    assert.equal(missingBlobCleanup.succeeded, 1);
    assert.equal(missingBlobCleanup.failed, 0);
    const missingBlobRecord = await prisma.storageCleanupPending.findFirst({
      where: { storageKey: 'processes/missing/blob-inexistente' },
    });
    assert.equal(missingBlobRecord?.status, StorageCleanupStatus.COMPLETED);

    // --- K. Limpeza final de blob seguro ----------------------------------------------
    storage.setFailDelete(false);
    await service.remove(process.id, stage.id, origin, safeUpload.attachment.id, supervisorUser);
    assert.ok(happyUpload.attachment.id);
    assert.ok(retryUpload.attachment.id);
  } finally {
    prismaAny.$transaction = originalTransaction;
    rmSync(storageRoot, { recursive: true, force: true });
    await disposeTestContext(context);
  }
}

function pendingAfterStorageKeyExists(storageKey: string): boolean {
  // Helper: apenas valida que a string não é vazia.
  return typeof storageKey === 'string' && storageKey.length > 0;
}
