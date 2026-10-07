import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DocumentStatus, DocumentType, UserRole } from '@sadep/contracts';

import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { ProcessDocumentArtifactService } from './process-document-artifact.service';
import { artifactContentHash } from '../../infrastructure/documents/document-artifact-storage';

describe('ProcessDocumentArtifactService', () => {
  const user: AuthenticatedUser = {
    sub: 'user-1', email: 'user@test.local', name: 'Usuário Teste', role: UserRole.INTERN_SERVER,
  };
  const content = Buffer.from('%PDF-1.4 deterministic');
  const document = {
    id: 'document-1', evaluationProcessId: 'process-1', processStageId: null,
    documentType: DocumentType.ORDINANCE, opinionKind: null,
    documentStatus: DocumentStatus.READY_FOR_SIGNATURE, version: 1,
    artifactPath: null, artifactChecksum: null, artifactGeneratedAt: null,
    createdAt: new Date('2026-10-05T10:00:00.000Z'), updatedAt: new Date('2026-10-05T10:00:00.000Z'),
    evaluationProcess: { id: 'process-1', status: 'EM_AVALIACAO', evaluatedUserId: 'user-1', evaluatedUser: { name: 'Servidor', email: 'server@test.local' } },
    processStage: null,
    signatureRecords: [],
  };

  function setup(overrides: { document?: unknown; renderer?: unknown; storage?: unknown } = {}) {
    const prisma = {
      processDocument: {
        findUnique: jest.fn().mockResolvedValue(overrides.document === undefined ? document : overrides.document),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      supervisorEvaluation: { findUnique: jest.fn() },
      selfEvaluation: { findUnique: jest.fn() },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
    } as any;
    const processes = { ensureUserHasProcessAccess: jest.fn().mockResolvedValue(undefined) } as any;
    const renderer = overrides.renderer ?? { render: jest.fn().mockResolvedValue(content) };
    const storage = overrides.storage ?? {
      exists: jest.fn().mockResolvedValue(false),
      read: jest.fn().mockResolvedValue(content),
      write: jest.fn().mockResolvedValue(undefined),
    };
    return { service: new ProcessDocumentArtifactService(prisma, processes, renderer as any, storage as any), prisma, processes, renderer: renderer as any, storage: storage as any };
  }

  it('persists the artifact before linking artifactPath and audits the materialization', async () => {
    const { service, prisma, renderer, storage } = setup();

    const result = await service.materialize('process-1', 'document-1', user);

    expect(result).toEqual({ documentId: 'document-1', artifactPath: 'processes/process-1/documents/document-1/v1.pdf', generated: true });
    expect(renderer.render).toHaveBeenCalledTimes(1);
    expect(storage.write).toHaveBeenCalledWith(expect.stringContaining('/documents/document-1/v1.pdf'), content, 'create');
    expect(prisma.processDocument.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ artifactPath: 'processes/process-1/documents/document-1/v1.pdf' }),
    }));
    expect(prisma.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ eventType: 'DOCUMENT_ARTIFACT_GENERATED' }) }));
  });

  it('does not update ProcessDocument when rendering fails', async () => {
    const renderer = { render: jest.fn().mockRejectedValue(new Error('renderer failed')) };
    const { service, prisma } = setup({ renderer });

    await expect(service.materialize('process-1', 'document-1', user)).rejects.toThrow('renderer failed');
    expect(prisma.processDocument.updateMany).not.toHaveBeenCalled();
    expect(prisma.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ eventType: 'DOCUMENT_ARTIFACT_GENERATION_FAILED' }) }));
  });

  it('does not update ProcessDocument when storage fails', async () => {
    const storage = { exists: jest.fn().mockResolvedValue(false), read: jest.fn(), write: jest.fn().mockRejectedValue(new Error('storage failed')) };
    const { service, prisma } = setup({ storage });

    await expect(service.materialize('process-1', 'document-1', user)).rejects.toThrow('storage failed');
    expect(prisma.processDocument.updateMany).not.toHaveBeenCalled();
  });

  it('recovers on retry after a transient storage write failure', async () => {
    const storage = {
      exists: jest.fn().mockResolvedValue(false),
      read: jest.fn(),
      write: jest.fn()
        .mockRejectedValueOnce(new Error('temporary storage failure'))
        .mockResolvedValueOnce(undefined),
    };
    const { service, prisma } = setup({ storage });

    await expect(service.materialize('process-1', 'document-1', user)).rejects.toThrow('temporary storage failure');
    await expect(service.materialize('process-1', 'document-1', user)).resolves.toMatchObject({ generated: true });

    expect(storage.write).toHaveBeenCalledTimes(2);
    expect(prisma.processDocument.updateMany).toHaveBeenCalledTimes(1);
  });

  it('is idempotent when retry sees the same persisted artifact', async () => {
    const key = 'processes/process-1/documents/document-1/v1.pdf';
    const firstDocument = document;
    const secondDocument = { ...document, artifactPath: key, artifactChecksum: require('node:crypto').createHash('sha256').update(content).digest('hex') };
    const storage = { exists: jest.fn().mockResolvedValue(true), read: jest.fn().mockResolvedValue(content), write: jest.fn().mockResolvedValue(undefined) };
    const { service, prisma, renderer } = setup({ storage });
    prisma.processDocument.findUnique.mockResolvedValueOnce(firstDocument).mockResolvedValueOnce(secondDocument);

    await expect(service.materialize('process-1', 'document-1', user)).resolves.toMatchObject({ generated: true });
    await expect(service.materialize('process-1', 'document-1', user)).resolves.toEqual({ documentId: 'document-1', artifactPath: key, generated: false });
    expect(renderer.render).toHaveBeenCalledTimes(2);
    expect(storage.write).toHaveBeenCalledTimes(1);
  });

  it('replaces a pre-signature artifact after the last signature and freezes the final PDF', async () => {
    const key = 'processes/process-1/documents/document-1/v1.pdf';
    const pendingContent = Buffer.from('%PDF-1.4 pending signature');
    const finalContent = Buffer.from('%PDF-1.4 all signatures completed');
    const signedDocument = {
      ...document,
      documentStatus: DocumentStatus.SIGNED,
      artifactPath: key,
      artifactChecksum: artifactContentHash(pendingContent),
      artifactFrozenAt: null,
    };
    const storage = {
      exists: jest.fn().mockResolvedValue(true),
      read: jest.fn().mockResolvedValue(pendingContent),
      write: jest.fn().mockResolvedValue(undefined),
    };
    const renderer = { render: jest.fn().mockResolvedValue(finalContent) };
    const { service, prisma } = setup({ document: signedDocument, renderer, storage });

    await expect(service.materializeAfterAuthorizedAction('document-1', user)).resolves.toBeUndefined();

    expect(storage.write).toHaveBeenCalledWith(key, finalContent, 'replace');
    expect(prisma.processDocument.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        artifactChecksum: artifactContentHash(finalContent),
        artifactFrozenAt: expect.any(Date),
      }),
    }));
  });

  it('rejects a changed signed artifact after it has been frozen', async () => {
    const key = 'processes/process-1/documents/document-1/v1.pdf';
    const currentContent = Buffer.from('%PDF-1.4 final');
    const signedDocument = {
      ...document,
      documentStatus: DocumentStatus.SIGNED,
      artifactPath: key,
      artifactChecksum: artifactContentHash(currentContent),
      artifactFrozenAt: new Date('2026-10-06T12:00:00.000Z'),
    };
    const storage = {
      exists: jest.fn().mockResolvedValue(true),
      read: jest.fn().mockResolvedValue(currentContent),
      write: jest.fn().mockResolvedValue(undefined),
    };
    const renderer = { render: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.4 changed')) };
    const { service, prisma } = setup({ document: signedDocument, renderer, storage });

    await expect(service.materializeAfterAuthorizedAction('document-1', user)).rejects.toBeInstanceOf(ForbiddenException);
    expect(storage.write).not.toHaveBeenCalled();
    expect(prisma.processDocument.updateMany).not.toHaveBeenCalled();
  });

  it.each([false, true])('preserves closed historical stage-four PDFs and checks stored integrity (tampered=%s)', async (tampered) => {
    const key = 'processes/process-1/documents/document-1/v1.pdf';
    const original = Buffer.from('%PDF-1.4 historical stage-four result');
    const closedDocument = {
      ...document, documentType: DocumentType.SUPERVISOR_EVALUATION,
      processStageId: 'stage-4', processStage: { id: 'stage-4', sequence: 4, stageCode: 'ETAPA_4' },
      documentStatus: DocumentStatus.SIGNED, artifactPath: key,
      artifactChecksum: artifactContentHash(original), artifactFrozenAt: new Date('2026-10-06T12:00:00.000Z'),
    };
    const storage = { exists: jest.fn().mockResolvedValue(true), read: jest.fn().mockResolvedValue(tampered ? Buffer.from('%PDF-1.4 tampered') : original), write: jest.fn() };
    const { service, prisma, renderer } = setup({ document: closedDocument, storage });
    if (tampered) await expect(service.materialize('process-1', 'document-1', user)).rejects.toThrow(/checksum mismatch/);
    else {
      await expect(service.materialize('process-1', 'document-1', user)).resolves.toMatchObject({ generated: false });
      expect((await service.download('process-1', 'document-1', user)).content).toEqual(original);
    }
    expect(renderer.render).not.toHaveBeenCalled();
    expect(storage.write).not.toHaveBeenCalled();
    expect(prisma.processDocument.updateMany).not.toHaveBeenCalled();
  });

  it('passes the real stage sequence to the PDF renderer for new evaluations', async () => {
    const { service, prisma, renderer } = setup({ document: {
      ...document, documentType: DocumentType.SUPERVISOR_EVALUATION,
      processStageId: 'stage-4', processStage: { id: 'stage-4', sequence: 4, stageCode: 'ETAPA_4' },
    } });
    prisma.supervisorEvaluation.findUnique.mockResolvedValue({ summary: 'Resumo', generalComments: 'Observação', content: { criteria: [] }, status: 'SUBMITTED', submittedAt: new Date('2026-10-07T12:00:00.000Z') });
    await service.materialize('process-1', 'document-1', user);
    expect(renderer.render).toHaveBeenCalledWith(expect.objectContaining({ stageSequence: 4 }));
  });

  it('repairs a signed artifact whose storage write succeeded before the DB link was committed', async () => {
    const key = 'processes/process-1/documents/document-1/v1.pdf';
    const finalContent = Buffer.from('%PDF-1.4 all signatures completed');
    const signedDocument = {
      ...document,
      documentStatus: DocumentStatus.SIGNED,
      artifactPath: key,
      artifactChecksum: artifactContentHash(Buffer.from('%PDF-1.4 pending signature')),
      artifactFrozenAt: null,
    };
    const storage = {
      exists: jest.fn().mockResolvedValue(true),
      read: jest.fn().mockResolvedValue(finalContent),
      write: jest.fn().mockResolvedValue(undefined),
    };
    const renderer = { render: jest.fn().mockResolvedValue(finalContent) };
    const { service, prisma } = setup({ document: signedDocument, renderer, storage });

    await expect(service.materializeAfterAuthorizedAction('document-1', user)).resolves.toBeUndefined();
    expect(storage.write).toHaveBeenCalledWith(key, finalContent, 'replace');
    expect(prisma.processDocument.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ artifactChecksum: artifactContentHash(finalContent) }),
    }));
  });

  it('detects physical tampering before trusting the persisted checksum', async () => {
    const key = 'processes/process-1/documents/document-1/v1.pdf';
    const persistedContent = Buffer.from('%PDF-1.4 persisted');
    const tamperedContent = Buffer.from('%PDF-1.4 tampered');
    const documentWithChecksum = {
      ...document,
      artifactPath: key,
      artifactChecksum: artifactContentHash(persistedContent),
    };
    const storage = {
      exists: jest.fn().mockResolvedValue(true),
      read: jest.fn().mockResolvedValue(tamperedContent),
      write: jest.fn().mockResolvedValue(undefined),
    };
    const { service, prisma } = setup({ document: documentWithChecksum, storage });

    await expect(service.materialize('process-1', 'document-1', user)).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.write).not.toHaveBeenCalled();
    expect(prisma.processDocument.updateMany).not.toHaveBeenCalled();
  });

  it('rejects a document from another process before authorization or rendering', async () => {
    const { service, processes, renderer } = setup();

    await expect(service.materialize('other-process', 'document-1', user)).rejects.toBeInstanceOf(NotFoundException);
    expect(processes.ensureUserHasProcessAccess).not.toHaveBeenCalled();
    expect(renderer.render).not.toHaveBeenCalled();
  });

  it('does not render for an unauthorized process reader', async () => {
    const { service, processes, renderer } = setup();
    processes.ensureUserHasProcessAccess.mockRejectedValue(new ForbiddenException());

    await expect(service.materialize('process-1', 'document-1', user)).rejects.toBeInstanceOf(ForbiddenException);
    expect(renderer.render).not.toHaveBeenCalled();
  });

  it('returns 404 when the logical document does not exist', async () => {
    const { service } = setup({ document: null });

    await expect(service.materialize('process-1', 'missing', user)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('requires an existing artifact for download', async () => {
    const { service, storage } = setup();
    storage.exists.mockResolvedValue(false);

    await expect(service.download('process-1', 'document-1', user)).rejects.toBeInstanceOf(NotFoundException);
    expect(storage.read).not.toHaveBeenCalled();
  });
});
