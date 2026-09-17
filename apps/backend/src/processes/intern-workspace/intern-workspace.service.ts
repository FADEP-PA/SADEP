import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CesadCommissionMemberRoleType as PrismaCesadCommissionMemberRoleType,
  CesadStageOpinionExpectedSignerDerivationType as PrismaCesadStageOpinionExpectedSignerDerivationType,
  CesadStageOpinionSigningCapacity as PrismaCesadStageOpinionSigningCapacity,
  CesadStageOpinionStatus as PrismaCesadStageOpinionStatus,
  DocumentStatus as PrismaDocumentStatus,
  DocumentType as PrismaDocumentType,
  Prisma,
  ProcessStatus as PrismaProcessStatus,
  SelfEvaluationStatus as PrismaSelfEvaluationStatus,
  SignatureStatus as PrismaSignatureStatus,
  SupervisorEvaluationStatus as PrismaSupervisorEvaluationStatus,
  UserRole as PrismaUserRole,
} from '@prisma/client';
import {
  CesadCommissionMemberRoleType,
  CesadStageOpinionExpectedSignerDerivationType,
  CesadStageOpinionSigningCapacity,
  CesadStageOpinionStatus,
  type CesadStageOpinionExpectedSignerRef,
  type CesadStageOpinionRef,
  DocumentType,
  type InternServerWorkspaceSnapshotRef,
  ProcessStatus,
  SelfEvaluationStatus,
  type SelfEvaluationWithDocumentContextRef,
  SignatureStatus,
  SupervisorEvaluationStatus,
  type SupervisorEvaluationWithDocumentContextRef,
  UserRole,
} from '@sadep/contracts';

import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { ProcessDocumentsService } from '../../application/documents/process-documents.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { isSupervisorEvaluationContentDto } from '../supervisor-evaluations/dto/supervisor-evaluation.dto';

const NOTIFICATION_READY_STATUSES = new Set<ProcessStatus>([
  ProcessStatus.NOTIFICADO,
  ProcessStatus.CIENTE,
  ProcessStatus.ENCERRADO,
]);

