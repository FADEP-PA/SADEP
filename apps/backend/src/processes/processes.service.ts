import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CesadCommissionStatus as PrismaCesadCommissionStatus,
  CesadStageAssignmentStatus as PrismaCesadStageAssignmentStatus,
  DocumentType as PrismaDocumentType,
  Prisma,
  SupervisorEvaluationStatus as PrismaSupervisorEvaluationStatus,
  UserRole as PrismaUserRole,
} from '@prisma/client';
import {
  AuditEventType,
  type AuditMetadata,
  ProcessAction,
  ProcessStatus,
  UserRole,
} from '@sadep/contracts';

import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CesadContextAuthorizationService } from '../cesad/authorization/cesad-context-authorization.service';
import { PrismaService } from '../infrastructure/database/prisma.service';
import type {
  WorkflowHistoryItemDto,
  WorkflowResponseDto,
  WorkflowTransitionRequestDto,
} from './dto/workflow-transition.dto';
import {
  CASE_2_FINAL_PROCESS_STAGE_SEQUENCE,
  isActiveProcessStage,
  isCompletedProcessStage,
  isFutureProcessStage,
} from './process-stages.constants';
import { ProcessStageService } from './process-stage.service';
import {
  type ProcessAccessContext,
  toDatabaseAuditEventType,
  toDatabaseProcessStatus,
  toDatabaseRole,
  toContractAuditEventType,
  toContractProcessStatus,
  toContractUserRole,
} from './process-type-mappers';
import { StageClosureGuardService } from './stage-closure-guard.service';
import {
  getAvailableWorkflowTransitions,
  getWorkflowTransition,
  isWorkflowAction,
  isWorkflowAuditEventTypeForAction,
} from './workflow-catalog';

import type { PrismaTransactionClient } from './process-type-mappers';
export type { PrismaTransactionClient };

const CESAD_PROCESS_ACCESS_ALLOWED_STATUSES = new Set<ProcessStatus>([
  ProcessStatus.EM_ANALISE_CESAD,
  ProcessStatus.PARECER_EMITIDO,
]);

const CESAD_CONTEXTUAL_TRANSITION_ACTIONS = new Set<ProcessAction>([
  ProcessAction.ISSUE_CESAD_OPINION,
  ProcessAction.REQUEST_ADJUSTMENT,
  ProcessAction.COMPLETE_CURRENT_STAGE,
]);

const CESAD_STAGE_ASSIGNMENT_SUPERSEDER_ROLES = new Set<UserRole>([
  UserRole.ADMIN,
  UserRole.HOMOLOGATION_AUTHORITY,
]);

type CesadStageAssignmentTransitionContext = {
  id: string;
  commissionId: string;
  status: PrismaCesadStageAssignmentStatus;
  created: boolean;
};

type SupersedeCesadStageAssignmentPayload = {
  newCommissionId: string;
  reason: string;
  referenceDate?: Date;
  formalActReference?: string;
};

type SupersedeCesadStageAssignmentResponse = {
  processId: string;
  processStageId: string;
  stageSequence: number;
  previousAssignmentId: string;
  newAssignmentId: string;
  previousCommissionId: string;
  newCommissionId: string;
  supersededAt: string;
  referenceDate: string;
  reason: string;
  formalActReference: string | null;
};

