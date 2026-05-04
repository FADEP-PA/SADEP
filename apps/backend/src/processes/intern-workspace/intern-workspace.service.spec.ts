import { ForbiddenException } from '@nestjs/common';
import {
  DocumentStatus,
  DocumentType,
  ProcessStatus,
  SignatureStatus,
  UserRole,
} from '@sadep/contracts';

import { ProcessDocumentsService } from '../../application/documents/process-documents.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { InternWorkspaceService } from './intern-workspace.service';

describe('InternWorkspaceService', () => {
  let service: InternWorkspaceService;
  let prismaService: {
    evaluationProcess: {
      findUnique: jest.Mock;
    };
    processDocument: {
      findFirst: jest.Mock;
    };
  };
  let processDocumentsService: {
    getSupervisorEvaluationDocumentContext: jest.Mock;
    getSelfEvaluationDocumentContext: jest.Mock;
    hasCompletedSupervisorEvaluationSignatures: jest.Mock;
  };

  const internUser = {
    sub: 'intern-123',
    email: 'intern@test.local',
    name: 'Servidor Teste',
    role: UserRole.INTERN_SERVER,
  };
  const now = new Date('2026-04-25T12:00:00.000Z');
  const supervisorEvaluation = {
    id: 'supervisor-evaluation-123',
    processId: 'process-123',
    processStageId: 'stage-2',
    evaluatorUserId: 'supervisor-123',
    status: 'SUBMITTED',
    summary: 'Resumo da chefia',
    generalComments: 'Comentarios gerais',
    content: {
      criteria: [{ code: 'ASSID', label: 'Assiduidade', rating: 4 }],
    },
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(() => {
    prismaService = {
      evaluationProcess: {
        findUnique: jest.fn(),
      },
      processDocument: {
        findFirst: jest.fn(),
      },
    };
    processDocumentsService = {
      getSupervisorEvaluationDocumentContext: jest.fn(),
      getSelfEvaluationDocumentContext: jest.fn(),
      hasCompletedSupervisorEvaluationSignatures: jest.fn(),
    };

    service = new InternWorkspaceService(
      prismaService as unknown as PrismaService,
      processDocumentsService as unknown as ProcessDocumentsService,
    );
  });

  it('rejects users that are not the evaluated intern server', async () => {
    await expect(
      service.getSnapshot('process-123', {
        ...internUser,
        role: UserRole.IMMEDIATE_SUPERVISOR,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('exposes current stage and operational flags from backend state', async () => {
    prismaService.evaluationProcess.findUnique.mockResolvedValue(
      buildProcess({
        status: ProcessStatus.AGUARDANDO_ASSINATURA,
        stages: [
          buildStage({ id: 'stage-1', sequence: 1, endedAt: now }),
          buildStage({ id: 'stage-2', sequence: 2, supervisorEvaluation }),
        ],
      }),
    );
    processDocumentsService.getSupervisorEvaluationDocumentContext.mockResolvedValue({
      documentId: 'doc-supervisor-123',
      documentType: DocumentType.SUPERVISOR_EVALUATION,
      documentStatus: DocumentStatus.SIGNED,
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
          status: SignatureStatus.COMPLETED,
          signedAt: now.toISOString(),
        },
      ],
      internSignaturePending: false,
    });
    processDocumentsService.hasCompletedSupervisorEvaluationSignatures.mockResolvedValue(true);

    const snapshot = await service.getSnapshot('process-123', internUser);

    expect(snapshot.currentStage).toEqual({
      stageId: 'stage-2',
      sequence: 2,
      stageCode: 'ETAPA_2',
      startedAt: now.toISOString(),
      endedAt: null,
      totalStages: 2,
    });
    expect(snapshot.capabilities).toMatchObject({
      canViewSupervisorEvaluation: true,
      canSignSupervisorEvaluation: false,
      canViewSelfEvaluation: false,
      canEditSelfEvaluation: true,
      canSubmitSelfEvaluation: true,
    });
  });

  it('keeps supervisor signature as the available action while the server signature is pending', async () => {
    prismaService.evaluationProcess.findUnique.mockResolvedValue(
      buildProcess({
        status: ProcessStatus.AGUARDANDO_ASSINATURA,
        stages: [buildStage({ supervisorEvaluation })],
      }),
    );
    processDocumentsService.getSupervisorEvaluationDocumentContext.mockResolvedValue({
      documentId: 'doc-supervisor-123',
      documentType: DocumentType.SUPERVISOR_EVALUATION,
      documentStatus: DocumentStatus.READY_FOR_SIGNATURE,
      hasArtifact: false,
      artifactPath: null,
      signatures: [
        {
          signatoryRole: UserRole.INTERN_SERVER,
          status: SignatureStatus.PENDING,
          signedAt: null,
        },
      ],
      internSignaturePending: true,
    });
    processDocumentsService.hasCompletedSupervisorEvaluationSignatures.mockResolvedValue(false);

    const snapshot = await service.getSnapshot('process-123', internUser);

    expect(snapshot.capabilities.canSignSupervisorEvaluation).toBe(true);
    expect(snapshot.capabilities.canEditSelfEvaluation).toBe(false);
    expect(snapshot.capabilities.canSubmitSelfEvaluation).toBe(false);
  });

  it('does not expose supervisor evaluation drafts to the intern workspace', async () => {
    prismaService.evaluationProcess.findUnique.mockResolvedValue(
      buildProcess({
        status: ProcessStatus.EM_AVALIACAO,
        stages: [
          buildStage({
            supervisorEvaluation: {
              ...supervisorEvaluation,
              status: 'DRAFT',
            },
          }),
        ],
      }),
    );

    const snapshot = await service.getSnapshot('process-123', internUser);

    expect(snapshot.supervisorEvaluation).toBeNull();
    expect(snapshot.capabilities.canViewSupervisorEvaluation).toBe(false);
    expect(processDocumentsService.getSupervisorEvaluationDocumentContext).not.toHaveBeenCalled();
  });

  it('allows CESAD opinion read for stages 1 to 3 after completion and full document signature', async () => {
    prismaService.evaluationProcess.findUnique.mockResolvedValue(
      buildProcess({
        status: ProcessStatus.PARECER_EMITIDO,
        stages: [
          buildStage({
            id: 'stage-3',
            sequence: 3,
            cesadStageOpinion: buildCesadOpinion({ processStageId: 'stage-3' }),
          }),
        ],
      }),
    );
    prismaService.processDocument.findFirst.mockResolvedValue(buildSignedCesadDocument());

    const snapshot = await service.getSnapshot('process-123', internUser);

    expect(snapshot.cesadOpinionAccess).toMatchObject({
      canView: true,
      blockedReason: null,
      requiresFormalNotification: false,
    });
    expect(snapshot.cesadOpinionAccess.opinion?.id).toBe('cesad-opinion-123');
  });

  it('requires formal notification to expose stage 4 CESAD opinion', async () => {
    prismaService.evaluationProcess.findUnique.mockResolvedValue(
      buildProcess({
        status: ProcessStatus.PARECER_EMITIDO,
        stages: [
          buildStage({
            id: 'stage-4',
            sequence: 4,
            cesadStageOpinion: buildCesadOpinion({ processStageId: 'stage-4' }),
          }),
        ],
      }),
    );
    prismaService.processDocument.findFirst.mockResolvedValue(buildSignedCesadDocument());

    const blockedSnapshot = await service.getSnapshot('process-123', internUser);

    expect(blockedSnapshot.cesadOpinionAccess).toMatchObject({
      canView: false,
      requiresFormalNotification: true,
      opinion: null,
    });

    prismaService.evaluationProcess.findUnique.mockResolvedValue(
      buildProcess({
        status: ProcessStatus.NOTIFICADO,
        stages: [
          buildStage({
            id: 'stage-4',
            sequence: 4,
            cesadStageOpinion: buildCesadOpinion({ processStageId: 'stage-4' }),
          }),
        ],
      }),
    );

    const notifiedSnapshot = await service.getSnapshot('process-123', internUser);

    expect(notifiedSnapshot.cesadOpinionAccess.canView).toBe(true);
    expect(notifiedSnapshot.cesadOpinionAccess.opinion?.id).toBe('cesad-opinion-123');
  });

  function buildProcess(params: {
    status: ProcessStatus;
    stages: Array<ReturnType<typeof buildStage>>;
  }) {
    return {
      id: 'process-123',
      status: params.status,
      evaluatedUserId: internUser.sub,
      stages: params.stages,
    };
  }

  function buildStage(params: {
    id?: string;
    sequence?: number;
    endedAt?: Date | null;
    supervisorEvaluation?: typeof supervisorEvaluation | null;
    cesadStageOpinion?: ReturnType<typeof buildCesadOpinion> | null;
  } = {}) {
    const sequence = params.sequence ?? 1;

    return {
      id: params.id ?? 'stage-1',
      sequence,
      stageCode: `ETAPA_${sequence}`,
      startedAt: now,
      endedAt: params.endedAt ?? null,
      responsibleSupervisorUserId: 'supervisor-123',
      supervisorEvaluation: params.supervisorEvaluation ?? null,
      selfEvaluation: null,
      cesadStageOpinion: params.cesadStageOpinion ?? null,
    };
  }

  function buildCesadOpinion(params: { processStageId: string }) {
    return {
      id: 'cesad-opinion-123',
      processId: 'process-123',
      processStageId: params.processStageId,
      authorUserId: 'cesad-123',
      status: 'COMPLETED',
      reportText: 'Relatorio',
      legalBasis: null,
      conclusion: 'Conclusao',
      stageConcept: null,
      stageResult: null,
      completedAt: now,
      createdAt: now,
      updatedAt: now,
      expectedSigners: [],
    };
  }

  function buildSignedCesadDocument() {
    return {
      id: 'doc-cesad-123',
      documentStatus: 'SIGNED',
      signatureRecords: [
        {
          status: 'COMPLETED',
        },
      ],
    };
  }
});
