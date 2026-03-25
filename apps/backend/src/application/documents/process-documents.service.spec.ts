import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  AuditEventType,
  ProcessAction,
  ProcessStatus,
  DocumentType,
  DocumentStatus,
  SignatureStatus,
  UserRole,
} from '@aep-pa/contracts';

import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ProcessesService } from '../../../processes/processes.service';
import { ProcessDocumentsService } from './process-documents.service';

describe('ProcessDocumentsService', () => {
  let service: ProcessDocumentsService;
  let prismaService: jest.Mocked<PrismaService>;
  let processesService: jest.Mocked<ProcessesService>;

  const mockUser = {
    sub: 'user-123',
    role: UserRole.IMMEDIATE_SUPERVISOR,
  };

  const mockTransaction = {} as Prisma.TransactionClient;

  beforeEach(async () => {
    const mockPrismaService = {
      $transaction: jest.fn(),
    };

    const mockProcessesService = {
      findProcessOrThrow: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessDocumentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ProcessesService,
          useValue: mockProcessesService,
        },
      ],
    }).compile();

    service = module.get<ProcessDocumentsService>(ProcessDocumentsService);
    prismaService = module.get(PrismaService);
    processesService = module.get(ProcessesService);
  });

  describe('ensureSupervisorEvaluationDocument', () => {
    it('should create new document if not exists', async () => {
      const processId = 'process-123';

      mockTransaction.processDocument = {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'doc-123' }),
      } as any;

      mockTransaction.auditEvent = {
        create: jest.fn().mockResolvedValue({}),
      } as any;

      const result = await service.ensureSupervisorEvaluationDocument(mockTransaction, processId, mockUser);

      expect(mockTransaction.processDocument.findFirst).toHaveBeenCalledWith({
        where: {
          evaluationProcessId: processId,
          documentType: 'SUPERVISOR_EVALUATION',
        },
      });

      expect(mockTransaction.processDocument.create).toHaveBeenCalledWith({
        data: {
          evaluationProcessId: processId,
          documentType: 'SUPERVISOR_EVALUATION',
          documentStatus: 'READY_FOR_SIGNATURE',
          artifactPath: '',
        },
      });

      expect(result).toEqual({ documentId: 'doc-123' });
    });

    it('should return existing document if exists', async () => {
      const processId = 'process-123';
      const existingDoc = { id: 'doc-123' };

      mockTransaction.processDocument = {
        findFirst: jest.fn().mockResolvedValue(existingDoc),
      } as any;

      const result = await service.ensureSupervisorEvaluationDocument(mockTransaction, processId, mockUser);

      expect(mockTransaction.processDocument.findFirst).toHaveBeenCalledWith({
        where: {
          evaluationProcessId: processId,
          documentType: 'SUPERVISOR_EVALUATION',
        },
      });

      expect(result).toEqual({ documentId: 'doc-123' });
    });

    it('should recover from unique constraint duplicate create and return existing document id', async () => {
      const processId = 'process-123';
      const existingDoc = { id: 'doc-123' };

      mockTransaction.processDocument = {
        findFirst: jest.fn().mockResolvedValueOnce(null).mockResolvedValue(existingDoc),
        create: jest.fn().mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
            code: 'P2002',
            clientVersion: '4.0.0',
          }, ''),
        ),
      } as any;

      mockTransaction.auditEvent = {
        create: jest.fn().mockResolvedValue({}),
      } as any;

      const result = await service.ensureSupervisorEvaluationDocument(mockTransaction, processId, mockUser);

      expect(result).toEqual({ documentId: 'doc-123' });
    });
  });

  describe('createSupervisorEvaluationSignatures', () => {
    it('should create supervisor and intern signatures', async () => {
      const processId = 'process-123';
      const documentId = 'doc-123';
      const supervisorUserId = 'supervisor-123';
      const internUserId = 'intern-123';

      mockTransaction.signatureRecord = {
        create: jest.fn().mockResolvedValue({}),
      } as any;

      mockTransaction.auditEvent = {
        create: jest.fn().mockResolvedValue({}),
      } as any;

      await service.createSupervisorEvaluationSignatures(
        mockTransaction,
        processId,
        documentId,
        supervisorUserId,
        internUserId,
        mockUser,
      );

      expect(mockTransaction.signatureRecord.create).toHaveBeenCalledTimes(2);

      // Supervisor signature
      expect(mockTransaction.signatureRecord.create).toHaveBeenCalledWith({
        data: {
          processDocumentId: documentId,
          signatoryUserId: supervisorUserId,
          signatoryRole: 'IMMEDIATE_SUPERVISOR',
          provider: 'INTERNAL',
          status: 'COMPLETED',
          signedAt: expect.any(Date),
        },
      });

      // Intern signature
      expect(mockTransaction.signatureRecord.create).toHaveBeenCalledWith({
        data: {
          processDocumentId: documentId,
          signatoryUserId: internUserId,
          signatoryRole: 'INTERN_SERVER',
          provider: 'INTERNAL',
          status: 'PENDING',
        },
      });
    });
  });

  describe('signSupervisorEvaluationDocument', () => {
    it('should sign document successfully', async () => {
      const processId = 'process-123';

      const mockProcess = { id: processId, status: 'AGUARDANDO_ASSINATURA' };
      const mockDocument = {
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

      processesService.findProcessOrThrow.mockResolvedValue(mockProcess as any);
      mockTransaction.processDocument = {
        findFirst: jest.fn().mockResolvedValue(mockDocument),
        update: jest.fn().mockResolvedValue({}),
      } as any;
      mockTransaction.signatureRecord = {
        findMany: jest.fn().mockResolvedValue([
          { status: 'COMPLETED' },
          { status: 'COMPLETED' },
        ]),
        update: jest.fn().mockResolvedValue({}),
      } as any;
      mockTransaction.auditEvent = {
        create: jest.fn().mockResolvedValue({}),
      } as any;

      prismaService.$transaction.mockImplementation(async (fn) => fn(mockTransaction));

      const internUser = { ...mockUser, sub: 'intern-123', role: UserRole.INTERN_SERVER };

      await service.signSupervisorEvaluationDocument(processId, internUser);

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
    });

    it('should reject if process not in correct status', async () => {
      const processId = 'process-123';
      const mockProcess = { id: processId, status: 'EM_AVALIACAO' };

      processesService.findProcessOrThrow.mockResolvedValue(mockProcess as any);
      prismaService.$transaction.mockImplementation(async (fn) => fn(mockTransaction));

      await expect(service.signSupervisorEvaluationDocument(processId, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject if no document found', async () => {
      const processId = 'process-123';
      const mockProcess = { id: processId, status: 'AGUARDANDO_ASSINATURA' };

      processesService.findProcessOrThrow.mockResolvedValue(mockProcess as any);
      mockTransaction.processDocument = {
        findFirst: jest.fn().mockResolvedValue(null),
      } as any;
      prismaService.$transaction.mockImplementation(async (fn) => fn(mockTransaction));

      await expect(service.signSupervisorEvaluationDocument(processId, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject if no pending signature for user', async () => {
      const processId = 'process-123';
      const mockProcess = { id: processId, status: 'AGUARDANDO_ASSINATURA' };
      const mockDocument = {
        id: 'doc-123',
        signatureRecords: [
          {
            id: 'sig-1',
            signatoryUserId: 'other-user',
            signatoryRole: 'INTERN_SERVER',
            status: 'PENDING',
          },
        ],
      };

      processesService.findProcessOrThrow.mockResolvedValue(mockProcess as any);
      mockTransaction.processDocument = {
        findFirst: jest.fn().mockResolvedValue(mockDocument),
      } as any;
      prismaService.$transaction.mockImplementation(async (fn) => fn(mockTransaction));

      await expect(service.signSupervisorEvaluationDocument(processId, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject if user role is not INTERN_SERVER', async () => {
      const processId = 'process-123';
      const mockProcess = { id: processId, status: 'AGUARDANDO_ASSINATURA', evaluatedUserId: 'intern-123' };
      const managerUser = { ...mockUser, role: UserRole.IMMEDIATE_SUPERVISOR, sub: 'supervisor-123' };

      processesService.findProcessOrThrow.mockResolvedValue(mockProcess as any);
      prismaService.$transaction.mockImplementation(async (fn) => fn(mockTransaction));

      await expect(service.signSupervisorEvaluationDocument(processId, managerUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should reject if intern user does not match process evaluated user', async () => {
      const processId = 'process-123';
      const mockProcess = { id: processId, status: 'AGUARDANDO_ASSINATURA', evaluatedUserId: 'intern-456' };
      const internUser = { ...mockUser, role: UserRole.INTERN_SERVER, sub: 'intern-123' };

      processesService.findProcessOrThrow.mockResolvedValue(mockProcess as any);
      prismaService.$transaction.mockImplementation(async (fn) => fn(mockTransaction));

      await expect(service.signSupervisorEvaluationDocument(processId, internUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getSupervisorEvaluationDocumentContext', () => {
    it('should return document context', async () => {
      const processId = 'process-123';
      const mockDocument = {
        id: 'doc-123',
        documentType: 'SUPERVISOR_EVALUATION',
        documentStatus: 'READY_FOR_SIGNATURE',
        signatureRecords: [
          {
            signatoryRole: 'IMMEDIATE_SUPERVISOR',
            status: 'COMPLETED',
            signedAt: new Date('2023-01-01'),
          },
          {
            signatoryRole: 'INTERN_SERVER',
            status: 'PENDING',
            signedAt: null,
          },
        ],
      };

      mockTransaction.processDocument = {
        findFirst: jest.fn().mockResolvedValue(mockDocument),
      } as any;

      const result = await service.getSupervisorEvaluationDocumentContext(mockTransaction, processId);

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

    it('should return null if no document', async () => {
      const processId = 'process-123';

      mockTransaction.processDocument = {
        findFirst: jest.fn().mockResolvedValue(null),
      } as any;

      const result = await service.getSupervisorEvaluationDocumentContext(mockTransaction, processId);

      expect(result).toBeNull();
    });
  });

  describe('canRectifySupervisorEvaluation', () => {
    it('should allow rectification if no document', async () => {
      const processId = 'process-123';

      mockTransaction.processDocument = {
        findFirst: jest.fn().mockResolvedValue(null),
      } as any;

      const result = await service.canRectifySupervisorEvaluation(mockTransaction, processId);

      expect(result).toBe(true);
    });

    it('should allow rectification if intern not signed', async () => {
      const processId = 'process-123';
      const mockDocument = {
        signatureRecords: [
          {
            signatoryRole: 'INTERN_SERVER',
            status: 'PENDING',
          },
        ],
      };

      mockTransaction.processDocument = {
        findFirst: jest.fn().mockResolvedValue(mockDocument),
      } as any;

      const result = await service.canRectifySupervisorEvaluation(mockTransaction, processId);

      expect(result).toBe(true);
    });

    it('should deny rectification if intern signed', async () => {
      const processId = 'process-123';
      const mockDocument = {
        signatureRecords: [
          {
            signatoryRole: 'INTERN_SERVER',
            status: 'COMPLETED',
          },
        ],
      };

      mockTransaction.processDocument = {
        findFirst: jest.fn().mockResolvedValue(mockDocument),
      } as any;

      const result = await service.canRectifySupervisorEvaluation(mockTransaction, processId);

      expect(result).toBe(false);
    });
  });
});