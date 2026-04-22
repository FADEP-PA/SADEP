import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditEventType as PrismaAuditEventType,
  DocumentStatus as PrismaDocumentStatus,
  DocumentType as PrismaDocumentType,
  Prisma,
  PrismaClient,
  ProcessStatus as PrismaProcessStatus,
  SignatureStatus as PrismaSignatureStatus,
  SupervisorEvaluationStatus as PrismaSupervisorEvaluationStatus,
  UserRole as PrismaUserRole,
} from '@prisma/client';
import {
  AuditEventType,
  type AuditMetadata,
  DocumentType,
  ProcessAction,
  ProcessStatus,
  UserRole,
} from '@aep-pa/contracts';

import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../infrastructure/database/prisma.service';
import type {
  WorkflowHistoryItemDto,
  WorkflowResponseDto,
  WorkflowTransitionRequestDto,
} from './dto/workflow-transition.dto';
import {
  getAvailableWorkflowTransitions,
  getWorkflowTransition,
  isWorkflowAction,
  isWorkflowAuditEventType,
} from './workflow-catalog';

const CESAD_PROCESS_ACCESS_ALLOWED_STATUSES = new Set<ProcessStatus>([
  ProcessStatus.EM_ANALISE_CESAD,
  ProcessStatus.PARECER_EMITIDO,
]);

type ProcessAccessContext = {
  id: string;
  status: ProcessStatus;
  evaluatedUserId: string;
  currentStage: {
    id: string;
    sequence: number;
    stageCode: string;
    responsibleSupervisorUserId: string | null;
  };
};

