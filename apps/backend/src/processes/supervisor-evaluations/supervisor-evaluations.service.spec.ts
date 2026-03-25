import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SupervisorEvaluationStatus, UserRole } from '@aep-pa/contracts';

import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ProcessesService } from '../../processes.service';
import { ProcessDocumentsService } from '../../../application/documents/process-documents.service';
import { SupervisorEvaluationsService } from '../supervisor-evaluations.service';

describe('SupervisorEvaluationsService', () => {
  let service: SupervisorEvaluationsService;
  let prismaService: jest.Mocked<PrismaService>;
  let processesService: jest.Mocked<ProcessesService>;
  let processDocumentsService: jest.Mocked<ProcessDocumentsService>;

  const mockUser = {
    sub: 'user-123',
    role: UserRole.IMMEDIATE_SUPERVISOR,
  };

  beforeEach(async () => {
    const mockPrismaService = {
      $transaction: jest.fn(),
      supervisorEvaluation: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      auditEvent: {
        create: jest.fn(),
      },
    };

    const mockProcessesService = {
      ensureProcessExists: jest.fn(),
      findProcessOrThrow: jest.fn(),
      transitionWorkflowInTransaction: jest.fn(),
    };

    const mockProcessDocumentsService = {
      ensureSupervisorEvaluationDocument: jest.fn(),
      createSupervisorEvaluationSignatures: jest.fn(),
      getSupervisorEvaluationDocumentContext: jest.fn(),
      canRectifySupervisorEvaluation: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupervisorEvaluationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ProcessesService,
          useValue: mockProcessesService,
        },
        {
          provide: ProcessDocumentsService,
          useValue: mockProcessDocumentsService,
        },
      ],
    }).compile();

    service = module.get<SupervisorEvaluationsService>(SupervisorEvaluationsService);
    prismaService = module.get(PrismaService);
    processesService = module.get(ProcessesService);
    processDocumentsService = module.get(ProcessDocumentsService);
  });

  describe('getByProcessId', () => {
    it('should return evaluation with document context when submitted', async () => {
      const processId = 'process-123';
      const mockEvaluation = {
        id: 'eval-123',
        processId,
        evaluatorUserId: 'user-123',
        status: 'SUBMITTED',
        summary: 'Good work',
        generalComments: 'Keep it up',
        content: {},
        submittedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockDocumentContext = {
        documentId: 'doc-123',
        documentType: 'SUPERVISOR_EVALUATION',
        documentStatus: 'READY_FOR_SIGNATURE',
        signatures: [],
        internSignaturePending: true,
      };

      processesService.ensureProcessExists.mockResolvedValue();
      prismaService.supervisorEvaluation.findUnique.mockResolvedValue(mockEvaluation as any);
      processDocumentsService.getSupervisorEvaluationDocumentContext.mockResolvedValue(mockDocumentContext);

      const result = await service.getByProcessId(processId, mockUser);

      expect(result).toBeDefined();
      expect(result?.documentContext).toEqual(mockDocumentContext);
    });

    it('should return evaluation without document context when draft', async () => {
      const processId = 'process-123';
      const mockEvaluation = {
        id: 'eval-123',
        processId,
        evaluatorUserId: 'user-123',
        status: 'DRAFT',
        summary: 'Good work',
        generalComments: 'Keep it up',
        content: {},
        submittedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      processesService.ensureProcessExists.mockResolvedValue();
      prismaService.supervisorEvaluation.findUnique.mockResolvedValue(mockEvaluation as any);

      const result = await service.getByProcessId(processId, mockUser);

      expect(result).toBeDefined();
      expect(result?.documentContext).toBeUndefined();
    });
  });

  describe('submit', () => {
    it('should create document and signatures on submit', async () => {
      const processId = 'process-123';
      const payload = {
        summary: 'Good work',
        generalComments: 'Keep it up',
        content: { criteria: [] },
      };

      const mockProcess = { id: processId, status: 'EM_AVALIACAO', evaluatedUserId: 'intern-123' };
      const mockEvaluation = {
        id: 'eval-123',
        processId,
        evaluatorUserId: 'user-123',
        status: 'SUBMITTED',
        summary: 'Good work',
        generalComments: 'Keep it up',
        content: {},
        submittedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      processesService.findProcessOrThrow.mockResolvedValue(mockProcess as any);
      prismaService.supervisorEvaluation.findUnique.mockResolvedValue(null);
      prismaService.supervisorEvaluation.create.mockResolvedValue(mockEvaluation as any);
      processesService.transitionWorkflowInTransaction.mockResolvedValue();
      processDocumentsService.ensureSupervisorEvaluationDocument.mockResolvedValue({ documentId: 'doc-123' });
      processDocumentsService.createSupervisorEvaluationSignatures.mockResolvedValue();

      prismaService.$transaction.mockImplementation(async (fn) => {
        const transaction = {
          evaluationProcess: { findUnique: jest.fn().mockResolvedValue(mockProcess) },
          supervisorEvaluation: prismaService.supervisorEvaluation,
          auditEvent: prismaService.auditEvent,
        };
        return fn(transaction as any);
      });

      const result = await service.submit(processId, mockUser, payload);

      expect(processDocumentsService.ensureSupervisorEvaluationDocument).toHaveBeenCalled();
      expect(processDocumentsService.createSupervisorEvaluationSignatures).toHaveBeenCalledWith(
        expect.any(Object),
        processId,
        'doc-123',
        'user-123', // supervisor
        'intern-123', // intern
        mockUser,
      );
    });
  });

  describe('rectify', () => {
    it('should allow rectification when intern not signed', async () => {
      const processId = 'process-123';
      const payload = {
        summary: 'Updated work',
        generalComments: 'Keep it up',
        content: { criteria: [] },
      };

      const mockProcess = { id: processId, status: 'AGUARDANDO_ASSINATURA' };
      const mockEvaluation = {
        id: 'eval-123',
        processId,
        evaluatorUserId: 'user-123',
        status: 'SUBMITTED',
        summary: 'Good work',
        generalComments: 'Keep it up',
        content: {},
        submittedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      processesService.findProcessOrThrow.mockResolvedValue(mockProcess as any);
      prismaService.supervisorEvaluation.findUnique.mockResolvedValue(mockEvaluation as any);
      processDocumentsService.canRectifySupervisorEvaluation.mockResolvedValue(true);
      prismaService.supervisorEvaluation.update.mockResolvedValue(mockEvaluation as any);

      prismaService.$transaction.mockImplementation(async (fn) => {
        const transaction = {
          supervisorEvaluation: prismaService.supervisorEvaluation,
          auditEvent: prismaService.auditEvent,
        };
        return fn(transaction as any);
      });

      const result = await service.rectify(processId, mockUser, payload);

      expect(result).toBeDefined();
    });

    it('should reject rectification when intern signed', async () => {
      const processId = 'process-123';
      const payload = {
        summary: 'Updated work',
        generalComments: 'Keep it up',
        content: { criteria: [] },
      };

      const mockProcess = { id: processId, status: 'AGUARDANDO_ASSINATURA' };
      const mockEvaluation = {
        id: 'eval-123',
        processId,
        evaluatorUserId: 'user-123',
        status: 'SUBMITTED',
        summary: 'Good work',
        generalComments: 'Keep it up',
        content: {},
        submittedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      processesService.findProcessOrThrow.mockResolvedValue(mockProcess as any);
      prismaService.supervisorEvaluation.findUnique.mockResolvedValue(mockEvaluation as any);
      processDocumentsService.canRectifySupervisorEvaluation.mockResolvedValue(false);

      prismaService.$transaction.mockImplementation(async (fn) => {
        const transaction = {};
        return fn(transaction as any);
      });

      await expect(service.rectify(processId, mockUser, payload)).rejects.toThrow(BadRequestException);
    });
  });
});