import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditEventType as PrismaAuditEventType,
  DocumentType as PrismaDocumentType,
  SelfEvaluationStatus as PrismaSelfEvaluationStatus,
  SupervisorEvaluationStatus as PrismaSupervisorEvaluationStatus,
  UserRole as PrismaUserRole,
} from '@prisma/client';
import {
  AuditEventType,
  DocumentType,
  type CesadStageHistoryItemRef,
  type CesadStageReadSnapshotRef,
  ProcessAction,
  ProcessStatus,
  SelfEvaluationStatus,
  type SelfEvaluationRef,
  SupervisorEvaluationStatus,
  type SupervisorEvaluationRef,
  UserRole,
} from '@aep-pa/contracts';

import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../infrastructure/database/prisma.service';
import { ProcessDocumentsService } from '../application/documents/process-documents.service';
import { isSupervisorEvaluationContentDto } from './supervisor-evaluations/dto/supervisor-evaluation.dto';

const RELEVANT_HISTORY_EVENT_TYPES = new Set<AuditEventType>([
  AuditEventType.EVALUATION_STARTED,
  AuditEventType.EVALUATION_DRAFT_SAVED,
  AuditEventType.EVALUATION_COMPLETED,
  AuditEventType.EVALUATION_RECTIFIED,
  AuditEventType.DOCUMENT_GENERATED,
  AuditEventType.SIGNATURE_REQUESTED,
  AuditEventType.DOCUMENT_SIGNED,
  AuditEventType.SELF_EVALUATION_SUBMITTED,
  AuditEventType.SENT_TO_CESAD,
  AuditEventType.CESAD_OPINION_STARTED,
  AuditEventType.CESAD_OPINION_ISSUED,
  AuditEventType.CESAD_OPINION_SIGNED,
  AuditEventType.ADJUSTMENT_REQUESTED,
]);

const CESAD_STAGE_READ_ALLOWED_STATUSES = new Set<ProcessStatus>([
  ProcessStatus.EM_ANALISE_CESAD,
  ProcessStatus.PARECER_EMITIDO,
]);