export type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class ProcessesService {
  constructor(private readonly prismaService: PrismaService) {}

  async getWorkflow(processId: string, user: AuthenticatedUser): Promise<WorkflowResponseDto> {
    const process = await this.ensureUserHasProcessAccess(this.prismaService, processId, user);

    return {
      id: process.id,
      status: process.status,
      availableActions: this.getAllowedActions(process.status, user.role),
    };
  }

  async getWorkflowHistory(
    processId: string,
    user: AuthenticatedUser,
  ): Promise<WorkflowHistoryItemDto[]> {
    await this.ensureUserHasProcessAccess(this.prismaService, processId, user);

    const events = await this.prismaService.auditEvent.findMany({
      where: { evaluationProcessId: processId },
      orderBy: { occurredAt: 'asc' },
    });

    return events
      .filter((event) => isWorkflowAuditEventType(this.toContractAuditEventType(event.eventType)))
      .map((event) => {
        const metadata = this.asAuditMetadata(event.metadata);
        const eventType = this.toContractAuditEventType(event.eventType);

        return {
          id: event.id,
          action: metadata?.action ?? this.mapEventTypeToAction(eventType),
          eventType,
          actorUserId: event.actorUserId,
          actorRole: this.toContractUserRole(event.actorRole),
          beforeState: event.beforeState,
          afterState: event.afterState,
          comment: this.readComment(event.metadata),
          occurredAt: event.occurredAt.toISOString(),
        };
      });
  }

  async transitionWorkflow(
    processId: string,
    user: AuthenticatedUser,
    payload: WorkflowTransitionRequestDto,
  ): Promise<WorkflowResponseDto> {
    if (!isWorkflowAction(payload.action)) {
      throw new BadRequestException(`Unsupported workflow action: ${String(payload.action)}`);
    }

    return this.prismaService.$transaction(async (transaction) => {
      const status = await this.transitionWorkflowInTransaction(transaction, processId, user, payload);

      return {
        id: processId,
        status,
        availableActions: this.getAllowedActions(status, user.role),
      };
    });
  }

  async ensureProcessExists(processId: string): Promise<void> {
    const process = await this.prismaService.evaluationProcess.findUnique({
      where: { id: processId },
      select: { id: true },
    });

    if (!process) {
      throw new NotFoundException(`Evaluation process ${processId} was not found`);
    }
  }

  async resolveCurrentStageOrThrow(
    transaction: PrismaTransactionClient,
    processId: string,
  ): Promise<{
    id: string;
    sequence: number;
    stageCode: string;
    responsibleSupervisorUserId: string | null;
    startedAt: Date | null;
    endedAt: Date | null;
  }> {
    const stages = await transaction.processStage.findMany({
      where: { evaluationProcessId: processId },
      select: {
        id: true,
        sequence: true,
        stageCode: true,
        responsibleSupervisorUserId: true,
        startedAt: true,
        endedAt: true,
      },
      orderBy: { sequence: 'asc' },
    });

    if (stages.length === 0) {
      throw new NotFoundException(`No process stage was found for evaluation process ${processId}`);
    }

    const openStages = stages.filter((stage) => stage.endedAt === null);
    return (openStages.at(-1) ?? stages.at(-1)) as {
      id: string;
      sequence: number;
      stageCode: string;
      responsibleSupervisorUserId: string | null;
      startedAt: Date | null;
      endedAt: Date | null;
    };
  }

  async findStageBySequenceOrThrow(
    transaction: PrismaTransactionClient,
    processId: string,
    sequence: number,
  ): Promise<{
    id: string;
    sequence: number;
    stageCode: string;
    responsibleSupervisorUserId: string | null;
    startedAt: Date | null;
    endedAt: Date | null;
  }> {
    const stage = await transaction.processStage.findFirst({
      where: {
        evaluationProcessId: processId,
        sequence,
      },
      select: {
        id: true,
        sequence: true,
        stageCode: true,
        responsibleSupervisorUserId: true,
        startedAt: true,
        endedAt: true,
      },
    });

    if (!stage) {
      throw new NotFoundException(
        `Process stage ${sequence} was not found for evaluation process ${processId}`,
      );
    }

    return stage;
  }

  async transitionWorkflowInTransaction(
    transaction: PrismaTransactionClient,
    processId: string,
    user: AuthenticatedUser,
    payload: WorkflowTransitionRequestDto,
  ): Promise<ProcessStatus> {
    if (!isWorkflowAction(payload.action)) {
      throw new BadRequestException(`Unsupported workflow action: ${String(payload.action)}`);
    }

    const normalizedComment = this.normalizeComment(payload.comment);
    const process = await this.ensureUserHasProcessAccess(transaction, processId, user);

    return this.executeWorkflowTransition(transaction, process, user, payload, normalizedComment);
  }

  async transitionWorkflowAsResponsibleSupervisorInTransaction(
    transaction: PrismaTransactionClient,
    processId: string,
    user: AuthenticatedUser,
    payload: WorkflowTransitionRequestDto,
  ): Promise<ProcessStatus> {
    if (!isWorkflowAction(payload.action)) {
      throw new BadRequestException(`Unsupported workflow action: ${String(payload.action)}`);
    }

    if (user.role !== UserRole.IMMEDIATE_SUPERVISOR) {
      throw new ForbiddenException(`Role ${user.role} cannot execute action ${payload.action}`);
    }

    const normalizedComment = this.normalizeComment(payload.comment);
    const process = await this.getProcessAccessContextOrThrow(transaction, processId);
    const expectedSupervisorUserId = process.currentStage.responsibleSupervisorUserId;

    if (!expectedSupervisorUserId) {
      throw new ForbiddenException('Process stage does not define a responsible supervisor');
    }

    if (expectedSupervisorUserId !== user.sub) {
      throw new ForbiddenException('Authenticated user is not the responsible supervisor for this process stage');
    }

    return this.executeWorkflowTransition(transaction, process, user, payload, normalizedComment);
  }

  private async executeWorkflowTransition(
    transaction: PrismaTransactionClient,
    process: ProcessAccessContext,
    user: AuthenticatedUser,
    payload: WorkflowTransitionRequestDto,
    normalizedComment: string | null,
  ): Promise<ProcessStatus> {
    const transition = getWorkflowTransition(process.status, payload.action);

    if (!transition) {
      throw new BadRequestException(
        `Action ${payload.action} is not allowed when process is in status ${process.status}`,
      );
    }

    if (!transition.allowedRoles.includes(user.role)) {
      throw new ForbiddenException(`Role ${user.role} cannot execute action ${payload.action}`);
    }

    if (transition.requiresComment && !normalizedComment) {
      throw new BadRequestException(`Action ${payload.action} requires a non-empty comment`);
    }

    if (payload.action === ProcessAction.RELEASE_FOR_SERVER_SIGNATURE) {
      const supervisorEvaluation = await transaction.supervisorEvaluation.findUnique({
        where: { processStageId: process.currentStage.id },
        select: { status: true },
      });

      if (!supervisorEvaluation || supervisorEvaluation.status !== PrismaSupervisorEvaluationStatus.SUBMITTED) {
        throw new BadRequestException(
          'Process can only move to AGUARDANDO_ASSINATURA after a submitted supervisor evaluation exists',
        );
      }
    }

    if (payload.action === ProcessAction.SEND_TO_CESAD) {
      const documentsComplete = await this.areRequiredStageDocumentsComplete(
        transaction,
        process.id,
        process.currentStage.id,
      );

      if (!documentsComplete) {
        throw new BadRequestException(
          'Process can only move to EM_ANALISE_CESAD after both required stage documents are fully signed',
        );
      }
    }

    await transaction.evaluationProcess.update({
      where: { id: process.id },
      data: { status: this.toDatabaseProcessStatus(transition.to) },
    });

    const occurredAt = new Date().toISOString();
    const metadata: Prisma.InputJsonValue = {
      eventType: transition.eventType,
      action: transition.action,
      performedByUserId: user.sub,
      performedByRole: user.role,
      occurredAt,
      processStatus: transition.to,
      processStageId: process.currentStage.id,
      stageSequence: process.currentStage.sequence,
      stageCode: process.currentStage.stageCode,
      ...(normalizedComment ? { comment: normalizedComment } : {}),
    };

    await transaction.auditEvent.create({
      data: {
        evaluationProcessId: process.id,
        actorUserId: user.sub,
        actorRole: this.toDatabaseRole(user.role),
        eventType: this.toDatabaseAuditEventType(transition.eventType),
        beforeState: { status: process.status },
        afterState: { status: transition.to },
        metadata,
        occurredAt: new Date(occurredAt),
      },
    });

    return transition.to;
  }

  async findProcessOrThrow(transaction: PrismaTransactionClient, processId: string) {
    const process = await transaction.evaluationProcess.findUnique({
      where: { id: processId },
      select: { id: true, status: true, evaluatedUserId: true },
    });

    if (!process) {
      throw new NotFoundException(`Evaluation process ${processId} was not found`);
    }

    return process;
  }

  async areRequiredStageDocumentsComplete(
    transaction: PrismaTransactionClient,
    processId: string,
    processStageId: string,
  ): Promise<boolean> {
    const documents = await transaction.processDocument.findMany({
      where: {
        evaluationProcessId: processId,
        processStageId,
        documentType: {
          in: [PrismaDocumentType.SUPERVISOR_EVALUATION, PrismaDocumentType.SELF_EVALUATION],
        },
      },
      include: {
        signatureRecords: true,
      },
    });

    const supervisorEvaluationDocument = documents.find(
      (document) => document.documentType === PrismaDocumentType.SUPERVISOR_EVALUATION,
    );
    const selfEvaluationDocument = documents.find(
      (document) => document.documentType === PrismaDocumentType.SELF_EVALUATION,
    );

    return (
      this.isDocumentComplete(supervisorEvaluationDocument, DocumentType.SUPERVISOR_EVALUATION) &&
      this.isDocumentComplete(selfEvaluationDocument, DocumentType.SELF_EVALUATION)
    );
  }

  async ensureUserHasProcessAccess(
    transaction: PrismaTransactionClient,
    processId: string,
    user: AuthenticatedUser,
  ): Promise<ProcessAccessContext> {
    const process = await this.getProcessAccessContextOrThrow(transaction, processId);

    switch (user.role) {
      case UserRole.INTERN_SERVER:
        if (process.evaluatedUserId !== user.sub) {
          throw new ForbiddenException('Authenticated user is not the evaluated server for this process');
        }
        return process;
      case UserRole.IMMEDIATE_SUPERVISOR:
        throw new ForbiddenException(
          'Authenticated supervisor cannot access this public workflow endpoint directly',
        );
      case UserRole.CESAD_MEMBER:
        if (!CESAD_PROCESS_ACCESS_ALLOWED_STATUSES.has(process.status)) {
          throw new ForbiddenException(
            'Authenticated CESAD member does not have an active link to this process',
          );
        }
        return process;
      default:
        throw new ForbiddenException('Authenticated user does not have a legitimate link to this process');
    }
  }

  private getAllowedActions(status: ProcessStatus, role: UserRole): ProcessAction[] {
    return getAvailableWorkflowTransitions(status)
      .filter((transition) => transition.allowedRoles.includes(role))
      .map((transition) => transition.action);
  }

  private async getProcessAccessContextOrThrow(
    transaction: PrismaTransactionClient,
    processId: string,
  ): Promise<ProcessAccessContext> {
    const process = await transaction.evaluationProcess.findUnique({
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
            responsibleSupervisorUserId: true,
            endedAt: true,
          },
          orderBy: { sequence: 'asc' },
        },
      },
    });

    if (!process) {
      throw new NotFoundException(`Evaluation process ${processId} was not found`);
    }

    if (process.stages.length === 0) {
      throw new NotFoundException(`No process stage was found for evaluation process ${processId}`);
    }

    const openStages = process.stages.filter((stage) => stage.endedAt === null);
    const currentStage = openStages.at(-1) ?? process.stages.at(-1);

    if (!currentStage) {
      throw new NotFoundException(`No process stage was found for evaluation process ${processId}`);
    }

    return {
      id: process.id,
      status: this.toContractProcessStatus(process.status),
      evaluatedUserId: process.evaluatedUserId,
      currentStage: {
        id: currentStage.id,
        sequence: currentStage.sequence,
        stageCode: currentStage.stageCode,
        responsibleSupervisorUserId: currentStage.responsibleSupervisorUserId,
      },
    };
  }

  private normalizeComment(comment?: string): string | null {
    if (typeof comment !== 'string') {
      return null;
    }

    const normalizedComment = comment.trim();
    return normalizedComment.length > 0 ? normalizedComment : null;
  }

  private readComment(metadata: unknown): string | null {
    if (!metadata || typeof metadata !== 'object' || !('comment' in metadata)) {
      return null;
    }

    const comment = (metadata as Record<string, unknown>).comment;
    return typeof comment === 'string' && comment.trim().length > 0 ? comment : null;
  }

  private asAuditMetadata(metadata: unknown): AuditMetadata | null {
    if (!metadata || typeof metadata !== 'object') {
      return null;
    }

    const candidate = metadata as Partial<AuditMetadata>;

    if (
      typeof candidate.eventType !== 'string' ||
      typeof candidate.action !== 'string' ||
      typeof candidate.performedByUserId !== 'string' ||
      typeof candidate.performedByRole !== 'string' ||
      typeof candidate.occurredAt !== 'string'
    ) {
      return null;
    }

    return candidate as AuditMetadata;
  }

  private mapEventTypeToAction(eventType: AuditEventType): ProcessAction {
    switch (eventType) {
      case AuditEventType.SIGNATURE_REQUESTED:
        return ProcessAction.RELEASE_FOR_SERVER_SIGNATURE;
      case AuditEventType.SENT_TO_CESAD:
        return ProcessAction.SEND_TO_CESAD;
      case AuditEventType.CESAD_OPINION_ISSUED:
        return ProcessAction.ISSUE_CESAD_OPINION;
      case AuditEventType.ADJUSTMENT_REQUESTED:
        return ProcessAction.REQUEST_ADJUSTMENT;
      default:
        throw new BadRequestException(`Workflow history contains unsupported event type ${eventType}`);
    }
  }

  private isDocumentComplete(
    document:
      | {
          documentType: PrismaDocumentType;
          documentStatus: PrismaDocumentStatus;
          signatureRecords: Array<{
            signatoryRole: PrismaUserRole;
            status: PrismaSignatureStatus;
          }>;
        }
      | undefined,
    documentType: DocumentType,
  ): boolean {
    if (!document || document.documentStatus !== PrismaDocumentStatus.SIGNED) {
      return false;
    }

    const expectedRoles =
      documentType === DocumentType.SUPERVISOR_EVALUATION
        ? [PrismaUserRole.IMMEDIATE_SUPERVISOR, PrismaUserRole.INTERN_SERVER]
        : [PrismaUserRole.INTERN_SERVER, PrismaUserRole.IMMEDIATE_SUPERVISOR];

    return expectedRoles.every((role) =>
      document.signatureRecords.some(
        (signature) =>
          signature.signatoryRole === role && signature.status === PrismaSignatureStatus.COMPLETED,
      ),
    );
  }

  private toContractProcessStatus(status: PrismaProcessStatus): ProcessStatus {
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

  private toContractUserRole(role: PrismaUserRole | null): UserRole | null {
    if (role === null) {
      return null;
    }

    if (!Object.values(UserRole).includes(role as UserRole)) {
      throw new BadRequestException(`Unsupported user role ${role}`);
    }

    return role as UserRole;
  }

  private toDatabaseProcessStatus(status: ProcessStatus): PrismaProcessStatus {
    if (!Object.values(PrismaProcessStatus).includes(status as PrismaProcessStatus)) {
      throw new BadRequestException(`Unsupported process status ${status}`);
    }

    return status as PrismaProcessStatus;
  }

  private toDatabaseRole(role: UserRole): PrismaUserRole {
    if (!Object.values(PrismaUserRole).includes(role as PrismaUserRole)) {
      throw new BadRequestException(`Unsupported user role ${role}`);
    }

    return role as PrismaUserRole;
  }

  private toDatabaseAuditEventType(eventType: AuditEventType): PrismaAuditEventType {
    if (!Object.values(PrismaAuditEventType).includes(eventType as PrismaAuditEventType)) {
      throw new BadRequestException(`Unsupported audit event type ${eventType}`);
    }

    return eventType as PrismaAuditEventType;
  }
}
