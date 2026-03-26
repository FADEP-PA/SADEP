import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  AuditEventType as PrismaAuditEventType,
  Prisma,
  ProcessStatus as PrismaProcessStatus,
  SelfEvaluationStatus as PrismaSelfEvaluationStatus,
  UserRole as PrismaUserRole,
} from '@prisma/client';
import {
  AuditEventType,
  ProcessAction,
  ProcessStatus,
  SelfEvaluationStatus,
  UserRole,
} from '@aep-pa/contracts';

import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ProcessDocumentsService } from '../../application/documents/process-documents.service';
import { ProcessesService } from '../processes.service';
import type {
  SelfEvaluationResponseDto,
  UpsertSelfEvaluationDto,
} from './dto/self-evaluation.dto';

@Injectable()
export class SelfEvaluationsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly processesService: ProcessesService,
    private readonly processDocumentsService: ProcessDocumentsService,
  ) {}

  async getByProcessId(
    processId: string,
    user: AuthenticatedUser,
  ): Promise<SelfEvaluationResponseDto | null> {
    const process = await this.prismaService.evaluationProcess.findUnique({
      where: { id: processId },
      select: { id: true, evaluatedUserId: true },
    });

    if (!process) {
      throw new BadRequestException(`Evaluation process ${processId} was not found`);
    }

    const evaluation = await this.prismaService.selfEvaluation.findUnique({
      where: { processId },
    });

    if (!evaluation) {
      if (this.isOwnIntern(user, process.evaluatedUserId) || this.canReviewSubmitted(user.role)) {
        return null;
      }

      throw new ForbiddenException('Authenticated user cannot access this self evaluation');
    }

    if (this.isOwnIntern(user, process.evaluatedUserId)) {
      return this.toResponseDto(
        evaluation,
        evaluation.status === PrismaSelfEvaluationStatus.SUBMITTED
          ? await this.processDocumentsService.getSelfEvaluationDocumentContext(this.prismaService, processId)
          : undefined,
      );
    }

    if (evaluation.status !== PrismaSelfEvaluationStatus.SUBMITTED || !this.canReviewSubmitted(user.role)) {
      return null;
    }

    return this.toResponseDto(
      evaluation,
      await this.processDocumentsService.getSelfEvaluationDocumentContext(this.prismaService, processId),
    );
  }

  async saveDraft(
    processId: string,
    user: AuthenticatedUser,
    payload: UpsertSelfEvaluationDto,
  ): Promise<SelfEvaluationResponseDto> {
    const normalizedPayload = this.normalizePayload(payload, false);

    return this.prismaService.$transaction(async (transaction) => {
      const process = await this.assertOwnInternReadyForSelfEvaluation(transaction, processId, user);
      const existingEvaluation = await transaction.selfEvaluation.findUnique({
        where: { processId },
      });

      if (existingEvaluation?.status === PrismaSelfEvaluationStatus.SUBMITTED) {
        throw new BadRequestException('Submitted self evaluation cannot be edited');
      }

      const occurredAt = new Date().toISOString();
      const eventType = existingEvaluation
        ? AuditEventType.EVALUATION_DRAFT_SAVED
        : AuditEventType.EVALUATION_STARTED;
      const action = existingEvaluation
        ? ProcessAction.SAVE_EVALUATION_DRAFT
        : ProcessAction.START_EVALUATION;

      const savedEvaluation = existingEvaluation
        ? await transaction.selfEvaluation.update({
            where: { processId },
            data: {
              authorUserId: user.sub,
              status: PrismaSelfEvaluationStatus.DRAFT,
              selfReflection: normalizedPayload.selfReflection,
              additionalNotes: normalizedPayload.additionalNotes,
              submittedAt: null,
            },
          })
        : await transaction.selfEvaluation.create({
            data: {
              processId,
              authorUserId: user.sub,
              status: PrismaSelfEvaluationStatus.DRAFT,
              selfReflection: normalizedPayload.selfReflection,
              additionalNotes: normalizedPayload.additionalNotes,
            },
          });

      await transaction.auditEvent.create({
        data: this.buildAuditEvent({
          processId: process.id,
          user,
          eventType,
          action,
          processStatus: ProcessStatus.AGUARDANDO_ASSINATURA,
          occurredAt,
          comment: normalizedPayload.comment,
          beforeState: existingEvaluation
            ? { selfEvaluationStatus: this.toContractEvaluationStatus(existingEvaluation.status) }
            : null,
          afterState: { selfEvaluationStatus: SelfEvaluationStatus.DRAFT },
        }),
      });

      return this.toResponseDto(savedEvaluation);
    });
  }

  async submit(
    processId: string,
    user: AuthenticatedUser,
    payload: UpsertSelfEvaluationDto,
  ): Promise<SelfEvaluationResponseDto> {
    const normalizedPayload = this.normalizePayload(payload, true);

    return this.prismaService.$transaction(async (transaction) => {
      const process = await this.assertOwnInternReadyForSelfEvaluation(transaction, processId, user);
      const existingEvaluation = await transaction.selfEvaluation.findUnique({
        where: { processId },
      });

      if (existingEvaluation?.status === PrismaSelfEvaluationStatus.SUBMITTED) {
        throw new BadRequestException('Self evaluation has already been submitted');
      }

      const beforeState = existingEvaluation
        ? { selfEvaluationStatus: this.toContractEvaluationStatus(existingEvaluation.status) }
        : null;
      const submittedAt = new Date();

      const savedEvaluation = existingEvaluation
        ? await transaction.selfEvaluation.update({
            where: { processId },
            data: {
              authorUserId: user.sub,
              status: PrismaSelfEvaluationStatus.SUBMITTED,
              selfReflection: normalizedPayload.selfReflection,
              additionalNotes: normalizedPayload.additionalNotes,
              submittedAt,
            },
          })
        : await transaction.selfEvaluation.create({
            data: {
              processId,
              authorUserId: user.sub,
              status: PrismaSelfEvaluationStatus.SUBMITTED,
              selfReflection: normalizedPayload.selfReflection,
              additionalNotes: normalizedPayload.additionalNotes,
              submittedAt,
            },
          });

      await transaction.auditEvent.create({
        data: this.buildAuditEvent({
          processId: process.id,
          user,
          eventType: AuditEventType.SELF_EVALUATION_SUBMITTED,
          action: ProcessAction.SUBMIT_SELF_EVALUATION,
          processStatus: ProcessStatus.AGUARDANDO_ASSINATURA,
          occurredAt: submittedAt.toISOString(),
          comment: normalizedPayload.comment,
          beforeState,
          afterState: { selfEvaluationStatus: SelfEvaluationStatus.SUBMITTED },
        }),
      });

      const { documentId } = await this.processDocumentsService.ensureSelfEvaluationDocument(
        transaction,
        processId,
        user,
      );

      await this.processDocumentsService.createSelfEvaluationSignatures(
        transaction,
        processId,
        documentId,
        user.sub,
        process.immediateSupervisorUserId,
        user,
      );

      return this.toResponseDto(
        savedEvaluation,
        await this.processDocumentsService.getSelfEvaluationDocumentContext(transaction, processId) ?? undefined,
      );
    });
  }

  private async assertOwnInternReadyForSelfEvaluation(
    transaction: Prisma.TransactionClient,
    processId: string,
    user: AuthenticatedUser,
  ): Promise<{ id: string; evaluatedUserId: string; immediateSupervisorUserId: string }> {
    const process = await transaction.evaluationProcess.findUnique({
      where: { id: processId },
      select: {
        id: true,
        status: true,
        evaluatedUserId: true,
        supervisorEvaluation: {
          select: {
            evaluatorUserId: true,
          },
        },
      },
    });

    if (!process) {
      throw new BadRequestException(`Evaluation process ${processId} was not found`);
    }

    if (user.role !== UserRole.INTERN_SERVER) {
      throw new ForbiddenException('Only INTERN_SERVER can manipulate self evaluation');
    }

    if (process.evaluatedUserId !== user.sub) {
      throw new ForbiddenException('Authenticated user is not the evaluated server for this process');
    }

    if (this.toContractProcessStatus(process.status) !== ProcessStatus.AGUARDANDO_ASSINATURA) {
      throw new BadRequestException(
        `Self evaluation can only be manipulated while process is in status ${ProcessStatus.AGUARDANDO_ASSINATURA}`,
      );
    }

    if (!process.supervisorEvaluation?.evaluatorUserId) {
      throw new BadRequestException('Supervisor evaluation must be submitted before self evaluation starts');
    }

    const supervisorEvaluationSigned =
      await this.processDocumentsService.hasCompletedSupervisorEvaluationSignatures(
        transaction,
        processId,
        process.evaluatedUserId,
      );

    if (!supervisorEvaluationSigned) {
      throw new BadRequestException(
        'Self evaluation can only start after the evaluated server signs the supervisor evaluation document',
      );
    }

    return {
      id: process.id,
      evaluatedUserId: process.evaluatedUserId,
      immediateSupervisorUserId: process.supervisorEvaluation.evaluatorUserId,
    };
  }

  private isOwnIntern(user: AuthenticatedUser, evaluatedUserId: string): boolean {
    return user.role === UserRole.INTERN_SERVER && user.sub === evaluatedUserId;
  }

  private canReviewSubmitted(role: UserRole): boolean {
    return role === UserRole.IMMEDIATE_SUPERVISOR || role === UserRole.ADMIN;
  }

  private normalizePayload(
    payload: UpsertSelfEvaluationDto,
    requireReflection: boolean,
  ): UpsertSelfEvaluationDto & { additionalNotes: string | null; comment: string | null } {
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('Self evaluation payload must be an object');
    }

    if (typeof payload.selfReflection !== 'string') {
      throw new BadRequestException('Self evaluation selfReflection must be a string');
    }

    const selfReflection = payload.selfReflection.trim();
    if (requireReflection && selfReflection.length === 0) {
      throw new BadRequestException('Self evaluation selfReflection is required for submit');
    }

    if (payload.additionalNotes !== undefined && typeof payload.additionalNotes !== 'string') {
      throw new BadRequestException('Self evaluation additionalNotes must be a string when provided');
    }

    if (payload.comment !== undefined && typeof payload.comment !== 'string') {
      throw new BadRequestException('Self evaluation comment must be a string when provided');
    }

    return {
      selfReflection,
      additionalNotes:
        typeof payload.additionalNotes === 'string' && payload.additionalNotes.trim().length > 0
          ? payload.additionalNotes.trim()
          : null,
      comment:
        typeof payload.comment === 'string' && payload.comment.trim().length > 0
          ? payload.comment.trim()
          : null,
    };
  }

  private buildAuditEvent(params: {
    processId: string;
    user: AuthenticatedUser;
    eventType: AuditEventType;
    action: ProcessAction;
    processStatus: ProcessStatus;
    occurredAt: string;
    comment?: string | null;
    beforeState: Prisma.InputJsonObject | null;
    afterState: Prisma.InputJsonObject;
  }): Prisma.AuditEventUncheckedCreateInput {
    return {
      evaluationProcessId: params.processId,
      actorUserId: params.user.sub,
      actorRole: this.toDatabaseRole(params.user.role),
      eventType: this.toDatabaseAuditEventType(params.eventType),
      beforeState: params.beforeState ?? Prisma.JsonNull,
      afterState: params.afterState,
      occurredAt: new Date(params.occurredAt),
      metadata: {
        eventType: params.eventType,
        action: params.action,
        performedByUserId: params.user.sub,
        performedByRole: params.user.role,
        occurredAt: params.occurredAt,
        processStatus: params.processStatus,
        origin: 'SELF_EVALUATION',
        ...(params.comment ? { comment: params.comment } : {}),
      },
    };
  }

  private toResponseDto(
    evaluation: {
      id: string;
      processId: string;
      authorUserId: string;
      status: PrismaSelfEvaluationStatus;
      selfReflection: string;
      additionalNotes: string | null;
      submittedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    },
    documentContext?: SelfEvaluationResponseDto['documentContext'],
  ): SelfEvaluationResponseDto {
    return {
      id: evaluation.id,
      processId: evaluation.processId,
      authorUserId: evaluation.authorUserId,
      status: this.toContractEvaluationStatus(evaluation.status),
      selfReflection: evaluation.selfReflection,
      additionalNotes: evaluation.additionalNotes,
      submittedAt: evaluation.submittedAt?.toISOString() ?? null,
      createdAt: evaluation.createdAt.toISOString(),
      updatedAt: evaluation.updatedAt.toISOString(),
      ...(documentContext ? { documentContext } : {}),
    };
  }

  private toContractProcessStatus(status: PrismaProcessStatus): ProcessStatus {
    if (!Object.values(ProcessStatus).includes(status as ProcessStatus)) {
      throw new BadRequestException(`Unsupported process status ${status}`);
    }

    return status as ProcessStatus;
  }

  private toContractEvaluationStatus(status: PrismaSelfEvaluationStatus): SelfEvaluationStatus {
    if (!Object.values(SelfEvaluationStatus).includes(status as SelfEvaluationStatus)) {
      throw new BadRequestException(`Unsupported self evaluation status ${status}`);
    }

    return status as SelfEvaluationStatus;
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
