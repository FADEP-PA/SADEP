import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DocumentStatus, DocumentType, SignatureStatus, UserRole } from '@aep-pa/contracts';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ProcessesService } from '../processes.service';
import { ProcessDocumentsService } from '../../application/documents/process-documents.service';
import { SupervisorEvaluationsService } from './supervisor-evaluations.service';

describe('SupervisorEvaluationsService', () => {
  let service: SupervisorEvaluationsService;
  let prismaService: jest.Mocked<PrismaService>;
  let processesService: jest.Mocked<ProcessesService>;
  let processDocumentsService: jest.Mocked<ProcessDocumentsService>;
  let supervisorEvaluationRepo: {
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  let auditEventRepo: {
    create: jest.Mock;
  };

  const currentStage = {
    id: 'stage-123',
    sequence: 1,
    stageCode: 'ETAPA_1',
    startedAt: null,
    endedAt: null,
  };

  const mockUser = {
    sub: 'user-123',
    email: 'supervisor@test.local',
    role: UserRole.IMMEDIATE_SUPERVISOR,
  };

  const validPayload = {
    summary: 'Good work',
    generalComments: 'Keep it up',
    content: {
      criteria: [
        {
          code: 'ASSID',
          label: 'Assiduidade',
          rating: 4,
        },
      ],
    },
  };

  beforeEach(async () => {
    supervisorEvaluationRepo = {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    auditEventRepo = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupervisorEvaluationsService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn(),
            supervisorEvaluation: supervisorEvaluationRepo,
            auditEvent: auditEventRepo,
          },
        },
        {
          provide: ProcessesService,
          useValue: {
            ensureProcessExists: jest.fn(),
            findProcessOrThrow: jest.fn(),
            resolveCurrentStageOrThrow: jest.fn(),
            transitionWorkflowInTransaction: jest.fn(),
          },
        },
        {
          provide: ProcessDocumentsService,
          useValue: {
            ensureSupervisorEvaluationDocument: jest.fn(),
            createSupervisorEvaluationSignatures: jest.fn(),
            getSupervisorEvaluationDocumentContext: jest.fn(),
            canRectifySupervisorEvaluation: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SupervisorEvaluationsService>(SupervisorEvaluationsService);
    prismaService = module.get(PrismaService);
    processesService = module.get(ProcessesService);
    processDocumentsService = module.get(ProcessDocumentsService);
    processesService.resolveCurrentStageOrThrow.mockResolvedValue(currentStage as any);
  });

  describe('getByProcessId', () => {
    it('returns documentContext with the stable shape when the evaluation is submitted', async () => {
      const processId = 'process-123';
      const now = new Date('2024-01-01T12:00:00.000Z');
      supervisorEvaluationRepo.findUnique.mockResolvedValue({
        id: 'eval-123',
        processId,
        processStageId: currentStage.id,
        evaluatorUserId: mockUser.sub,
        status: 'SUBMITTED',
        summary: validPayload.summary,
        generalComments: validPayload.generalComments,
        content: validPayload.content,
        submittedAt: now,
        createdAt: now,
        updatedAt: now,
      } as any);
      processDocumentsService.getSupervisorEvaluationDocumentContext.mockResolvedValue({
        documentId: 'doc-123',
        documentType: DocumentType.SUPERVISOR_EVALUATION,
        documentStatus: DocumentStatus.READY_FOR_SIGNATURE,
        hasArtifact: false,
        artifactPath: null,
        signatures: [
          {
            signatoryRole: UserRole.IMMEDIATE_SUPERVISOR,
            status: SignatureStatus.COMPLETED,
            signedAt: now.toISOString(),
          },
          {
            signatoryRole: UserRole.INTERN_SERVER,
            status: SignatureStatus.PENDING,
            signedAt: null,
          },
        ],
        internSignaturePending: true,
      });

      const result = await service.getByProcessId(processId, mockUser);

      expect(processesService.ensureProcessExists).toHaveBeenCalledWith(processId);
      expect(processesService.resolveCurrentStageOrThrow).toHaveBeenCalledWith(prismaService, processId);
      expect(processDocumentsService.getSupervisorEvaluationDocumentContext).toHaveBeenCalledWith(
        prismaService,
        processId,
        currentStage.id,
      );
      expect(result).toEqual({
        id: 'eval-123',
        processId,
        processStageId: currentStage.id,
        evaluatorUserId: mockUser.sub,
        status: 'SUBMITTED',
        summary: validPayload.summary,
        generalComments: validPayload.generalComments,
        content: validPayload.content,
        submittedAt: now.toISOString(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        documentContext: {
          documentId: 'doc-123',
          documentType: DocumentType.SUPERVISOR_EVALUATION,
          documentStatus: DocumentStatus.READY_FOR_SIGNATURE,
          hasArtifact: false,
          artifactPath: null,
          signatures: [
            {
              signatoryRole: UserRole.IMMEDIATE_SUPERVISOR,
              status: SignatureStatus.COMPLETED,
              signedAt: now.toISOString(),
            },
            {
              signatoryRole: UserRole.INTERN_SERVER,
              status: SignatureStatus.PENDING,
              signedAt: null,
            },
          ],
          internSignaturePending: true,
        },
      });
    });

    it('does not ask for documentContext while the evaluation is still a draft', async () => {
      const processId = 'process-123';
      const now = new Date('2024-01-01T12:00:00.000Z');
      supervisorEvaluationRepo.findUnique.mockResolvedValue({
        id: 'eval-123',
        processId,
        processStageId: currentStage.id,
        evaluatorUserId: mockUser.sub,
        status: 'DRAFT',
        summary: validPayload.summary,
        generalComments: validPayload.generalComments,
        content: validPayload.content,
        submittedAt: null,
        createdAt: now,
        updatedAt: now,
      } as any);

      const result = await service.getByProcessId(processId, mockUser);

      expect(processDocumentsService.getSupervisorEvaluationDocumentContext).not.toHaveBeenCalled();
      expect(result?.documentContext).toBeUndefined();
    });

    it('allows intern server to read submitted evaluation but blocks draft visibility', async () => {
      const processId = 'process-123';
      const now = new Date('2024-01-01T12:00:00.000Z');
      const internUser = {
        sub: 'intern-123',
        email: 'intern@test.local',
        role: UserRole.INTERN_SERVER,
      };

      supervisorEvaluationRepo.findUnique.mockResolvedValue({
        id: 'eval-123',
        processId,
        processStageId: currentStage.id,
        evaluatorUserId: mockUser.sub,
        status: 'SUBMITTED',
        summary: validPayload.summary,
        generalComments: validPayload.generalComments,
        content: validPayload.content,
        submittedAt: now,
        createdAt: now,
        updatedAt: now,
      } as any);
      processDocumentsService.getSupervisorEvaluationDocumentContext.mockResolvedValue({
        documentId: 'doc-123',
        documentType: DocumentType.SUPERVISOR_EVALUATION,
        documentStatus: DocumentStatus.READY_FOR_SIGNATURE,
        hasArtifact: false,
        artifactPath: null,
        signatures: [],
        internSignaturePending: true,
      });

      const submitted = await service.getByProcessId(processId, internUser);
      expect(submitted?.status).toBe('SUBMITTED');

      supervisorEvaluationRepo.findUnique.mockResolvedValue({
        id: 'eval-123',
        processId,
        processStageId: currentStage.id,
        evaluatorUserId: mockUser.sub,
        status: 'DRAFT',
        summary: validPayload.summary,
        generalComments: validPayload.generalComments,
        content: validPayload.content,
        submittedAt: null,
        createdAt: now,
        updatedAt: now,
      } as any);

      await expect(service.getByProcessId(processId, internUser)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('submit', () => {
    it('keeps the Incremento 7 flow intact by transitioning workflow and ensuring document plus signatures', async () => {
      const processId = 'process-123';
      const submittedAt = new Date('2024-01-01T12:00:00.000Z');
      const mockProcess = {
        id: processId,
        status: 'EM_AVALIACAO',
        evaluatedUserId: 'intern-123',
      };
      supervisorEvaluationRepo.findUnique.mockResolvedValue(null);
      supervisorEvaluationRepo.create.mockResolvedValue({
        id: 'eval-123',
        processId,
        processStageId: currentStage.id,
        evaluatorUserId: mockUser.sub,
        status: 'SUBMITTED',
        summary: validPayload.summary,
        generalComments: validPayload.generalComments,
        content: validPayload.content,
        submittedAt,
        createdAt: submittedAt,
        updatedAt: submittedAt,
      } as any);
      processesService.findProcessOrThrow.mockResolvedValue(mockProcess as any);
      processesService.transitionWorkflowInTransaction.mockResolvedValue('AGUARDANDO_ASSINATURA' as any);
      processDocumentsService.ensureSupervisorEvaluationDocument.mockResolvedValue({
        documentId: 'doc-123',
      });
      processDocumentsService.createSupervisorEvaluationSignatures.mockResolvedValue(undefined);
      prismaService.$transaction.mockImplementation(async (callback) =>
        callback({
          supervisorEvaluation: supervisorEvaluationRepo,
          auditEvent: auditEventRepo,
          evaluationProcess: {
            findUnique: jest.fn().mockResolvedValue({
              evaluatedUserId: 'intern-123',
            }),
          },
        } as any),
      );

      const result = await service.submit(processId, mockUser, validPayload);

      expect(processesService.transitionWorkflowInTransaction).toHaveBeenCalledWith(
        expect.any(Object),
        processId,
        mockUser,
        {
          action: 'RELEASE_FOR_SERVER_SIGNATURE',
          comment: undefined,
        },
      );
      expect(processDocumentsService.ensureSupervisorEvaluationDocument).toHaveBeenCalledWith(
        expect.any(Object),
        processId,
        currentStage.id,
        mockUser,
      );
      expect(processDocumentsService.createSupervisorEvaluationSignatures).toHaveBeenCalledWith(
        expect.any(Object),
        processId,
        currentStage.id,
        'doc-123',
        mockUser.sub,
        'intern-123',
        mockUser,
      );
      expect(result.status).toBe('SUBMITTED');
    });
  });

  describe('rectify', () => {
    it('allows rectification while the intern has not signed yet', async () => {
      const processId = 'process-123';
      const now = new Date('2024-01-01T12:00:00.000Z');
      const mockProcess = {
        id: processId,
        status: 'AGUARDANDO_ASSINATURA',
      };
      const existingEvaluation = {
        id: 'eval-123',
        processId,
        processStageId: currentStage.id,
        evaluatorUserId: mockUser.sub,
        status: 'SUBMITTED',
        summary: validPayload.summary,
        generalComments: validPayload.generalComments,
        content: validPayload.content,
        submittedAt: now,
        createdAt: now,
        updatedAt: now,
      };

      processesService.findProcessOrThrow.mockResolvedValue(mockProcess as any);
      processDocumentsService.canRectifySupervisorEvaluation.mockResolvedValue(true);
      prismaService.$transaction.mockImplementation(async (callback) =>
        callback({
          supervisorEvaluation: {
            findUnique: jest.fn().mockResolvedValue(existingEvaluation),
            update: jest.fn().mockResolvedValue(existingEvaluation),
          },
          auditEvent: prismaService.auditEvent,
        } as any),
      );

      await expect(service.rectify(processId, mockUser, validPayload)).resolves.toBeDefined();
    });

    it('rejects rectification after the intern signature has closed the edit window', async () => {
      const processId = 'process-123';
      const now = new Date('2024-01-01T12:00:00.000Z');
      const mockProcess = {
        id: processId,
        status: 'AGUARDANDO_ASSINATURA',
      };
      const existingEvaluation = {
        id: 'eval-123',
        processId,
        processStageId: currentStage.id,
        evaluatorUserId: mockUser.sub,
        status: 'SUBMITTED',
        summary: validPayload.summary,
        generalComments: validPayload.generalComments,
        content: validPayload.content,
        submittedAt: now,
        createdAt: now,
        updatedAt: now,
      };

      processesService.findProcessOrThrow.mockResolvedValue(mockProcess as any);
      processDocumentsService.canRectifySupervisorEvaluation.mockResolvedValue(false);
      prismaService.$transaction.mockImplementation(async (callback) =>
        callback({
          supervisorEvaluation: {
            findUnique: jest.fn().mockResolvedValue(existingEvaluation),
          },
        } as any),
      );

      await expect(service.rectify(processId, mockUser, validPayload)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
