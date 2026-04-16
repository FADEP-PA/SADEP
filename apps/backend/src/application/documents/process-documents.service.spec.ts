import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  SignatureStatus as PrismaSignatureStatus,
  UserRole as PrismaUserRole,
} from '@prisma/client';
import {
  DocumentStatus,
  DocumentType,
  SignatureStatus,
  UserRole,
} from '@aep-pa/contracts';

import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ProcessesService } from '../../processes/processes.service';
import { ProcessDocumentsService } from './process-documents.service';

describe('ProcessDocumentsService', () => {
  let service: ProcessDocumentsService;
  let prismaService: jest.Mocked<PrismaService>;
  let processesService: jest.Mocked<ProcessesService>;

  const stageId = 'stage-123';
  const stageMetadata = {
    id: stageId,
    sequence: 1,
    stageCode: 'ETAPA_1',
  };
  const supervisorUser: AuthenticatedUser = {
    sub: 'supervisor-123',
    email: 'supervisor@test.local',
    role: UserRole.IMMEDIATE_SUPERVISOR,
  };
  const internUser: AuthenticatedUser = {
    sub: 'intern-123',
    email: 'intern@test.local',
    role: UserRole.INTERN_SERVER,
  };

  beforeEach(() => {
    prismaService = {
      $transaction: jest.fn(),
    } as unknown as jest.Mocked<PrismaService>;

    processesService = {
      findProcessOrThrow: jest.fn(),
      resolveCurrentStageOrThrow: jest.fn(),
    } as unknown as jest.Mocked<ProcessesService>;

    service = new ProcessDocumentsService(prismaService, processesService);
  });

  describe('ensureSupervisorEvaluationDocument', () => {
    it('creates the document and audits only the real creation', async () => {
      const transaction = {
        processStage: {
          findUnique: jest.fn().mockResolvedValue(stageMetadata),
        },
        processDocument: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'doc-123' }),
        },
        auditEvent: {
          create: jest.fn().mockResolvedValue({}),
        },
      } as any;

      const result = await service.ensureSupervisorEvaluationDocument(
        transaction,
        'process-123',
        stageId,
        supervisorUser,
      );

      expect(result).toEqual({ documentId: 'doc-123' });
      expect(transaction.processDocument.create).toHaveBeenCalledWith({
        data: {
          evaluationProcessId: 'process-123',
          processStageId: stageId,
          documentType: 'SUPERVISOR_EVALUATION',
          documentStatus: 'READY_FOR_SIGNATURE',
          artifactPath: null,
        },
      });
      expect(transaction.auditEvent.create).toHaveBeenCalledTimes(1);
      expect(transaction.auditEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          evaluationProcessId: 'process-123',
          eventType: 'DOCUMENT_GENERATED',
          metadata: expect.objectContaining({
            origin: 'PROCESS_DOCUMENT',
            processStageId: stageId,
            stageSequence: 1,
            stageCode: 'ETAPA_1',
            documentId: 'doc-123',
            documentType: 'SUPERVISOR_EVALUATION',
          }),
        }),
      });
    });

    it('returns the existing document without duplicating document creation audit', async () => {
      const transaction = {
        processStage: {
          findUnique: jest.fn().mockResolvedValue(stageMetadata),
        },
        processDocument: {
          findFirst: jest.fn().mockResolvedValue({ id: 'doc-123' }),
          create: jest.fn(),
        },
        auditEvent: {
          create: jest.fn(),
        },
      } as any;

      const result = await service.ensureSupervisorEvaluationDocument(
        transaction,
        'process-123',
        stageId,
        supervisorUser,
      );

      expect(result).toEqual({ documentId: 'doc-123' });
      expect(transaction.processDocument.create).not.toHaveBeenCalled();
      expect(transaction.auditEvent.create).not.toHaveBeenCalled();
    });

    it('returns the existing document after a P2002 retry path without emitting a misleading generation audit', async () => {
      const transaction = {
        processStage: {
          findUnique: jest.fn().mockResolvedValue(stageMetadata),
        },
        processDocument: {
          findFirst: jest
            .fn()
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ id: 'doc-123' }),
          create: jest.fn().mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError(
              'Unique constraint failed',
              {
                code: 'P2002',
                clientVersion: '6.19.2',
              },
            ),
          ),
        },
        auditEvent: {
          create: jest.fn(),
        },
      } as any;

      const result = await service.ensureSupervisorEvaluationDocument(
        transaction,
        'process-123',
        stageId,
        supervisorUser,
      );

      expect(result).toEqual({ documentId: 'doc-123' });
      expect(transaction.processDocument.findFirst).toHaveBeenCalledTimes(2);
      expect(transaction.auditEvent.create).not.toHaveBeenCalled();
    });
  });

  describe('createSupervisorEvaluationSignatures', () => {
    it('creates the missing signature records and preserves the required audit trail', async () => {
      const transaction = {
        processStage: {
          findUnique: jest.fn().mockResolvedValue(stageMetadata),
        },
        signatureRecord: {
          create: jest.fn().mockResolvedValue({}),
          findFirst: jest.fn(),
        },
        auditEvent: {
          create: jest.fn().mockResolvedValue({}),
        },
      } as any;

      await service.createSupervisorEvaluationSignatures(
        transaction,
        'process-123',
        stageId,
        'doc-123',
        supervisorUser.sub,
        internUser.sub,
        supervisorUser,
      );

      expect(transaction.signatureRecord.create).toHaveBeenCalledTimes(2);
      expect(transaction.signatureRecord.create).toHaveBeenNthCalledWith(1, {
        data: {
          processDocumentId: 'doc-123',
          signatoryUserId: supervisorUser.sub,
          signatoryRole: 'IMMEDIATE_SUPERVISOR',
          provider: 'INTERNAL',
          status: 'COMPLETED',
          signedAt: expect.any(Date),
        },
      });
      expect(transaction.signatureRecord.create).toHaveBeenNthCalledWith(2, {
        data: {
          processDocumentId: 'doc-123',
          signatoryUserId: internUser.sub,
          signatoryRole: 'INTERN_SERVER',
          provider: 'INTERNAL',
          status: 'PENDING',
        },
      });
      expect(transaction.signatureRecord.findFirst).not.toHaveBeenCalled();
      expect(transaction.auditEvent.create).toHaveBeenCalledTimes(2);
      expect(transaction.auditEvent.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'DOCUMENT_SIGNED',
            metadata: expect.objectContaining({
              documentId: 'doc-123',
              processStageId: stageId,
              signatoryRole: 'IMMEDIATE_SUPERVISOR',
              signatoryUserId: supervisorUser.sub,
            }),
          }),
        }),
      );
      expect(transaction.auditEvent.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'SIGNATURE_REQUESTED',
            metadata: expect.objectContaining({
              documentId: 'doc-123',
              processStageId: stageId,
              signatoryRole: 'INTERN_SERVER',
              signatoryUserId: internUser.sub,
            }),
          }),
        }),
      );
    });

    it('is idempotent when both signature records already exist', async () => {
      const transaction = {
        processStage: {
          findUnique: jest.fn().mockResolvedValue(stageMetadata),
        },
        signatureRecord: {
          create: jest
            .fn()
            .mockRejectedValueOnce(
              new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
                code: 'P2002',
                clientVersion: '6.19.2',
              }),
            )
            .mockRejectedValueOnce(
              new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
                code: 'P2002',
                clientVersion: '6.19.2',
              }),
            ),
          findFirst: jest
            .fn()
            .mockResolvedValueOnce({
              signatoryRole: PrismaUserRole.IMMEDIATE_SUPERVISOR,
              signatoryUserId: supervisorUser.sub,
            })
            .mockResolvedValueOnce({
              signatoryRole: PrismaUserRole.INTERN_SERVER,
              signatoryUserId: internUser.sub,
            }),
        },
        auditEvent: {
          create: jest.fn(),
        },
      } as any;

      await service.createSupervisorEvaluationSignatures(
        transaction,
        'process-123',
        stageId,
        'doc-123',
        supervisorUser.sub,
        internUser.sub,
        supervisorUser,
      );

      expect(transaction.signatureRecord.create).toHaveBeenCalledTimes(2);
      expect(transaction.signatureRecord.findFirst).toHaveBeenNthCalledWith(1, {
        where: {
          processDocumentId: 'doc-123',
          signatoryRole: 'IMMEDIATE_SUPERVISOR',
        },
      });
      expect(transaction.signatureRecord.findFirst).toHaveBeenNthCalledWith(2, {
        where: {
          processDocumentId: 'doc-123',
          signatoryRole: 'INTERN_SERVER',
        },
      });
      expect(transaction.auditEvent.create).not.toHaveBeenCalled();
    });

    it('fails fast when the existing signature for the same document and role belongs to a different user', async () => {
      const transaction = {
        processStage: {
          findUnique: jest.fn().mockResolvedValue(stageMetadata),
        },
        signatureRecord: {
          create: jest.fn().mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
              code: 'P2002',
              clientVersion: '6.19.2',
            }),
          ),
          findFirst: jest.fn().mockResolvedValue({
            signatoryRole: PrismaUserRole.IMMEDIATE_SUPERVISOR,
            signatoryUserId: 'other-supervisor',
          }),
        },
        auditEvent: {
          create: jest.fn(),
        },
      } as any;

      await expect(
        service.createSupervisorEvaluationSignatures(
          transaction,
          'process-123',
          stageId,
          'doc-123',
          supervisorUser.sub,
          internUser.sub,
          supervisorUser,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(transaction.auditEvent.create).not.toHaveBeenCalled();
    });
  });

  describe('createSelfEvaluationSignatures', () => {
    it('creates the missing self evaluation signatures with the expected states', async () => {
      const transaction = {
        processStage: {
          findUnique: jest.fn().mockResolvedValue(stageMetadata),
        },
        signatureRecord: {
          create: jest.fn().mockResolvedValue({}),
          findFirst: jest.fn(),
        },
        auditEvent: {
          create: jest.fn().mockResolvedValue({}),
        },
      } as any;

      await service.createSelfEvaluationSignatures(
        transaction,
        'process-123',
        stageId,
        'doc-self-123',
        internUser.sub,
        supervisorUser.sub,
        internUser,
      );

      expect(transaction.signatureRecord.create).toHaveBeenCalledTimes(2);
      expect(transaction.signatureRecord.create).toHaveBeenNthCalledWith(1, {
        data: {
          processDocumentId: 'doc-self-123',
          signatoryUserId: internUser.sub,
          signatoryRole: 'INTERN_SERVER',
          provider: 'INTERNAL',
          status: 'COMPLETED',
          signedAt: expect.any(Date),
        },
      });
      expect(transaction.signatureRecord.create).toHaveBeenNthCalledWith(2, {
        data: {
          processDocumentId: 'doc-self-123',
          signatoryUserId: supervisorUser.sub,
          signatoryRole: 'IMMEDIATE_SUPERVISOR',
          provider: 'INTERNAL',
          status: 'PENDING',
        },
      });
      expect(transaction.auditEvent.create).toHaveBeenCalledTimes(2);
      expect(transaction.auditEvent.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'DOCUMENT_SIGNED',
            metadata: expect.objectContaining({
              documentId: 'doc-self-123',
              signatoryRole: 'INTERN_SERVER',
              signatoryUserId: internUser.sub,
            }),
          }),
        }),
      );
      expect(transaction.auditEvent.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'SIGNATURE_REQUESTED',
            metadata: expect.objectContaining({
              documentId: 'doc-self-123',
              signatoryRole: 'IMMEDIATE_SUPERVISOR',
              signatoryUserId: supervisorUser.sub,
            }),
          }),
        }),
      );
    });
  });

  describe('signSupervisorEvaluationDocument', () => {
    function mockTransactionForSigning(overrides?: {
      process?: Record<string, unknown>;
      document?: Record<string, unknown> | null;
      allSignatureStatuses?: PrismaSignatureStatus[];
    }) {
      const process = {
        id: 'process-123',
        status: 'AGUARDANDO_ASSINATURA',
        evaluatedUserId: internUser.sub,
        ...overrides?.process,
      };
      const document = overrides?.document === undefined ? {
        id: 'doc-123',
        signatureRecords: [
          {
            id: 'sig-1',
            signatoryUserId: internUser.sub,
            signatoryRole: 'INTERN_SERVER',
            status: 'PENDING',
          },
        ],
      } : overrides.document;

      const transaction = {
        processDocument: {
          findFirst: jest.fn().mockResolvedValue(document),
          update: jest.fn().mockResolvedValue({}),
        },
        signatureRecord: {
          findMany: jest.fn().mockResolvedValue(
            (overrides?.allSignatureStatuses ?? [
              PrismaSignatureStatus.COMPLETED,
              PrismaSignatureStatus.COMPLETED,
            ]).map((status) => ({ status })),
          ),
          update: jest.fn().mockResolvedValue({}),
        },
        auditEvent: {
          create: jest.fn().mockResolvedValue({}),
        },
      } as any;

      processesService.resolveCurrentStageOrThrow.mockResolvedValue(stageMetadata as any);
      processesService.findProcessOrThrow.mockResolvedValue(process as any);
      prismaService.$transaction.mockImplementation(
        async (callback: (tx: any) => Promise<unknown>) => callback(transaction),
      );

      return transaction;
    }

    it('signs the pending intern signature and closes the document when all signatures are complete', async () => {
      const transaction = mockTransactionForSigning();

      await service.signSupervisorEvaluationDocument('process-123', internUser);

      expect(processesService.resolveCurrentStageOrThrow).toHaveBeenCalledWith(
        expect.any(Object),
        'process-123',
      );
      expect(transaction.processDocument.findFirst).toHaveBeenCalledWith({
        where: {
          evaluationProcessId: 'process-123',
          processStageId: stageId,
          documentType: 'SUPERVISOR_EVALUATION',
        },
        include: {
          signatureRecords: true,
        },
      });
      expect(transaction.signatureRecord.update).toHaveBeenCalledWith({
        where: { id: 'sig-1' },
        data: {
          status: 'COMPLETED',
          signedAt: expect.any(Date),
        },
      });
      expect(transaction.processDocument.update).toHaveBeenCalledWith({
        where: { id: 'doc-123' },
        data: { documentStatus: 'SIGNED' },
      });
      expect(transaction.auditEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'DOCUMENT_SIGNED',
          metadata: expect.objectContaining({
            processStageId: stageId,
            signatoryRole: 'INTERN_SERVER',
            signatoryUserId: internUser.sub,
          }),
        }),
      });
    });

    it('keeps the process contract explicit by rejecting non-INTERN_SERVER signers', async () => {
      mockTransactionForSigning();

      await expect(
        service.signSupervisorEvaluationDocument('process-123', supervisorUser),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.signSupervisorEvaluationDocument('process-123', supervisorUser),
      ).rejects.toThrow('Only INTERN_SERVER can sign supervisor evaluation document');
    });

    it('rejects intern signatures when the authenticated user is not the evaluated server', async () => {
      mockTransactionForSigning({
        process: {
          evaluatedUserId: 'intern-999',
        },
      });

      await expect(
        service.signSupervisorEvaluationDocument('process-123', internUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects signing when the process is outside AGUARDANDO_ASSINATURA', async () => {
      mockTransactionForSigning({
        process: {
          status: 'EM_AVALIACAO',
        },
      });

      await expect(
        service.signSupervisorEvaluationDocument('process-123', internUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects signing when the document does not exist', async () => {
      mockTransactionForSigning({
        document: null,
      });

      await expect(
        service.signSupervisorEvaluationDocument('process-123', internUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects signing when there is no pending signature for the authenticated intern', async () => {
      mockTransactionForSigning({
        document: {
          id: 'doc-123',
          signatureRecords: [
            {
              id: 'sig-1',
              signatoryUserId: internUser.sub,
              signatoryRole: 'INTERN_SERVER',
              status: 'COMPLETED',
            },
          ],
        },
      });

      await expect(
        service.signSupervisorEvaluationDocument('process-123', internUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSupervisorEvaluationDocumentContext', () => {
    it('returns the stable documentContext shape expected by GET /processes/:id/supervisor-evaluation', async () => {
      const transaction = {
        processDocument: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'doc-123',
            documentType: 'SUPERVISOR_EVALUATION',
            documentStatus: 'READY_FOR_SIGNATURE',
            artifactPath: '',
            signatureRecords: [
              {
                signatoryRole: 'IMMEDIATE_SUPERVISOR',
                status: 'COMPLETED',
                signedAt: new Date('2023-01-01T00:00:00.000Z'),
              },
              {
                signatoryRole: 'INTERN_SERVER',
                status: 'PENDING',
                signedAt: null,
              },
            ],
          }),
        },
      } as any;

      const result = await service.getSupervisorEvaluationDocumentContext(
        transaction,
        'process-123',
        stageId,
      );

      expect(transaction.processDocument.findFirst).toHaveBeenCalledWith({
        where: {
          evaluationProcessId: 'process-123',
          processStageId: stageId,
          documentType: 'SUPERVISOR_EVALUATION',
        },
        include: {
          signatureRecords: true,
        },
      });
      expect(result).toEqual({
        documentId: 'doc-123',
        documentType: DocumentType.SUPERVISOR_EVALUATION,
        documentStatus: DocumentStatus.READY_FOR_SIGNATURE,
        hasArtifact: false,
        artifactPath: null,
        signatures: [
          {
            signatoryRole: UserRole.IMMEDIATE_SUPERVISOR,
            status: SignatureStatus.COMPLETED,
            signedAt: '2023-01-01T00:00:00.000Z',
          },
          {
            signatoryRole: UserRole.INTERN_SERVER,
            status: SignatureStatus.PENDING,
            signedAt: null,
          },
        ],
        internSignaturePending: true,
      });
    });

    it('returns null when no supervisor evaluation document exists', async () => {
      const transaction = {
        processDocument: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      } as any;

      await expect(
        service.getSupervisorEvaluationDocumentContext(transaction, 'process-123', stageId),
      ).resolves.toBeNull();
    });
  });

  describe('canRectifySupervisorEvaluation', () => {
    it('allows rectification when no document exists yet', async () => {
      const transaction = {
        processDocument: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      } as any;

      await expect(
        service.canRectifySupervisorEvaluation(transaction, 'process-123', stageId),
      ).resolves.toBe(true);
    });

    it('allows rectification before the intern completes the signature', async () => {
      const transaction = {
        processDocument: {
          findFirst: jest.fn().mockResolvedValue({
            signatureRecords: [
              {
                signatoryRole: 'INTERN_SERVER',
                status: 'PENDING',
              },
            ],
          }),
        },
      } as any;

      await expect(
        service.canRectifySupervisorEvaluation(transaction, 'process-123', stageId),
      ).resolves.toBe(true);
    });

    it('blocks rectification after the intern signature is completed', async () => {
      const transaction = {
        processDocument: {
          findFirst: jest.fn().mockResolvedValue({
            signatureRecords: [
              {
                signatoryRole: 'INTERN_SERVER',
                status: 'COMPLETED',
              },
            ],
          }),
        },
      } as any;

      await expect(
        service.canRectifySupervisorEvaluation(transaction, 'process-123', stageId),
      ).resolves.toBe(false);
    });
  });
});
