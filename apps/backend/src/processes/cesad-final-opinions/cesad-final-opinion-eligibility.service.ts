import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CesadStageOpinionStatus as PrismaCesadStageOpinionStatus,
  DocumentStatus as PrismaDocumentStatus,
  DocumentType as PrismaDocumentType,
  ProcessStatus as PrismaProcessStatus,
  SelfEvaluationStatus as PrismaSelfEvaluationStatus,
  SignatureStatus as PrismaSignatureStatus,
  SupervisorEvaluationStatus as PrismaSupervisorEvaluationStatus,
  UserRole as PrismaUserRole,
} from '@prisma/client';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  CASE_2_PROCESS_STAGE_SEQUENCES,
  CASE_2_TOTAL_PROCESS_STAGES,
  isActiveProcessStage,
  isCompletedProcessStage,
} from '../process-stages.constants';
import type { PrismaTransactionClient } from '../processes.service';

export type CesadFinalOpinionEligibilityResult = {
  isEligible: boolean;
  reasons: string[];
  processId: string;
  processStatus: string;
  stageCount: number;
  completedStageCount: number;
};

@Injectable()
export class CesadFinalOpinionEligibilityService {
  constructor(private readonly prismaService: PrismaService) {}

  async evaluate(
    processId: string,
    client?: PrismaTransactionClient,
  ): Promise<CesadFinalOpinionEligibilityResult> {
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
              select: { id: true, status: true },
            },
            selfEvaluation: {
              select: { id: true, status: true },
            },
            cesadStageOpinions: {
              where: { supersededAt: null },
              select: {
                id: true,
                status: true,
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

    const reasons: string[] = [];
    const processStatus = process.status;

    if (processStatus !== PrismaProcessStatus.PARECER_EMITIDO) {
      reasons.push(
        `Process must be in PARECER_EMITIDO status; current status is ${processStatus}`,
      );
    }

    const stages = process.stages;
    const stageCount = stages.length;

    if (stageCount !== CASE_2_TOTAL_PROCESS_STAGES) {
      reasons.push(
        `Process must have exactly ${CASE_2_TOTAL_PROCESS_STAGES} stages; found ${stageCount}`,
      );
    }

    const sequenceSet = new Set(stages.map((stage) => stage.sequence));
    for (const expectedSequence of CASE_2_PROCESS_STAGE_SEQUENCES) {
      if (!sequenceSet.has(expectedSequence)) {
        reasons.push(`Process is missing stage sequence ${expectedSequence}`);
      }
    }

    const activeStage = stages.find(isActiveProcessStage);
    if (activeStage) {
      reasons.push(
        `Process must not have an active stage; stage ${activeStage.sequence} is still active`,
      );
    }

    const completedStages = stages.filter(isCompletedProcessStage);
    const completedStageCount = completedStages.length;

    if (completedStageCount !== CASE_2_TOTAL_PROCESS_STAGES) {
      reasons.push(
        `All ${CASE_2_TOTAL_PROCESS_STAGES} stages must be completed; ${completedStageCount} completed`,
      );
    }

    for (const stage of stages) {
      const stageLabel = `Stage ${stage.sequence}`;

      if (stage.startedAt === null) {
        reasons.push(`${stageLabel} has not started`);
      }
      if (stage.endedAt === null) {
        reasons.push(`${stageLabel} has not been formally completed (endedAt is null)`);
      }

      const supervisorEvaluation = stage.supervisorEvaluation;
      if (!supervisorEvaluation) {
        reasons.push(`${stageLabel} is missing the supervisor evaluation`);
      } else if (supervisorEvaluation.status !== PrismaSupervisorEvaluationStatus.SUBMITTED) {
        reasons.push(`${stageLabel} supervisor evaluation is not SUBMITTED`);
      }

      const selfEvaluation = stage.selfEvaluation;
      if (!selfEvaluation) {
        reasons.push(`${stageLabel} is missing the self evaluation`);
      } else if (selfEvaluation.status !== PrismaSelfEvaluationStatus.SUBMITTED) {
        reasons.push(`${stageLabel} self evaluation is not SUBMITTED`);
      }

      const supervisorDocument = stage.documents.find(
        (document) => document.documentType === PrismaDocumentType.SUPERVISOR_EVALUATION,
      );
      if (!supervisorDocument) {
        reasons.push(`${stageLabel} is missing the supervisor evaluation document`);
      } else if (supervisorDocument.documentStatus !== PrismaDocumentStatus.SIGNED) {
        reasons.push(`${stageLabel} supervisor evaluation document is not SIGNED`);
      }

      const selfDocument = stage.documents.find(
        (document) => document.documentType === PrismaDocumentType.SELF_EVALUATION,
      );
      if (!selfDocument) {
        reasons.push(`${stageLabel} is missing the self evaluation document`);
      } else if (selfDocument.documentStatus !== PrismaDocumentStatus.SIGNED) {
        reasons.push(`${stageLabel} self evaluation document is not SIGNED`);
      }

      const opinion = stage.cesadStageOpinions[0] ?? null;
      if (!opinion) {
        reasons.push(`${stageLabel} is missing the CESAD stage opinion`);
      } else if (opinion.status !== PrismaCesadStageOpinionStatus.COMPLETED) {
        reasons.push(`${stageLabel} CESAD stage opinion is not COMPLETED`);
      }

      const cesadOpinionDocument = stage.documents.find(
        (document) => document.documentType === PrismaDocumentType.CESAD_OPINION,
      );
      if (!cesadOpinionDocument) {
        reasons.push(`${stageLabel} is missing the CESAD opinion document`);
      } else if (cesadOpinionDocument.documentStatus !== PrismaDocumentStatus.SIGNED) {
        reasons.push(`${stageLabel} CESAD opinion document is not SIGNED`);
      } else if (opinion) {
        const expectedSigners = opinion.expectedSigners;
        if (expectedSigners.length === 0) {
          reasons.push(`${stageLabel} CESAD opinion document has no frozen expected signers`);
        } else {
          const allSigned = expectedSigners.every((expectedSigner) =>
            cesadOpinionDocument.signatureRecords.some(
              (signature) =>
                signature.status === PrismaSignatureStatus.COMPLETED &&
                signature.signatoryRole === PrismaUserRole.CESAD_MEMBER &&
                (signature.cesadStageOpinionExpectedSignerId === expectedSigner.id ||
                  signature.signatoryUserId === expectedSigner.actingUserId),
            ),
          );
          if (!allSigned) {
            reasons.push(`${stageLabel} CESAD opinion document is missing collegiate signatures`);
          }
        }
      }
    }

    return {
      isEligible: reasons.length === 0,
      reasons,
      processId,
      processStatus,
      stageCount,
      completedStageCount,
    };
  }
}
