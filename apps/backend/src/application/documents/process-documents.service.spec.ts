import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  UserRole as PrismaUserRole,
  SignatureStatus as PrismaSignatureStatus,
} from '@prisma/client';
import {
  DocumentStatus,
  DocumentType,
  SignatureStatus,
  UserRole,
} from '@aep-pa/contracts';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ProcessesService } from '../../processes/processes.service';
import { ProcessDocumentsService } from './process-documents.service';

describe('ProcessDocumentsService', () => {
  let service: ProcessDocumentsService;
  let prismaService: jest.Mocked<PrismaService>;
  let processesService: jest.Mocked<ProcessesService>;

  const mockSupervisorUser = {
    sub: 'supervisor-123',
    email: 'supervisor@test.local',
    role: UserRole.IMMEDIATE_SUPERVISOR,
  };

  const mockInternUser = {
    sub: 'intern-123',
    email: 'intern@test.local',
    role: UserRole.INTERN_SERVER,
  };

  let mockTransaction: Record<string, any>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessDocumentsService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn(),
          },
        },
        {
          provide: ProcessesService,
          useValue: {
            findProcessOrThrow: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProcessDocumentsService>(ProcessDocumentsService);
    prismaService = module.get(PrismaService);
    processesService = module.get(ProcessesService);
    mockTransaction = {};
  });

  describe('ensureSupervisorEvaluationDocument', () => {
    it('creates the document and audits only the real creation', async () => {
      const processId = 'process-123';
      mockTransaction.processDocument = {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'doc-123' }),
      };
      mockTransaction.auditEvent = {
        create: jest.fn().mockResolvedValue({}),
      };

      const result = await service.ensureSupervisorEvaluationDocument(
        mockTransaction,
        processId,
        mockSupervisorUser,
      );

      expect(result).toEqual({ documentId: 'doc-123' });
      expect(mockTransaction.processDocument.create).toHaveBeenCalledWith({
        data: {
          evaluationProcessId: processId,
          documentType: 'SUPERVISOR_EVALUATION',
          documentStatus: 'READY_FOR_SIGNATURE',
          artifactPath: '',
        },
      });
      expect(mockTransaction.auditEvent.create).toHaveBeenCalledTimes(1);
      expect(mockTransaction.auditEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          evaluationProcessId: processId,
          eventType: 'DOCUMENT_GENERATED',
          metadata: expect.objectContaining({
            documentId: 'doc-123',
            documentType: 'SUPERVISOR_EVALUATION',
            origin: 'PROCESS_DOCUMENT',
          }),
        }),
      });
    });

    it('returns the existing document without duplicating document creation audit', async () => {
      const processId = 'process-123';
      mockTransaction.processDocument = {
        findFirst: jest.fn().mockResolvedValue({ id: 'doc-123' }),
        create: jest.fn(),
      };
      mockTransaction.auditEvent = {
        create: jest.fn(),
      };

      const result = await service.ensureSupervisorEvaluationDocument(
        mockTransaction,
        processId,
        mockSupervisorUser,
      );

      expect(result).toEqual({ documentId: 'doc-123' });
      expect(mockTransaction.processDocument.create).not.toHaveBeenCalled();
      expect(mockTransaction.auditEvent.create).not.toHaveBeenCalled();
    });

    it('returns the existing document after a P2002 retry path without emitting a misleading generation audit', async () => {
      const processId = 'process-123';
      mockTransaction.processDocument = {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ id: 'doc-123' }),
        create: jest.fn().mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError(
            'Unique constraint failed',
            {
              code: 'P2002',
              clientVersion: '6.8.2',
            },
            '',
          ),
        ),
      };
      mockTransaction.auditEvent = {
        create: jest.fn(),
      };

      const result = await service.ensureSupervisorEvaluationDocument(
        mockTransaction,
        processId,
        mockSupervisorUser,
      );

      expect(result).toEqual({ documentId: 'doc-123' });
      expect(mockTransaction.processDocument.findFirst).toHaveBeenCalledTimes(2);
      expect(mockTransaction.auditEvent.create).not.toHaveBeenCalled();
    });
  });

  describe('createSupervisorEvaluationSignatures', () => {
    it('creates the missing signature records and preserves the required audit trail', async () => {
      mockTransaction.signatureRecord = {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({}),
      };
      mockTransaction.auditEvent = {
        create: jest.fn().mockResolvedValue({}),
      };

      await service.createSupervisorEvaluationSignatures(
        mockTransaction,
        'process-123',
        'doc-123',
        'supervisor-123',
        'intern-123',
        mockSupervisorUser,
      );

      expect(mockTransaction.signatureRecord.findMany).toHaveBeenCalledWith({
        where: {
          processDocumentId: 'doc-123',
          signatoryRole: {
            in: ['IMMEDIATE_SUPERVISOR', 'INTERN_SERVER'],
          },
        },
      });
      expect(mockTransaction.signatureRecord.create).toHaveBeenCalledTimes(2);
      expect(mockTransaction.auditEvent.create).toHaveBeenCalledTimes(2);
      expect(mockTransaction.auditEvent.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'DOCUMENT_SIGNED',
            metadata: expect.objectContaining({
              documentId: 'doc-123',
              signatoryRole: 'IMMEDIATE_SUPERVISOR',
              signatoryUserId: 'supervisor-123',
            }),
          }),
        }),
      );
      expect(mockTransaction.auditEvent.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'SIGNATURE_REQUESTED',
            metadata: expect.objectContaining({
              documentId: 'doc-123',
              signatoryRole: 'INTERN_SERVER',
              signatoryUserId: 'intern-123',
            }),
          }),
        }),
      );
    });

    it('is idempotent when both signature records already exist', async () => {
      mockTransaction.signatureRecord = {
        findMany: jest.fn().mockResolvedValue([
          {
            signatoryRole: PrismaUserRole.IMMEDIATE_SUPERVISOR,
          },
          {
            signatoryRole: PrismaUserRole.INTERN_SERVER,
          },
        ]),
        create: jest.fn(),
      };
      mockTransaction.auditEvent = {
        create: jest.fn(),
      };

      await service.createSupervisorEvaluationSignatures(
        mockTransaction,
        'process-123',
        'doc-123',
        'supervisor-123',
        'intern-123',
        mockSupervisorUser,
      );

      expect(mockTransaction.signatureRecord.create).not.toHaveBeenCalled();
      expect(mockTransaction.auditEvent.create).not.toHaveBeenCalled();
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
        evaluatedUserId: 'intern-123',
        ...overrides?.process,
      };
      const document = overrides?.document ?? {
        id: 'doc-123',
        signatureRecords: [
          {
            id: 'sig-1',
            signatoryUserId: 'intern-123',
            signatoryRole: 'INTERN_SERVER',
            status: 'PENDING',
          },
        ],
      };

      processesService.findProcessOrThrow.mockResolvedValue(process as any);
      mockTransaction.processDocument = {
        findFirst: jest.fn().mockResolvedValue(document),
        update: jest.fn().mockResolvedValue({}),
      };
      mockTransaction.signatureRecord = {
        findMany: jest.fn().mockResolvedValue(
          (overrides?.allSignatureStatuses ?? [
            PrismaSignatureStatus.COMPLETED,
            PrismaSignatureStatus.COMPLETED,
          ]).map((status) => ({ status })),
        ),
        update: jest.fn().mockResolvedValue({}),
      };
      mockTransaction.auditEvent = {
        create: jest.fn().mockResolvedValue({}),
      };
      prismaService.$transaction.mockImplementation(async (callback) => callback(mockTransaction));
    }

    it('signs the pending intern signature and closes the document when all signatures are complete', async () => {
      mockTransactionForSigning();

      await service.signSupervisorEvaluationDocument('process-123', mockInternUser);

      expect(mockTransaction.processDocument.findFirst).toHaveBeenCalledWith({
        where: {
          evaluationProcessId: 'process-123',
          documentType: 'SUPERVISOR_EVALUATION',
        },
        include: {
          signatureRecords: true,
        },
      });
      expect(mockTransaction.signatureRecord.update).toHaveBeenCalledWith({
        where: { id: 'sig-1' },
        data: {
          status: 'COMPLETED',
          signedAt: expect.any(Date),
        },
      });
      expect(mockTransaction.processDocument.update).toHaveBeenCalledWith({
        where: { id: 'doc-123' },
        data: { documentStatus: 'SIGNED' },
      });
      expect(mockTransaction.auditEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'DOCUMENT_SIGNED',
          metadata: expect.objectContaining({
            documentId: 'doc-123',
            signatoryRole: 'INTERN_SERVER',
            signatoryUserId: 'intern-123',
          }),
        }),
      });
    });

    it('keeps the process contract explicit by rejecting non-INTERN_SERVER signers', async () => {
      mockTransactionForSigning();

      await expect(
        service.signSupervisorEvaluationDocument('process-123', mockSupervisorUser),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.signSupervisorEvaluationDocument('process-123', mockSupervisorUser),
      ).rejects.toThrow('Only INTERN_SERVER can sign supervisor evaluation document');
    });

    it('rejects intern signatures when the authenticated user is not the evaluated server', async () => {
      mockTransactionForSigning({
        process: {
          evaluatedUserId: 'intern-999',
        },
      });

      await expect(
        service.signSupervisorEvaluationDocument('process-123', mockInternUser),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.signSupervisorEvaluationDocument('process-123', mockInternUser),
      ).rejects.toThrow('Authenticated user is not the evaluated server for this process');
    });

    it('rejects signing when the process is outside AGUARDANDO_ASSINATURA', async () => {
      mockTransactionForSigning({
        process: {
          status: 'EM_AVALIACAO',
        },
      });

      await expect(
        service.signSupervisorEvaluationDocument('process-123', mockInternUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects signing when the document does not exist', async () => {
      mockTransactionForSigning({
        document: null,
      });

      await expect(
        service.signSupervisorEvaluationDocument('process-123', mockInternUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects signing when there is no pending signature for the authenticated intern', async () => {
      mockTransactionForSigning({
        document: {
          id: 'doc-123',
          signatureRecords: [
            {
              id: 'sig-1',
              signatoryUserId: 'intern-123',
              signatoryRole: 'INTERN_SERVER',
              status: 'COMPLETED',
            },
          ],
        },
      });

      await expect(
        service.signSupervisorEvaluationDocument('process-123', mockInternUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSupervisorEvaluationDocumentContext', () => {
    it('returns the stable documentContext shape expected by GET /processes/:id/supervisor-evaluation', async () => {
      mockTransaction.processDocument = {
        findFirst: jest.fn().mockResolvedValue({
          id: 'doc-123',
          documentType: 'SUPERVISOR_EVALUATION',
          documentStatus: 'READY_FOR_SIGNATURE',
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
      };

      const result = await service.getSupervisorEvaluationDocumentContext(
        mockTransaction,
        'process-123',
      );

      expect(mockTransaction.processDocument.findFirst).toHaveBeenCalledWith({
        where: {
          evaluationProcessId: 'process-123',
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
      mockTransaction.processDocument = {
        findFirst: jest.fn().mockResolvedValue(null),
      };

      await expect(
        service.getSupervisorEvaluationDocumentContext(mockTransaction, 'process-123'),
      ).resolves.toBeNull();
    });
  });

  describe('canRectifySupervisorEvaluation', () => {
    it('allows rectification when no document exists yet', async () => {
      mockTransaction.processDocument = {
        findFirst: jest.fn().mockResolvedValue(null),
      };

      await expect(
        service.canRectifySupervisorEvaluation(mockTransaction, 'process-123'),
      ).resolves.toBe(true);
    });

    it('allows rectification before the intern completes the signature', async () => {
      mockTransaction.processDocument = {
        findFirst: jest.fn().mockResolvedValue({
          signatureRecords: [
            {
              signatoryRole: 'INTERN_SERVER',
              status: 'PENDING',
            },
          ],
        }),
      };

      await expect(
        service.canRectifySupervisorEvaluation(mockTransaction, 'process-123'),
      ).resolves.toBe(true);
    });

    it('blocks rectification after the intern signature is completed', async () => {
      mockTransaction.processDocument = {
        findFirst: jest.fn().mockResolvedValue({
          signatureRecords: [
            {
              signatoryRole: 'INTERN_SERVER',
              status: 'COMPLETED',
            },
          ],
        }),
      };

      await expect(
        service.canRectifySupervisorEvaluation(mockTransaction, 'process-123'),
      ).resolves.toBe(false);
    });
  });
});
