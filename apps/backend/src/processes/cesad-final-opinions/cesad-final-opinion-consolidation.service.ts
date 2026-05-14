import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CesadStageOpinionStatus as PrismaCesadStageOpinionStatus,
  DocumentStatus as PrismaDocumentStatus,
  DocumentType as PrismaDocumentType,
  SelfEvaluationStatus as PrismaSelfEvaluationStatus,
  SignatureStatus as PrismaSignatureStatus,
  SupervisorEvaluationStatus as PrismaSupervisorEvaluationStatus,
  UserRole as PrismaUserRole,
} from '@prisma/client';
import {
  type CesadFinalOpinionConsolidatedSnapshotRef,
  type CesadFinalOpinionConsolidatedStageRef,
  CesadStageOpinionStatus,
  DocumentStatus,
  DocumentType,
} from '@sadep/contracts';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { isCompletedProcessStage } from '../process-stages.constants';
import type { PrismaTransactionClient } from '../processes.service';

@Injectable()
export class CesadFinalOpinionConsolidationService {
  constructor(private readonly prismaService: PrismaService) {}

  async buildSnapshot(
    processId: string,
    client?: PrismaTransactionClient,
  ): Promise<CesadFinalOpinionConsolidatedSnapshotRef> {
    const prisma = client ?? this.prismaService;
    const process = await prisma.evaluationProcess.findUnique({
      where: { id: processId },
      select: {
        id: true,
        status: true,
        stages: {
          select: {
            id: true,
            sequence: true,
            stageCode: true,
            startedAt: true,
            endedAt: true,
            supervisorEvaluation: {
              select: {
                id: true,
                status: true,
                submittedAt: true,
                summary: true,
              },
            },
            selfEvaluation: {
              select: {
                id: true,
                status: true,
                submittedAt: true,
              },
            },
            cesadStageOpinion: {
              select: {
                id: true,
                status: true,
                stageConcept: true,
                stageResult: true,
                completedAt: true,
                expectedSigners: {
                  select: { id: true, actingUserId: true },
                },
              },
            },
            documents: {
              select: {
                id: true,
                documentType: true,
                documentStatus: true,
                signatureRecords: {
                  select: {
                    status: true,
                    signatoryRole: true,
                    signatoryUserId: true,
                    cesadStageOpinionExpectedSignerId: true,
                  },
                },
              },
            },
          },
          orderBy: { sequence: 'asc' },
        },
      },
    });

    if (!process) {
      throw new NotFoundException(`Evaluation process ${processId} was not found`);
    }

    const stages: CesadFinalOpinionConsolidatedStageRef[] = process.stages.map((stage) => {
      const supervisorEvaluation = stage.supervisorEvaluation;
      const selfEvaluation = stage.selfEvaluation;
      const cesadStageOpinion = stage.cesadStageOpinion;
      const cesadOpinionDocument = stage.documents.find(
        (document) => document.documentType === PrismaDocumentType.CESAD_OPINION,
      );

      const expectedSigners = cesadStageOpinion?.expectedSigners ?? [];
      const completedSignatures = expectedSigners.filter((expectedSigner) =>
        (cesadOpinionDocument?.signatureRecords ?? []).some(
          (signature) =>
            signature.status === PrismaSignatureStatus.COMPLETED &&
            signature.signatoryRole === PrismaUserRole.CESAD_MEMBER &&
            (signature.cesadStageOpinionExpectedSignerId === expectedSigner.id ||
              signature.signatoryUserId === expectedSigner.actingUserId),
        ),
      ).length;

      return {
        stageId: stage.id,
        sequence: stage.sequence,
        stageCode: stage.stageCode,
        startedAt: stage.startedAt?.toISOString() ?? null,
        endedAt: stage.endedAt?.toISOString() ?? null,
        isComplete: isCompletedProcessStage(stage),
        supervisorEvaluation: supervisorEvaluation
          ? {
              id: supervisorEvaluation.id,
              status: this.toContractSupervisorEvaluationStatus(supervisorEvaluation.status),
              submittedAt: supervisorEvaluation.submittedAt?.toISOString() ?? null,
              summary: supervisorEvaluation.summary ?? null,
            }
          : null,
        selfEvaluation: selfEvaluation
          ? {
              id: selfEvaluation.id,
              status: this.toContractSelfEvaluationStatus(selfEvaluation.status),
              submittedAt: selfEvaluation.submittedAt?.toISOString() ?? null,
            }
          : null,
        cesadStageOpinion: cesadStageOpinion
          ? {
              id: cesadStageOpinion.id,
              status: this.toContractCesadStageOpinionStatus(cesadStageOpinion.status),
              stageConcept: cesadStageOpinion.stageConcept,
              stageResult: cesadStageOpinion.stageResult,
              completedAt: cesadStageOpinion.completedAt?.toISOString() ?? null,
            }
          : null,
        cesadOpinionDocument: cesadOpinionDocument
          ? {
              id: cesadOpinionDocument.id,
              documentType: this.toContractDocumentType(cesadOpinionDocument.documentType),
              documentStatus: this.toContractDocumentStatus(cesadOpinionDocument.documentStatus),
            }
          : null,
        cesadExpectedSignersCount: expectedSigners.length,
        cesadCompletedSignaturesCount: completedSignatures,
      };
    });

    return {
      generatedAt: new Date().toISOString(),
      processId,
      processStatus: process.status,
      stageCount: stages.length,
      completedStageCount: stages.filter((stage) => stage.isComplete).length,
      stages,
    };
  }

  private toContractSupervisorEvaluationStatus(status: PrismaSupervisorEvaluationStatus): string {
    return status as string;
  }

  private toContractSelfEvaluationStatus(status: PrismaSelfEvaluationStatus): string {
    return status as string;
  }

  private toContractCesadStageOpinionStatus(
    status: PrismaCesadStageOpinionStatus,
  ): CesadStageOpinionStatus {
    return status as CesadStageOpinionStatus;
  }

  private toContractDocumentType(type: PrismaDocumentType): DocumentType {
    return type as DocumentType;
  }

  private toContractDocumentStatus(status: PrismaDocumentStatus): DocumentStatus {
    return status as DocumentStatus;
  }
}