@Injectable()
export class ProcessesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly cesadContextAuthorizationService: CesadContextAuthorizationService,
    private readonly processStageService: ProcessStageService,
    private readonly stageClosureGuardService: StageClosureGuardService,
  ) {}

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
      .filter((event) =>
        this.isPublicWorkflowHistoryEvent(
          toContractAuditEventType(event.eventType),
          event.metadata,
        ),
      )
      .map((event) => {
        const metadata = this.asAuditMetadata(event.metadata);
        const eventType = toContractAuditEventType(event.eventType);

        return {
          id: event.id,
          action: metadata?.action ?? this.mapEventTypeToAction(eventType),
          eventType,
          actorUserId: event.actorUserId,
          actorRole: toContractUserRole(event.actorRole),
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

  async supersedeCesadStageAssignment(
    processId: string,
    stageSequence: number,
    user: AuthenticatedUser,
    payload: SupersedeCesadStageAssignmentPayload,
  ): Promise<SupersedeCesadStageAssignmentResponse> {
    this.ensureCanSupersedeCesadStageAssignment(user);
    const normalizedReason = this.normalizeRequiredText(payload.reason, 'CESAD stage assignment supersession reason');
    const newCommissionId = this.normalizeRequiredText(payload.newCommissionId, 'New CESAD commission id');
    const referenceDate = payload.referenceDate ?? new Date();
    const formalActReference = this.normalizeOptionalText(payload.formalActReference);

    return this.prismaService.$transaction(async (transaction) => {
      const process = await this.processStageService.findProcessOrThrow(transaction, processId);
      const processStatus = toContractProcessStatus(process.status);

      if (processStatus !== ProcessStatus.EM_ANALISE_CESAD) {
        throw new BadRequestException(
          `CESAD stage assignment can only be superseded while process is in ${ProcessStatus.EM_ANALISE_CESAD} status`,
        );
      }

      const stage = await this.processStageService.findStageBySequenceOrThrow(transaction, processId, stageSequence);
      this.processStageService.assertStageIsActiveForArtifactCreation(stage);

      const activeAssignments = await transaction.cesadStageAssignment.findMany({
        where: {
          processId,
          processStageId: stage.id,
          status: PrismaCesadStageAssignmentStatus.ACTIVE,
        },
        select: { id: true, commissionId: true, status: true },
        orderBy: { assignedAt: 'desc' },
      });

      if (activeAssignments.length === 0) {
        throw new BadRequestException(
          'Cannot supersede CESAD stage assignment because no active assignment was found for the stage',
        );
      }

      if (activeAssignments.length > 1) {
        throw new ConflictException(
          'Cannot supersede CESAD stage assignment because the stage has more than one active assignment',
        );
      }

      const previousAssignment = activeAssignments[0]!;
      if (previousAssignment.commissionId === newCommissionId) {
        throw new BadRequestException(
          'Cannot supersede CESAD stage assignment with the same CESAD commission',
        );
      }

      const newCommission = await transaction.cesadCommission.findUnique({
        where: { id: newCommissionId },
        select: {
          id: true,
          status: true,
          effectiveStartDate: true,
          effectiveEndDate: true,
        },
      });

      if (!newCommission) {
        throw new NotFoundException('New CESAD commission was not found');
      }

      if (newCommission.status !== PrismaCesadCommissionStatus.ACTIVE) {
        throw new BadRequestException(
          'Cannot supersede CESAD stage assignment with a CESAD commission that is not ACTIVE',
        );
      }

      if (
        newCommission.effectiveStartDate > referenceDate ||
        (newCommission.effectiveEndDate !== null && newCommission.effectiveEndDate < referenceDate)
      ) {
        throw new BadRequestException(
          'Cannot supersede CESAD stage assignment with a CESAD commission outside the reference date validity window',
        );
      }

      const expectedSignerCount = await transaction.cesadStageOpinionExpectedSigner.count({
        where: { cesadStageOpinion: { processStageId: stage.id } },
      });

      if (expectedSignerCount > 0) {
        throw new BadRequestException(
          'Cannot supersede CESAD stage assignment after CESAD stage opinion expected signers have been frozen',
        );
      }

      const existingOpinion = await transaction.cesadStageOpinion.findUnique({
        where: { processStageId: stage.id },
        select: { id: true },
      });

      if (existingOpinion) {
        throw new BadRequestException(
          'Cannot supersede CESAD stage assignment after a CESAD stage opinion exists for the stage',
        );
      }

      const existingCesadOpinionDocument = await transaction.processDocument.findFirst({
        where: {
          evaluationProcessId: processId,
          processStageId: stage.id,
          documentType: PrismaDocumentType.CESAD_OPINION,
        },
        select: { id: true },
      });

      if (existingCesadOpinionDocument) {
        throw new BadRequestException(
          'Cannot supersede CESAD stage assignment after a CESAD opinion document exists for the stage',
        );
      }

      const occurredAt = new Date();
      const newAssignment = await transaction.cesadStageAssignment.create({
        data: {
          processId,
          processStageId: stage.id,
          commissionId: newCommission.id,
          status: PrismaCesadStageAssignmentStatus.ACTIVE,
          assignedAt: occurredAt,
          assignedByUserId: user.sub,
          assignmentReason: normalizedReason,
          referenceDate,
        },
        select: { id: true, commissionId: true, status: true },
      });

      await transaction.cesadStageAssignment.update({
        where: { id: previousAssignment.id },
        data: {
          status: PrismaCesadStageAssignmentStatus.SUPERSEDED,
          supersededAt: occurredAt,
          supersededReason: normalizedReason,
          supersededByAssignmentId: newAssignment.id,
        },
      });

      await transaction.auditEvent.create({
        data: {
          evaluationProcessId: processId,
          actorUserId: user.sub,
          actorRole: toDatabaseRole(user.role),
          eventType: toDatabaseAuditEventType(AuditEventType.CESAD_STAGE_ASSIGNMENT_SUPERSEDED),
          beforeState: {
            cesadStageAssignmentId: previousAssignment.id,
            cesadStageAssignmentStatus: previousAssignment.status,
            cesadCommissionId: previousAssignment.commissionId,
          },
          afterState: {
            previousAssignmentId: previousAssignment.id,
            previousAssignmentStatus: PrismaCesadStageAssignmentStatus.SUPERSEDED,
            newAssignmentId: newAssignment.id,
            newAssignmentStatus: newAssignment.status,
            newCommissionId: newAssignment.commissionId,
          },
          occurredAt,
          metadata: {
            eventType: AuditEventType.CESAD_STAGE_ASSIGNMENT_SUPERSEDED,
            action: ProcessAction.SUPERSEDE_CESAD_STAGE_ASSIGNMENT,
            processId,
            processStageId: stage.id,
            stageSequence: stage.sequence,
            stageCode: stage.stageCode,
            processStatus,
            previousAssignmentId: previousAssignment.id,
            newAssignmentId: newAssignment.id,
            previousCommissionId: previousAssignment.commissionId,
            newCommissionId: newAssignment.commissionId,
            performedByUserId: user.sub,
            performedByRole: user.role,
            reason: normalizedReason,
            referenceDate: referenceDate.toISOString(),
            occurredAt: occurredAt.toISOString(),
            ...(formalActReference ? { formalActReference } : {}),
          },
        },
      });

      return {
        processId,
        processStageId: stage.id,
        stageSequence: stage.sequence,
        previousAssignmentId: previousAssignment.id,
        newAssignmentId: newAssignment.id,
        previousCommissionId: previousAssignment.commissionId,
        newCommissionId: newAssignment.commissionId,
        supersededAt: occurredAt.toISOString(),
        referenceDate: referenceDate.toISOString(),
        reason: normalizedReason,
        formalActReference: formalActReference ?? null,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Delegating wrappers — stage lifecycle (ProcessStageService)
  // ---------------------------------------------------------------------------

  async ensureProcessExists(processId: string): Promise<void> {
    return this.processStageService.ensureProcessExists(processId);
  }

  async resolveCurrentStageOrThrow(
    transaction: PrismaTransactionClient,
    processId: string,
  ) {
    return this.processStageService.resolveCurrentStageOrThrow(transaction, processId);
  }

  async resolveLatestStartedStageForReadOrThrow(
    transaction: PrismaTransactionClient,
    processId: string,
  ) {
    return this.processStageService.resolveLatestStartedStageForReadOrThrow(transaction, processId);
  }

  async ensureFourProcessStages(
    transaction: PrismaTransactionClient,
    processId: string,
    options: { referenceDate?: Date } = {},
  ) {
    return this.processStageService.ensureFourProcessStages(transaction, processId, options);
  }

  async findStageBySequenceOrThrow(
    transaction: PrismaTransactionClient,
    processId: string,
    sequence: number,
  ) {
    return this.processStageService.findStageBySequenceOrThrow(transaction, processId, sequence);
  }

  assertStageIsActiveForArtifactCreation(stage: {
    sequence: number;
    stageCode: string;
    startedAt: Date | null;
    endedAt: Date | null;
  }): void {
    return this.processStageService.assertStageIsActiveForArtifactCreation(stage);
  }

  async findProcessOrThrow(transaction: PrismaTransactionClient, processId: string) {
    return this.processStageService.findProcessOrThrow(transaction, processId);
  }

  // ---------------------------------------------------------------------------
  // Delegating wrappers — stage closure validation (StageClosureGuardService)
  // ---------------------------------------------------------------------------

  async areRequiredStageDocumentsComplete(
    transaction: PrismaTransactionClient,
    processId: string,
    processStageId: string,
  ): Promise<boolean> {
    return this.stageClosureGuardService.areRequiredStageDocumentsComplete(
      transaction,
      processId,
      processStageId,
    );
  }

  async ensureCurrentStageIsCompleteForStageClosure(
    transaction: PrismaTransactionClient,
    process: ProcessAccessContext,
  ) {
    return this.stageClosureGuardService.ensureCurrentStageIsCompleteForStageClosure(
      transaction,
      process,
    );
  }

  async ensureCompletedCesadStageOpinionAndFreezeExpectedSignersForStage(
    transaction: PrismaTransactionClient,
    processId: string,
    processStageId: string,
    frozenAt: Date,
  ): Promise<void> {
    return this.stageClosureGuardService.ensureCompletedCesadStageOpinionAndFreezeExpectedSignersForStage(
      transaction,
      processId,
      processStageId,
      frozenAt,
    );
  }

  // ---------------------------------------------------------------------------
  // Workflow transition internals
  // ---------------------------------------------------------------------------

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
    const process = await this.ensureUserHasProcessAccessForWorkflowAction(
      transaction,
      processId,
      user,
      payload.action,
    );

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

    if (CESAD_CONTEXTUAL_TRANSITION_ACTIONS.has(payload.action)) {
      await this.cesadContextAuthorizationService.ensureCanTransitionCesadProcess({
        user,
        allowAdmin: true,
        processStageId: process.currentStage.id,
        transaction,
      });
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

    const occurredAt = new Date().toISOString();
    let cesadStageAssignment: CesadStageAssignmentTransitionContext | null = null;

    if (payload.action === ProcessAction.SEND_TO_CESAD) {
      const documentsComplete = await this.stageClosureGuardService.areRequiredStageDocumentsComplete(
        transaction,
        process.id,
        process.currentStage.id,
      );

      if (!documentsComplete) {
        throw new BadRequestException(
          'Process can only move to EM_ANALISE_CESAD after both required stage documents are fully signed',
        );
      }

      cesadStageAssignment = await this.ensureActiveCesadStageAssignment(
        transaction,
        process,
        user,
        new Date(occurredAt),
      );
    }

    if (payload.action === ProcessAction.ISSUE_CESAD_OPINION) {
      await this.stageClosureGuardService.ensureCompletedCesadStageOpinionAndFreezeExpectedSignersForStage(
        transaction,
        process.id,
        process.currentStage.id,
        new Date(occurredAt),
      );
      await this.stageClosureGuardService.ensureSignedCesadOpinionDocumentForIssue(transaction, process);
    }

    if (payload.action === ProcessAction.COMPLETE_CURRENT_STAGE) {
      return this.executeCompleteCurrentStageTransition(
        transaction,
        process,
        user,
        transition.eventType,
        transition.action,
        normalizedComment,
        new Date(occurredAt),
      );
    }

    await transaction.evaluationProcess.update({
      where: { id: process.id },
      data: { status: toDatabaseProcessStatus(transition.to) },
    });

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
      ...(cesadStageAssignment
        ? {
            cesadStageAssignmentId: cesadStageAssignment.id,
            cesadCommissionId: cesadStageAssignment.commissionId,
            cesadStageAssignmentStatus: cesadStageAssignment.status,
            cesadStageAssignmentCreated: cesadStageAssignment.created,
          }
        : {}),
      ...(normalizedComment ? { comment: normalizedComment } : {}),
    };

    await transaction.auditEvent.create({
      data: {
        evaluationProcessId: process.id,
        actorUserId: user.sub,
        actorRole: toDatabaseRole(user.role),
        eventType: toDatabaseAuditEventType(transition.eventType),
        beforeState: { status: process.status },
        afterState: { status: transition.to },
        metadata,
        occurredAt: new Date(occurredAt),
      },
    });

    return transition.to;
  }

  private async executeCompleteCurrentStageTransition(
    transaction: PrismaTransactionClient,
    process: ProcessAccessContext,
    user: AuthenticatedUser,
    eventType: AuditEventType,
    action: ProcessAction,
    normalizedComment: string | null,
    occurredAt: Date,
  ): Promise<ProcessStatus> {
    const completenessSummary = await this.stageClosureGuardService.ensureCurrentStageIsCompleteForStageClosure(
      transaction,
      process,
    );

    const stages = await transaction.processStage.findMany({
      where: { evaluationProcessId: process.id },
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

    const activeStages = stages.filter(isActiveProcessStage);

    if (activeStages.length === 0) {
      throw new BadRequestException(
        'Current stage cannot be completed because no active process stage was found',
      );
    }

    if (activeStages.length > 1) {
      throw new ConflictException(
        'Current stage cannot be completed because more than one active process stage was found',
      );
    }

    const currentStage = activeStages[0]!;

    if (currentStage.id !== process.currentStage.id) {
      throw new ConflictException(
        'Current stage cannot be completed because the resolved active stage diverged during the transaction',
      );
    }

    const isFinalStage = currentStage.sequence === CASE_2_FINAL_PROCESS_STAGE_SEQUENCE;

    let nextStage: typeof stages[number] | null = null;

    if (!isFinalStage) {
      const candidateNextStage = stages.find((s) => s.sequence === currentStage.sequence + 1);

      if (!candidateNextStage) {
        throw new BadRequestException(
          `Current stage cannot be completed because the next stage (sequence ${currentStage.sequence + 1}) is missing`,
        );
      }

      if (!isFutureProcessStage(candidateNextStage)) {
        if (isActiveProcessStage(candidateNextStage)) {
          throw new ConflictException(
            `Current stage cannot be completed because the next stage (sequence ${candidateNextStage.sequence}) is already active`,
          );
        }

        if (isCompletedProcessStage(candidateNextStage)) {
          throw new ConflictException(
            `Current stage cannot be completed because the next stage (sequence ${candidateNextStage.sequence}) is already completed`,
          );
        }

        throw new ConflictException(
          `Current stage cannot be completed because the next stage (sequence ${candidateNextStage.sequence}) is not in a future state`,
        );
      }

      nextStage = candidateNextStage;
    }

    const previousProcessStatus = process.status;
    const nextProcessStatus = isFinalStage ? ProcessStatus.PARECER_EMITIDO : ProcessStatus.EM_AVALIACAO;

    await transaction.processStage.update({
      where: { id: currentStage.id },
      data: { endedAt: occurredAt },
    });

    if (nextStage) {
      const inheritedSupervisorUserId =
        nextStage.responsibleSupervisorUserId ?? currentStage.responsibleSupervisorUserId ?? null;

      await transaction.processStage.update({
        where: { id: nextStage.id },
        data: {
          startedAt: occurredAt,
          ...(nextStage.responsibleSupervisorUserId === null && inheritedSupervisorUserId !== null
            ? { responsibleSupervisorUserId: inheritedSupervisorUserId }
            : {}),
        },
      });
    }

    if (nextProcessStatus !== previousProcessStatus) {
      await transaction.evaluationProcess.update({
        where: { id: process.id },
        data: { status: toDatabaseProcessStatus(nextProcessStatus) },
      });
    }

    const occurredAtIso = occurredAt.toISOString();
    const metadata: Prisma.InputJsonValue = {
      eventType,
      action,
      performedByUserId: user.sub,
      performedByRole: user.role,
      occurredAt: occurredAtIso,
      processId: process.id,
      previousProcessStatus,
      nextProcessStatus,
      processStatus: nextProcessStatus,
      completedProcessStageId: currentStage.id,
      completedStageSequence: currentStage.sequence,
      completedStageCode: currentStage.stageCode,
      processStageId: currentStage.id,
      stageSequence: currentStage.sequence,
      stageCode: currentStage.stageCode,
      isFinalStage,
      stageCompletenessSummary: completenessSummary,
      ...(nextStage
        ? {
            nextProcessStageId: nextStage.id,
            nextStageSequence: nextStage.sequence,
            nextStageCode: nextStage.stageCode,
          }
        : {}),
      ...(normalizedComment ? { comment: normalizedComment } : {}),
    };

    await transaction.auditEvent.create({
      data: {
        evaluationProcessId: process.id,
        actorUserId: user.sub,
        actorRole: toDatabaseRole(user.role),
        eventType: toDatabaseAuditEventType(eventType),
        beforeState: {
          status: previousProcessStatus,
          completedProcessStageId: currentStage.id,
          completedStageSequence: currentStage.sequence,
        },
        afterState: {
          status: nextProcessStatus,
          completedProcessStageId: currentStage.id,
          completedStageSequence: currentStage.sequence,
          ...(nextStage
            ? {
                nextProcessStageId: nextStage.id,
                nextStageSequence: nextStage.sequence,
              }
            : { isFinalStage: true }),
        },
        metadata,
        occurredAt,
      },
    });

    return nextProcessStatus;
  }

  private async ensureActiveCesadStageAssignment(
    transaction: PrismaTransactionClient,
    process: ProcessAccessContext,
    user: AuthenticatedUser,
    assignedAt: Date,
  ): Promise<CesadStageAssignmentTransitionContext> {
    const activeAssignments = await transaction.cesadStageAssignment.findMany({
      where: {
        processStageId: process.currentStage.id,
        status: PrismaCesadStageAssignmentStatus.ACTIVE,
      },
      select: { id: true, commissionId: true, status: true },
      orderBy: { assignedAt: 'desc' },
    });

    if (activeAssignments.length > 1) {
      throw new ConflictException('Process stage has more than one active CESAD stage assignment');
    }

    if (activeAssignments.length === 1) {
      const assignment = activeAssignments[0]!;
      return { id: assignment.id, commissionId: assignment.commissionId, status: assignment.status, created: false };
    }

    const matchingCommissions = await transaction.cesadCommission.findMany({
      where: {
        status: PrismaCesadCommissionStatus.ACTIVE,
        effectiveStartDate: { lte: assignedAt },
        OR: [{ effectiveEndDate: null }, { effectiveEndDate: { gte: assignedAt } }],
      },
      select: { id: true },
      orderBy: [{ effectiveStartDate: 'desc' }, { createdAt: 'desc' }],
    });

    if (matchingCommissions.length === 0) {
      throw new BadRequestException(
        'Cannot assign CESAD stage because no active CESAD commission was found for the assignment date',
      );
    }

    if (matchingCommissions.length > 1) {
      throw new ConflictException(
        'Cannot assign CESAD stage because more than one active CESAD commission was found for the assignment date',
      );
    }

    const createdAssignment = await transaction.cesadStageAssignment.create({
      data: {
        processId: process.id,
        processStageId: process.currentStage.id,
        commissionId: matchingCommissions[0]!.id,
        status: PrismaCesadStageAssignmentStatus.ACTIVE,
        assignedAt,
        assignedByUserId: user.sub,
        referenceDate: assignedAt,
      },
      select: { id: true, commissionId: true, status: true },
    });

    return {
      id: createdAssignment.id,
      commissionId: createdAssignment.commissionId,
      status: createdAssignment.status,
      created: true,
    };
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
      case UserRole.COMMISSION_ASSISTANT:
        if (!CESAD_PROCESS_ACCESS_ALLOWED_STATUSES.has(process.status)) {
          throw new ForbiddenException(
            'Authenticated CESAD reader does not have an active link to this process',
          );
        }
        await this.cesadContextAuthorizationService.ensureCanReadCesadStage({
          user,
          processStageId: process.currentStage.id,
          transaction,
        });
        return process;
      default:
        throw new ForbiddenException('Authenticated user does not have a legitimate link to this process');
    }
  }

  private async ensureUserHasProcessAccessForWorkflowAction(
    transaction: PrismaTransactionClient,
    processId: string,
    user: AuthenticatedUser,
    action: ProcessAction,
  ): Promise<ProcessAccessContext> {
    if (user.role === UserRole.ADMIN && action === ProcessAction.COMPLETE_CURRENT_STAGE) {
      return this.getProcessAccessContextOrThrow(transaction, processId);
    }

    return this.ensureUserHasProcessAccess(transaction, processId, user);
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

    if (process.stages.length === 0) {
      throw new NotFoundException(`No process stage was found for evaluation process ${processId}`);
    }

    const currentStage = this.processStageService.resolveActiveStageFromListOrThrow(
      process.stages,
      processId,
    );

    return {
      id: process.id,
      status: toContractProcessStatus(process.status),
      evaluatedUserId: process.evaluatedUserId,
      currentStage: {
        id: currentStage.id,
        sequence: currentStage.sequence,
        stageCode: currentStage.stageCode,
        responsibleSupervisorUserId: currentStage.responsibleSupervisorUserId,
      },
    };
  }

  private ensureCanSupersedeCesadStageAssignment(user: AuthenticatedUser): void {
    if (!CESAD_STAGE_ASSIGNMENT_SUPERSEDER_ROLES.has(user.role)) {
      throw new ForbiddenException(`Role ${user.role} cannot supersede CESAD stage assignment`);
    }
  }

  private isPublicWorkflowHistoryEvent(eventType: AuditEventType, metadata: unknown): boolean {
    const metadataRecord = this.asMetadataRecord(metadata);

    if (metadataRecord?.origin === 'PROCESS_DOCUMENT') return false;

    const action = this.readProcessAction(metadataRecord);
    if (!action) return false;

    return isWorkflowAuditEventTypeForAction(eventType, action);
  }

  private asMetadataRecord(metadata: unknown): Record<string, unknown> | null {
    if (!metadata || typeof metadata !== 'object') return null;
    return metadata as Record<string, unknown>;
  }

  private readProcessAction(metadata: Record<string, unknown> | null): ProcessAction | null {
    const action = metadata?.action;

    if (typeof action !== 'string' || !Object.values(ProcessAction).includes(action as ProcessAction)) {
      return null;
    }

    return action as ProcessAction;
  }

  private normalizeComment(comment?: string): string | null {
    if (typeof comment !== 'string') return null;

    const normalized = comment.trim();
    if (normalized.length > 2000) {
      throw new BadRequestException('Comment must not exceed 2000 characters');
    }
    return normalized.length > 0 ? normalized : null;
  }

  private normalizeRequiredText(value: string, fieldLabel: string, maxLength = 1000): string {
    if (typeof value !== 'string') {
      throw new BadRequestException(`${fieldLabel} must be a string`);
    }

    const normalized = value.trim();
    if (normalized.length === 0) {
      throw new BadRequestException(`${fieldLabel} is required`);
    }

    if (normalized.length > maxLength) {
      throw new BadRequestException(`${fieldLabel} must not exceed ${maxLength} characters`);
    }

    return normalized;
  }

  private normalizeOptionalText(value?: string, maxLength = 500): string | null {
    if (typeof value !== 'string') return null;

    const normalized = value.trim();
    if (normalized.length > maxLength) {
      throw new BadRequestException(`Value must not exceed ${maxLength} characters`);
    }
    return normalized.length > 0 ? normalized : null;
  }

  private readComment(metadata: unknown): string | null {
    if (!metadata || typeof metadata !== 'object' || !('comment' in metadata)) return null;

    const comment = (metadata as Record<string, unknown>).comment;
    return typeof comment === 'string' && comment.trim().length > 0 ? comment : null;
  }

  private asAuditMetadata(metadata: unknown): AuditMetadata | null {
    if (!metadata || typeof metadata !== 'object') return null;

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
      case AuditEventType.STAGE_COMPLETED:
        return ProcessAction.COMPLETE_CURRENT_STAGE;
      default:
        throw new BadRequestException(`Workflow history contains unsupported event type ${eventType}`);
    }
  }
}
