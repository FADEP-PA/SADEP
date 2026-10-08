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
        findMany: jest.fn().mockResolvedValue([{ id: 'document-1' }]),
        findUnique: jest.fn().mockResolvedValue(overrides.document === undefined ? document : overrides.document),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      supervisorEvaluation: { findUnique: jest.fn() },
      selfEvaluation: { findUnique: jest.fn() },
      homologationRecord: { findUnique: jest.fn() },
      cesadFinalOpinion: { findUnique: jest.fn() },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
    } as any;
    const processes = { ensureUserHasProcessAccess: jest.fn().mockResolvedValue(undefined), listForUser: jest.fn().mockResolvedValue({ items: [{ id: 'process-1' }] }) } as any;
    const renderer = overrides.renderer ?? { render: jest.fn().mockResolvedValue(content) };
    const storage = overrides.storage ?? {
      exists: jest.fn().mockResolvedValue(false),
      read: jest.fn().mockResolvedValue(content),
      write: jest.fn().mockResolvedValue(undefined),
    };
    return { service: new ProcessDocumentArtifactService(prisma, processes, renderer as any, storage as any), prisma, processes, renderer: renderer as any, storage: storage as any };
  }

  it('lists historical metadata with the same stage authorization as PDF download without mutations', async () => {
    const supervisor = { ...user, role: UserRole.IMMEDIATE_SUPERVISOR };
    const own = { ...document, documentType: DocumentType.SUPERVISOR_EVALUATION, processStage: { id: 'stage-3', sequence: 3, responsibleSupervisor: { id: user.sub } } };
    const foreign = { ...own, id: 'foreign', processStage: { ...own.processStage, responsibleSupervisor: { id: 'other' } } };
    const { service, prisma, processes, renderer, storage } = setup();
    prisma.processDocument.findMany.mockResolvedValue([{ id: 'document-1' }, { id: 'foreign' }]);
    prisma.processDocument.findUnique.mockResolvedValueOnce(own).mockResolvedValueOnce(foreign);
    await expect(service.listReadableDocuments('process-1', supervisor)).resolves.toEqual([expect.objectContaining({ documentId: 'document-1', stageSequence: 3, version: 1, hasArtifact: false })]);
    expect(processes.listForUser).toHaveBeenCalledWith(supervisor);
    expect(prisma.processDocument.updateMany).not.toHaveBeenCalled();
    expect(renderer.render).not.toHaveBeenCalled(); expect(storage.write).not.toHaveBeenCalled();
  });

  it('rejects document listing without process access', async () => {
    const { service, prisma, processes } = setup();
    processes.ensureUserHasProcessAccess.mockRejectedValue(new ForbiddenException());
    await expect(service.listReadableDocuments('process-1', user)).rejects.toThrow(ForbiddenException);
    expect(prisma.processDocument.findMany).not.toHaveBeenCalled();
  });

  it('exposes persisted chronology and the latest completed signature without writing or generating documents', async () => {
    const signedAt = new Date('2026-10-08T11:00:00Z');
    const generatedAt = new Date('2026-10-08T11:01:00Z');
    const { service, prisma, renderer, storage } = setup({ document: { ...document, artifactGeneratedAt: generatedAt,
      signatureRecords: [{ status: 'COMPLETED', signedAt }, { status: 'COMPLETED', signedAt: new Date('2026-10-08T10:00:00Z') }, { status: 'PENDING', signedAt: new Date('2030-01-01T00:00:00Z') }] } });
    expect(await service.listReadableDocuments('process-1', user)).toEqual([expect.objectContaining({ createdAt: document.createdAt.toISOString(), artifactGeneratedAt: generatedAt.toISOString(), signedAt: signedAt.toISOString() })]);
    expect(prisma.processDocument.updateMany).not.toHaveBeenCalled();
    expect(renderer.render).not.toHaveBeenCalled();
    expect(storage.write).not.toHaveBeenCalled();
  });

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
    const secondDocument = { ...document, artifactPath: key, artifactGeneratedAt: new Date('2026-10-07T12:00:00Z'),
      updatedAt: new Date('2026-10-07T12:00:00Z'), artifactChecksum: require('node:crypto').createHash('sha256').update(content).digest('hex') };
    const storage = { exists: jest.fn().mockResolvedValue(true), read: jest.fn().mockResolvedValue(content), write: jest.fn().mockResolvedValue(undefined) };
    const { service, prisma, renderer } = setup({ storage });
    prisma.processDocument.findUnique.mockResolvedValueOnce(firstDocument).mockResolvedValueOnce(secondDocument);

    await expect(service.materialize('process-1', 'document-1', user)).resolves.toMatchObject({ generated: true });
    await expect(service.materialize('process-1', 'document-1', user)).resolves.toEqual({ documentId: 'document-1', artifactPath: key, generated: false });
    expect(renderer.render).toHaveBeenCalledTimes(2);
    expect(renderer.render.mock.calls[0][0].generatedAt).toEqual(renderer.render.mock.calls[1][0].generatedAt);
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

  it('returns the authoritative frozen artifact without rendering a changed template', async () => {
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

    await expect(service.materializeAfterAuthorizedAction('document-1', user)).resolves.toBeUndefined();
    expect(renderer.render).not.toHaveBeenCalled();
    expect(storage.write).not.toHaveBeenCalled();
    expect(prisma.processDocument.updateMany).not.toHaveBeenCalled();
  });

  it.each([
    [DocumentType.SUPERVISOR_EVALUATION, false], [DocumentType.SUPERVISOR_EVALUATION, true],
    [DocumentType.SELF_EVALUATION, false], [DocumentType.SELF_EVALUATION, true],
    [DocumentType.CESAD_OPINION, false], [DocumentType.CESAD_OPINION, true],
    [DocumentType.RESULT_NOTIFICATION, false], [DocumentType.RESULT_NOTIFICATION, true],
  ])('preserves closed historical %s PDFs and checks integrity (tampered=%s)', async (documentType, tampered) => {
    const key = 'processes/process-1/documents/document-1/v1.pdf';
    const original = Buffer.from('%PDF-1.4 historical stage-four result');
    const closedDocument = {
      ...document, documentType, opinionKind: documentType === DocumentType.CESAD_OPINION ? 'FINAL_CONCLUSIVE' : null,
      evaluationProcess: { ...document.evaluationProcess, status: documentType === DocumentType.RESULT_NOTIFICATION ? 'NOTIFICADO' : 'EM_AVALIACAO' },
      processStageId: 'stage-4', processStage: { id: 'stage-4', sequence: 4, stageCode: 'ETAPA_4' },
      documentStatus: documentType === DocumentType.RESULT_NOTIFICATION ? DocumentStatus.CONSOLIDATED : DocumentStatus.SIGNED, artifactPath: key,
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

  it('materializes and freezes a personal notification using only the valid real acts and final decision', async () => {
    const { service, prisma, renderer } = setup({ document: { ...document, evaluationProcess: { ...document.evaluationProcess, status: 'NOTIFICADO' }, documentType: DocumentType.RESULT_NOTIFICATION, documentStatus: DocumentStatus.CONSOLIDATED } });
    prisma.homologationRecord.findUnique.mockResolvedValue({ homologatedAt: document.createdAt, notifiedAt: document.createdAt,
      homologatedByUser: { name: 'Autoridade real' }, homologationRemarks: 'Homologo o resultado.' });
    prisma.cesadFinalOpinion.findUnique.mockResolvedValue({ status: 'COMPLETED', sentToHomologationAt: document.createdAt, finalResult: 'APTO', finalConcept: 'Bom' });
    await service.materialize('process-1', 'document-1', user);
    expect(renderer.render).toHaveBeenCalledWith(expect.objectContaining({ documentType: DocumentType.RESULT_NOTIFICATION,
      logicalContent: expect.objectContaining({ authorityName: 'Autoridade real', finalResult: 'APTO', finalConcept: 'Bom' }) }));
    expect(prisma.processDocument.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ artifactFrozenAt: expect.any(Date) }) }));
  });

  it('does not render a notification without valid homologation and notification', async () => {
    const { service, prisma, renderer } = setup({ document: { ...document, evaluationProcess: { ...document.evaluationProcess, status: 'NOTIFICADO' }, documentType: DocumentType.RESULT_NOTIFICATION } });
    prisma.homologationRecord.findUnique.mockResolvedValue(null); prisma.cesadFinalOpinion.findUnique.mockResolvedValue(null);
    await expect(service.materialize('process-1', 'document-1', user)).rejects.toThrow(/Valid notified homologation/);
    expect(renderer.render).not.toHaveBeenCalled();
  });

  it('permits the notified owner to read after all stages close, and rejects another server', async () => {
    const key = 'processes/process-1/documents/document-1/v1.pdf';
    const { service, processes } = setup({ document: { ...document, documentType: DocumentType.RESULT_NOTIFICATION,
      evaluationProcess: { ...document.evaluationProcess, status: 'CIENTE' }, artifactPath: key, artifactChecksum: artifactContentHash(content), artifactFrozenAt: new Date() },
      storage: { exists: jest.fn().mockResolvedValue(true), read: jest.fn().mockResolvedValue(content), write: jest.fn() } });
    await expect(service.download('process-1', 'document-1', user)).resolves.toMatchObject({ content });
    expect(processes.ensureUserHasProcessAccess).not.toHaveBeenCalled();
    await expect(service.download('process-1', 'document-1', { ...user, sub: 'other-server' })).rejects.toBeInstanceOf(ForbiddenException);
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