@Injectable()
export class CesadStageReadService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly processDocumentsService: ProcessDocumentsService,
  ) {}

  async getStageReadSnapshot(
    processId: string,
    stageSequence: number,
    user: AuthenticatedUser,
  ): Promise<CesadStageReadSnapshotRef> {
    this.ensureCesadUser(user);

    const process = await this.prismaService.evaluationProcess.findUnique({
      where: { id: processId },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        evaluatedUser: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        stages: {
          select: {
            id: true,
            sequence: true,
            stageCode: true,
            startedAt: true,
            endedAt: true,
          },
          orderBy: { sequence: 'asc' },
        },
      },
    });

    if (!process) {
      throw new NotFoundException(`Evaluation process ${processId} was not found`);
    }

    const processStatus = this.toContractProcessStatus(process.status);
    this.ensureProcessStatusAllowsStageRead(processStatus);

    const stage = await this.prismaService.processStage.findFirst({
      where: {
        evaluationProcessId: processId,
        sequence: stageSequence,
      },
      select: {
        id: true,
        sequence: true,
        stageCode: true,
        startedAt: true,
        endedAt: true,
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
      },
    });

    if (!stage) {
      throw new NotFoundException(
        `Process stage ${stageSequence} was not found for evaluation process ${processId}`,
      );
    }

    const documents = await this.processDocumentsService.getCesadStageDocumentReadModel(
      this.prismaService,
      {
        processId,
        processStageId: stage.id,
        totalStages: process.stages.length,
      },
    );

    const history = await this.getRelevantStageHistory(processId, stage.id, stage.sequence, documents);
    const warnings = this.buildWarnings(process.stages.length, documents, history);

    return {
      readOnly: true,
      process: {
        id: process.id,
        status: processStatus,
        createdAt: process.createdAt.toISOString(),
        updatedAt: process.updatedAt.toISOString(),
      },
      server: {
        userId: process.evaluatedUser.id,
        email: process.evaluatedUser.email,
        role: this.toContractUserRole(process.evaluatedUser.role),
        displayName: this.resolveDisplayName(process.evaluatedUser.email),
        positionName: 'Cargo não informado no cadastro',
        registrationNumber: 'Matrícula não informada no cadastro',
      },
      stage: {
        stageId: stage.id,
        sequence: stage.sequence,
        stageCode: stage.stageCode,
        startedAt: stage.startedAt?.toISOString() ?? null,
        endedAt: stage.endedAt?.toISOString() ?? null,
        totalStages: process.stages.length,
      },
      documentationStatus: this.buildDocumentationStatus(documents),
      supervisorEvaluation: stage.supervisorEvaluation
        ? this.toSupervisorEvaluationRef(stage.supervisorEvaluation)
        : null,
      selfEvaluation: stage.selfEvaluation ? this.toSelfEvaluationRef(stage.selfEvaluation) : null,
      documents,
      history,
      warnings,
    };
  }

  private ensureCesadUser(user: AuthenticatedUser): void {
    if (user.role !== UserRole.CESAD_MEMBER) {
      throw new ForbiddenException('Only CESAD_MEMBER can access the consolidated stage read view');
    }
  }

  private ensureProcessStatusAllowsStageRead(status: ProcessStatus): void {
    if (!CESAD_STAGE_READ_ALLOWED_STATUSES.has(status)) {
      throw new BadRequestException(
        `CESAD consolidated stage read is only available while process is in ${ProcessStatus.EM_ANALISE_CESAD} or ${ProcessStatus.PARECER_EMITIDO} status`,
      );
    }
  }

  private buildDocumentationStatus(
    documents: Awaited<ReturnType<ProcessDocumentsService['getCesadStageDocumentReadModel']>>,
  ): CesadStageReadSnapshotRef['documentationStatus'] {
    const requiredInstructionDocumentTypes = [
      DocumentType.SUPERVISOR_EVALUATION,
      DocumentType.SELF_EVALUATION,
    ] as const;

    const missingRequiredDocumentTypes = requiredInstructionDocumentTypes.filter((documentType) =>
      documents.every((document) => document.documentType !== documentType || !document.exists),
    );
    const pendingSignatureDocumentTypes = documents
      .filter(
        (document) =>
          document.exists &&
          document.signatures.some((signature) => signature.status !== 'COMPLETED'),
      )
      .map((document) => document.documentType);
    const allRequiredDocumentsSigned =
      missingRequiredDocumentTypes.length === 0 && pendingSignatureDocumentTypes.length === 0;
    const stageInstructionStatus: CesadStageReadSnapshotRef['documentationStatus']['stageInstructionStatus'] =
      missingRequiredDocumentTypes.length > 0
        ? 'MISSING_REQUIRED_DOCUMENTS'
        : pendingSignatureDocumentTypes.length > 0
          ? 'PRESENT_WITH_PENDING_SIGNATURES'
          : 'COMPLETE';

    return {
      requiredDocumentTypes: [...requiredInstructionDocumentTypes],
      allRequiredDocumentsPresent: missingRequiredDocumentTypes.length === 0,
      allRequiredDocumentsSigned,
      missingRequiredDocumentTypes,
      pendingSignatureDocumentTypes,
      stageInstructionStatus,
    };
  }

  private async getRelevantStageHistory(
    processId: string,
    processStageId: string,
    stageSequence: number,
    documents: Awaited<ReturnType<ProcessDocumentsService['getCesadStageDocumentReadModel']>>,
  ): Promise<CesadStageHistoryItemRef[]> {
    const relevantDocumentIds = new Set(
      documents.filter((document) => document.documentId).map((document) => document.documentId as string),
    );

    const events = await this.prismaService.auditEvent.findMany({
      where: { evaluationProcessId: processId },
      orderBy: { occurredAt: 'asc' },
    });

    return events
      .filter((event) => {
        const eventType = this.toContractAuditEventType(event.eventType);
        if (!RELEVANT_HISTORY_EVENT_TYPES.has(eventType)) {
          return false;
        }

        const metadata = this.asMetadataRecord(event.metadata);
        if (metadata?.processStageId === processStageId) {
          return true;
        }

        if (metadata?.stageSequence === stageSequence) {
          return true;
        }

        const documentId = typeof metadata?.documentId === 'string' ? metadata.documentId : null;
        return documentId !== null && relevantDocumentIds.has(documentId);
      })
      .map((event) => {
        const metadata = this.asMetadataRecord(event.metadata);
        const actionCandidate = metadata?.action;

        return {
          id: event.id,
          eventType: this.toContractAuditEventType(event.eventType),
          action:
            typeof actionCandidate === 'string' && this.isProcessAction(actionCandidate)
              ? actionCandidate
              : null,
          actorUserId: event.actorUserId,
          actorRole: event.actorRole ? this.toContractUserRole(event.actorRole) : null,
          comment:
            typeof metadata?.comment === 'string' && metadata.comment.trim().length > 0
              ? metadata.comment
              : null,
          occurredAt: event.occurredAt.toISOString(),
        };
      })
      .slice(-10);
  }

  private buildWarnings(
    totalStages: number,
    documents: Awaited<ReturnType<ProcessDocumentsService['getCesadStageDocumentReadModel']>>,
    history: CesadStageHistoryItemRef[],
  ): string[] {
    const warnings: string[] = [];
    const fallbackDocuments = documents.filter(
      (document) => document.stageLinkMode === 'PROCESS_SINGLE_STAGE_FALLBACK',
    );

    if (fallbackDocuments.length > 0) {
      warnings.push(
        'Parte da leitura foi inferida a partir de documentos sem vínculo explícito de etapa, porque o processo possui apenas uma etapa cadastrada.',
      );
    }

    if (totalStages > 1 && history.length === 0) {
      warnings.push(
        'O histórico resumido ficou limitado porque os eventos antigos ainda não registram escopo fino de etapa no modelo atual.',
      );
    }

    return warnings;
  }

  private toSupervisorEvaluationRef(evaluation: {
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
  }): SupervisorEvaluationRef {
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
    };
  }

  private toSelfEvaluationRef(evaluation: {
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
  }): SelfEvaluationRef {
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
    };
  }

  private asMetadataRecord(metadata: unknown): Record<string, unknown> | null {
    if (!metadata || typeof metadata !== 'object') {
      return null;
    }

    return metadata as Record<string, unknown>;
  }

  private resolveDisplayName(email: string): string {
    const [localPart] = email.trim().split('@');
    const normalizedTokens = localPart
      .split(/[^a-zA-Z0-9]+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 0);

    if (normalizedTokens.length === 0) {
      return email;
    }

    return normalizedTokens
      .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
      .join(' ');
  }

  private isProcessAction(value: string): value is ProcessAction {
    return Object.values(ProcessAction).includes(value as ProcessAction);
  }

  private toContractProcessStatus(status: string): ProcessStatus {
    if (!Object.values(ProcessStatus).includes(status as ProcessStatus)) {
      throw new BadRequestException(`Unsupported process status ${status}`);
    }

    return status as ProcessStatus;
  }

  private toContractAuditEventType(eventType: PrismaAuditEventType): AuditEventType {
    if (!Object.values(AuditEventType).includes(eventType as AuditEventType)) {
      throw new BadRequestException(`Unsupported audit event type ${eventType}`);
    }

    return eventType as AuditEventType;
  }

  private toContractUserRole(role: PrismaUserRole): UserRole {
    if (!Object.values(UserRole).includes(role as UserRole)) {
      throw new BadRequestException(`Unsupported user role ${role}`);
    }

    return role as UserRole;
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
}