@Injectable()
export class InternWorkspaceService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly processDocumentsService: ProcessDocumentsService,
  ) {}

  async getSnapshot(
    processId: string,
    user: AuthenticatedUser,
  ): Promise<InternServerWorkspaceSnapshotRef> {
    if (user.role !== UserRole.INTERN_SERVER) {
      throw new ForbiddenException('Only INTERN_SERVER can access the intern workspace');
    }

    const process = await this.prismaService.evaluationProcess.findUnique({
      where: { id: processId },
      select: {
        id: true,
        status: true,
        evaluatedUserId: true,
        stages: {
          select: {
            id: true,
            sequence: true,
            stageCode: true,
            startedAt: true,
            endedAt: true,
            responsibleSupervisorUserId: true,
            supervisorEvaluation: {
              select: {
                id: true,
                processId: true,
                processStageId: true,
                evaluatorUserId: true,
                status: true,
                summary: true,
                generalComments: true,
                content: true,
                submittedAt: true,
                createdAt: true,
                updatedAt: true,
              },
            },
            selfEvaluation: {
              select: {
                id: true,
                processId: true,
                processStageId: true,
                authorUserId: true,
                status: true,
                selfReflection: true,
                additionalNotes: true,
                submittedAt: true,
                createdAt: true,
                updatedAt: true,
              },
            },
            cesadStageOpinions: {
              where: { supersededAt: null },
              select: {
                id: true,
                processId: true,
                processStageId: true,
                authorUserId: true,
                status: true,
                reportText: true,
                legalBasis: true,
                conclusion: true,
                stageConcept: true,
                stageResult: true,
                completedAt: true,
                createdAt: true,
                updatedAt: true,
                expectedSigners: {
                  orderBy: { sortOrder: 'asc' },
                  select: {
                    id: true,
                    cesadStageOpinionId: true,
                    commissionId: true,
                    actingCommissionMemberId: true,
                    actingUserId: true,
                    derivationType: true,
                    signingCapacity: true,
                    substitutedCommissionMemberId: true,
                    nameSnapshot: true,
                    emailSnapshot: true,
                    roleTypeSnapshot: true,
                    sortOrder: true,
                    frozenAt: true,
                    createdAt: true,
                    updatedAt: true,
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

    if (process.evaluatedUserId !== user.sub) {
      throw new ForbiddenException('Authenticated user is not the evaluated server for this process');
    }

    if (process.stages.length === 0) {
      throw new NotFoundException(`No process stage was found for evaluation process ${processId}`);
    }

    const currentStage = this.resolveCurrentStage(process.stages);
    const processStatus = this.toContractProcessStatus(process.status);

    const viewableSupervisorEvaluation =
      currentStage.supervisorEvaluation?.status === PrismaSupervisorEvaluationStatus.SUBMITTED
        ? currentStage.supervisorEvaluation
        : null;
    const supervisorDocumentContext =
      viewableSupervisorEvaluation
        ? await this.processDocumentsService.getSupervisorEvaluationDocumentContext(
            this.prismaService,
            process.id,
            currentStage.id,
        )
        : null;
    const selfEvaluationDocumentContext =
      currentStage.selfEvaluation?.status === PrismaSelfEvaluationStatus.SUBMITTED
        ? await this.processDocumentsService.getSelfEvaluationDocumentContext(
            this.prismaService,
            process.id,
            currentStage.id,
          )
        : null;

    const supervisorEvaluation = viewableSupervisorEvaluation
      ? this.toSupervisorEvaluationRef(viewableSupervisorEvaluation, supervisorDocumentContext ?? undefined)
      : null;
    const selfEvaluation = currentStage.selfEvaluation
      ? this.toSelfEvaluationRef(currentStage.selfEvaluation, selfEvaluationDocumentContext ?? undefined)
      : null;

    const canSignSupervisorEvaluation = Boolean(
      processStatus === ProcessStatus.AGUARDANDO_ASSINATURA &&
        supervisorDocumentContext?.internSignaturePending,
    );
    const canManipulateSelfEvaluation = await this.canManipulateSelfEvaluation({
      processId: process.id,
      processStatus,
      currentStageId: currentStage.id,
      evaluatedUserId: process.evaluatedUserId,
      responsibleSupervisorUserId: currentStage.responsibleSupervisorUserId,
      supervisorEvaluationStatus: currentStage.supervisorEvaluation?.status ?? null,
      selfEvaluationStatus: currentStage.selfEvaluation?.status ?? null,
    });
    const cesadOpinionAccess = await this.buildCesadOpinionAccess(
      process.id,
      processStatus,
      currentStage,
    );

    return {
      process: {
        id: process.id,
        status: processStatus,
      },
      currentStage: {
        stageId: currentStage.id,
        sequence: currentStage.sequence,
        stageCode: currentStage.stageCode,
        startedAt: currentStage.startedAt?.toISOString() ?? null,
        endedAt: currentStage.endedAt?.toISOString() ?? null,
        totalStages: process.stages.length,
      },
      supervisorEvaluation,
      selfEvaluation,
      capabilities: {
        canViewSupervisorEvaluation: supervisorEvaluation !== null,
        canSignSupervisorEvaluation,
        canViewSelfEvaluation: selfEvaluation !== null,
        canEditSelfEvaluation: canManipulateSelfEvaluation,
        canSubmitSelfEvaluation: canManipulateSelfEvaluation,
      },
      cesadOpinionAccess,
    };
  }

  private resolveCurrentStage<T extends { startedAt: Date | null; endedAt: Date | null }>(
    stages: T[],
  ): T {
    const activeStages = stages.filter(
      (stage) => stage.startedAt !== null && stage.endedAt === null,
    );

    if (activeStages.length > 1) {
      throw new ConflictException('Evaluation process has more than one active process stage');
    }

    const startedStages = stages.filter((stage) => stage.startedAt !== null);
    const currentStage = activeStages[0] ?? startedStages.at(-1);

    if (!currentStage) {
      throw new NotFoundException('No active or completed process stage was found');
    }

    return currentStage;
  }

  private async canManipulateSelfEvaluation(params: {
    processId: string;
    processStatus: ProcessStatus;
    currentStageId: string;
    evaluatedUserId: string;
    responsibleSupervisorUserId: string | null;
    supervisorEvaluationStatus: PrismaSupervisorEvaluationStatus | null;
    selfEvaluationStatus: PrismaSelfEvaluationStatus | null;
  }): Promise<boolean> {
    if (params.processStatus !== ProcessStatus.AGUARDANDO_ASSINATURA) {
      return false;
    }

    if (!params.responsibleSupervisorUserId) {
      return false;
    }

    if (params.supervisorEvaluationStatus !== PrismaSupervisorEvaluationStatus.SUBMITTED) {
      return false;
    }

    if (params.selfEvaluationStatus === PrismaSelfEvaluationStatus.SUBMITTED) {
      return false;
    }

    return this.processDocumentsService.hasCompletedSupervisorEvaluationSignatures(
      this.prismaService,
      params.processId,
      params.currentStageId,
      params.evaluatedUserId,
    );
  }

  private async buildCesadOpinionAccess(
    processId: string,
    processStatus: ProcessStatus,
    stage: {
      id: string;
      sequence: number;
      cesadStageOpinions: Array<Parameters<InternWorkspaceService['toCesadStageOpinionRef']>[0]>;
    },
  ): Promise<InternServerWorkspaceSnapshotRef['cesadOpinionAccess']> {
    const requiresFormalNotification = stage.sequence === 4;
    const cesadStageOpinion = stage.cesadStageOpinions[0] ?? null;

    if (!cesadStageOpinion) {
      return {
        canView: false,
        blockedReason: 'Parecer CESAD ainda não foi registrado para esta etapa.',
        requiresFormalNotification,
        opinion: null,
      };
    }

    if (cesadStageOpinion.status !== PrismaCesadStageOpinionStatus.COMPLETED) {
      return {
        canView: false,
        blockedReason: 'Parecer CESAD ainda não foi concluído.',
        requiresFormalNotification,
        opinion: null,
      };
    }

    if (!(await this.hasFullySignedCesadOpinionDocument(processId, stage.id))) {
      return {
        canView: false,
        blockedReason: 'Parecer CESAD ainda não possui documento formal assinado integralmente.',
        requiresFormalNotification,
        opinion: null,
      };
    }

    if (requiresFormalNotification && !NOTIFICATION_READY_STATUSES.has(processStatus)) {
      return {
        canView: false,
        blockedReason: 'Parecer CESAD da etapa 4 depende de notificação formal ao servidor.',
        requiresFormalNotification,
        opinion: null,
      };
    }

    return {
      canView: true,
      blockedReason: null,
      requiresFormalNotification,
      opinion: this.toCesadStageOpinionRef(cesadStageOpinion),
    };
  }

  private async hasFullySignedCesadOpinionDocument(
    processId: string,
    processStageId: string,
  ): Promise<boolean> {
    const document = await this.prismaService.processDocument.findFirst({
      where: {
        evaluationProcessId: processId,
        processStageId,
        documentType: PrismaDocumentType.CESAD_OPINION,
      },
      include: {
        signatureRecords: true,
      },
    });

    if (!document || document.documentStatus !== PrismaDocumentStatus.SIGNED) {
      return false;
    }

    return (
      document.signatureRecords.length > 0 &&
      document.signatureRecords.every(
        (signature) => signature.status === PrismaSignatureStatus.COMPLETED,
      )
    );
  }

  private toSupervisorEvaluationRef(
    evaluation: {
      id: string;
      processId: string;
      processStageId: string;
      evaluatorUserId: string;
      status: PrismaSupervisorEvaluationStatus;
      summary: string;
      generalComments: string;
      content: unknown;
      submittedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    },
    documentContext?: SupervisorEvaluationWithDocumentContextRef['documentContext'],
  ): SupervisorEvaluationWithDocumentContextRef {
    if (!isSupervisorEvaluationContentDto(evaluation.content)) {
      throw new BadRequestException('Stored supervisor evaluation content is invalid');
    }

    return {
      id: evaluation.id,
      processId: evaluation.processId,
      processStageId: evaluation.processStageId,
      evaluatorUserId: evaluation.evaluatorUserId,
      status: this.toContractSupervisorEvaluationStatus(evaluation.status),
      summary: evaluation.summary,
      generalComments: evaluation.generalComments,
      content: {
        criteria: evaluation.content.criteria.map((criterion) => ({
          code: criterion.code,
          label: criterion.label,
          rating: criterion.rating,
          ...(criterion.comment !== undefined ? { comment: criterion.comment } : {}),
        })),
      },
      submittedAt: evaluation.submittedAt?.toISOString() ?? null,
      createdAt: evaluation.createdAt.toISOString(),
      updatedAt: evaluation.updatedAt.toISOString(),
      ...(documentContext ? { documentContext } : {}),
    };
  }

  private toSelfEvaluationRef(
    evaluation: {
      id: string;
      processId: string;
      processStageId: string;
      authorUserId: string;
      status: PrismaSelfEvaluationStatus;
      selfReflection: string;
      additionalNotes: string | null;
      submittedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    },
    documentContext?: SelfEvaluationWithDocumentContextRef['documentContext'],
  ): SelfEvaluationWithDocumentContextRef {
    return {
      id: evaluation.id,
      processId: evaluation.processId,
      processStageId: evaluation.processStageId,
      authorUserId: evaluation.authorUserId,
      status: this.toContractSelfEvaluationStatus(evaluation.status),
      selfReflection: evaluation.selfReflection,
      additionalNotes: evaluation.additionalNotes,
      submittedAt: evaluation.submittedAt?.toISOString() ?? null,
      createdAt: evaluation.createdAt.toISOString(),
      updatedAt: evaluation.updatedAt.toISOString(),
      ...(documentContext ? { documentContext } : {}),
    };
  }

  private toCesadStageOpinionRef(opinion: {
    id: string;
    processId: string;
    processStageId: string;
    authorUserId: string;
    status: PrismaCesadStageOpinionStatus;
    reportText: string;
    legalBasis: string | null;
    conclusion: string;
    stageConcept: string | null;
    stageResult: string | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    expectedSigners: Array<{
      id: string;
      cesadStageOpinionId: string;
      commissionId: string;
      actingCommissionMemberId: string;
      actingUserId: string;
      derivationType: PrismaCesadStageOpinionExpectedSignerDerivationType;
      signingCapacity: PrismaCesadStageOpinionSigningCapacity;
      substitutedCommissionMemberId: string | null;
      nameSnapshot: string;
      emailSnapshot: string;
      roleTypeSnapshot: PrismaCesadCommissionMemberRoleType;
      sortOrder: number;
      frozenAt: Date;
      createdAt: Date;
      updatedAt: Date;
    }>;
  }): CesadStageOpinionRef {
    return {
      id: opinion.id,
      scope: 'STAGE',
      processId: opinion.processId,
      processStageId: opinion.processStageId,
      authorUserId: opinion.authorUserId,
      status: this.toContractCesadStageOpinionStatus(opinion.status),
      reportText: opinion.reportText,
      legalBasis: opinion.legalBasis,
      conclusion: opinion.conclusion,
      stageConcept: opinion.stageConcept,
      stageResult: opinion.stageResult,
      completedAt: opinion.completedAt?.toISOString() ?? null,
      expectedSigners: opinion.expectedSigners.map((signer) => this.toExpectedSignerRef(signer)),
      createdAt: opinion.createdAt.toISOString(),
      updatedAt: opinion.updatedAt.toISOString(),
    };
  }

  private toExpectedSignerRef(signer: {
    id: string;
    cesadStageOpinionId: string;
    commissionId: string;
    actingCommissionMemberId: string;
    actingUserId: string;
    derivationType: PrismaCesadStageOpinionExpectedSignerDerivationType;
    signingCapacity: PrismaCesadStageOpinionSigningCapacity;
    substitutedCommissionMemberId: string | null;
    nameSnapshot: string;
    emailSnapshot: string;
    roleTypeSnapshot: PrismaCesadCommissionMemberRoleType;
    sortOrder: number;
    frozenAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }): CesadStageOpinionExpectedSignerRef {
    return {
      id: signer.id,
      cesadStageOpinionId: signer.cesadStageOpinionId,
      commissionId: signer.commissionId,
      actingCommissionMemberId: signer.actingCommissionMemberId,
      actingUserId: signer.actingUserId,
      derivationType: this.toContractExpectedSignerDerivationType(signer.derivationType),
      signingCapacity: this.toContractSigningCapacity(signer.signingCapacity),
      substitutedCommissionMemberId: signer.substitutedCommissionMemberId,
      nameSnapshot: signer.nameSnapshot,
      emailSnapshot: signer.emailSnapshot,
      roleTypeSnapshot: this.toContractCommissionMemberRoleType(signer.roleTypeSnapshot),
      sortOrder: signer.sortOrder,
      frozenAt: signer.frozenAt.toISOString(),
      createdAt: signer.createdAt.toISOString(),
      updatedAt: signer.updatedAt.toISOString(),
    };
  }

  private toContractProcessStatus(status: PrismaProcessStatus): ProcessStatus {
    if (!Object.values(ProcessStatus).includes(status as ProcessStatus)) {
      throw new BadRequestException(`Unsupported process status ${status}`);
    }

    return status as ProcessStatus;
  }

  private toContractSupervisorEvaluationStatus(
    status: PrismaSupervisorEvaluationStatus,
  ): SupervisorEvaluationStatus {
    if (!Object.values(SupervisorEvaluationStatus).includes(status as SupervisorEvaluationStatus)) {
      throw new BadRequestException(`Unsupported supervisor evaluation status ${status}`);
    }

    return status as SupervisorEvaluationStatus;
  }

  private toContractSelfEvaluationStatus(status: PrismaSelfEvaluationStatus): SelfEvaluationStatus {
    if (!Object.values(SelfEvaluationStatus).includes(status as SelfEvaluationStatus)) {
      throw new BadRequestException(`Unsupported self evaluation status ${status}`);
    }

    return status as SelfEvaluationStatus;
  }

  private toContractCesadStageOpinionStatus(
    status: PrismaCesadStageOpinionStatus,
  ): CesadStageOpinionStatus {
    if (!Object.values(CesadStageOpinionStatus).includes(status as CesadStageOpinionStatus)) {
      throw new BadRequestException(`Unsupported CESAD stage opinion status ${status}`);
    }

    return status as CesadStageOpinionStatus;
  }

  private toContractExpectedSignerDerivationType(
    derivationType: PrismaCesadStageOpinionExpectedSignerDerivationType,
  ): CesadStageOpinionExpectedSignerDerivationType {
    if (
      !Object.values(CesadStageOpinionExpectedSignerDerivationType).includes(
        derivationType as CesadStageOpinionExpectedSignerDerivationType,
      )
    ) {
      throw new BadRequestException(
        `Unsupported CESAD opinion expected signer derivation type ${derivationType}`,
      );
    }

    return derivationType as CesadStageOpinionExpectedSignerDerivationType;
  }

  private toContractSigningCapacity(
    signingCapacity: PrismaCesadStageOpinionSigningCapacity,
  ): CesadStageOpinionSigningCapacity {
    if (
      !Object.values(CesadStageOpinionSigningCapacity).includes(
        signingCapacity as CesadStageOpinionSigningCapacity,
      )
    ) {
      throw new BadRequestException(
        `Unsupported CESAD opinion signing capacity ${signingCapacity}`,
      );
    }

    return signingCapacity as CesadStageOpinionSigningCapacity;
  }

  private toContractCommissionMemberRoleType(
    role: PrismaCesadCommissionMemberRoleType,
  ): CesadCommissionMemberRoleType {
    if (!Object.values(CesadCommissionMemberRoleType).includes(role as CesadCommissionMemberRoleType)) {
      throw new BadRequestException(`Unsupported CESAD commission member role type ${role}`);
    }

    return role as CesadCommissionMemberRoleType;
  }
}
