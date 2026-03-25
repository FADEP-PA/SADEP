import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditEventType as PrismaAuditEventType,
  Prisma,
  ProcessStatus as PrismaProcessStatus,
  SupervisorEvaluationStatus as PrismaSupervisorEvaluationStatus,
  UserRole as PrismaUserRole,
} from '@prisma/client';
import {
  AuditEventType,
  ProcessAction,
  ProcessStatus,
  SupervisorEvaluationStatus,
  UserRole,
} from '@aep-pa/contracts';

import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ProcessesService } from '../processes.service';
import type {
  SupervisorEvaluationContentDto,
  SupervisorEvaluationResponseDto,
  UpsertSupervisorEvaluationDto,
} from './dto/supervisor-evaluation.dto';
import { isSupervisorEvaluationContentDto } from './dto/supervisor-evaluation.dto';

const ALLOWED_ROLES = [UserRole.ADMIN, UserRole.IMMEDIATE_SUPERVISOR] as const;

@Injectable()
export class SupervisorEvaluationsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly processesService: ProcessesService,
  ) {}

  async getByProcessId(
    processId: string,
    user: AuthenticatedUser,
  ): Promise<SupervisorEvaluationResponseDto | null> {
    this.ensureAllowedRole(user.role);
    await this.processesService.ensureProcessExists(processId);

    const evaluation = await this.prismaService.supervisorEvaluation.findUnique({
      where: { processId },
    });

    return evaluation ? this.toResponseDto(evaluation) : null;
  }

  async saveDraft(
    processId: string,
    user: AuthenticatedUser,
    payload: UpsertSupervisorEvaluationDto,
  ): Promise<SupervisorEvaluationResponseDto> {
    this.ensureAllowedRole(user.role);
    const normalizedPayload = this.normalizePayload(payload);

    return this.prismaService.$transaction(async (transaction) => {
      const process = await this.processesService.findProcessOrThrow(transaction, processId);

      if (this.toContractProcessStatus(process.status) !== ProcessStatus.EM_AVALIACAO) {
        throw new BadRequestException(
          `Supervisor evaluation draft can only be saved while process is in status ${ProcessStatus.EM_AVALIACAO}`,
        );
      }

      const existingEvaluation = await transaction.supervisorEvaluation.findUnique({
        where: { processId },
      });

      const occurredAt = new Date().toISOString();
      const eventType = existingEvaluation
        ? AuditEventType.EVALUATION_DRAFT_SAVED
        : AuditEventType.EVALUATION_STARTED;
      const action = existingEvaluation
        ? ProcessAction.SAVE_EVALUATION_DRAFT
        : ProcessAction.START_EVALUATION;

      const savedEvaluation = existingEvaluation
        ? await transaction.supervisorEvaluation.update({
            where: { processId },
            data: {
              evaluatorUserId: user.sub,
              status: PrismaSupervisorEvaluationStatus.DRAFT,
              summary: normalizedPayload.summary,
              generalComments: normalizedPayload.generalComments,
              content: this.toPrismaJsonContent(normalizedPayload.content),
              submittedAt: null,
            },
          })
        : await transaction.supervisorEvaluation.create({
            data: {
              processId,
              evaluatorUserId: user.sub,
              status: PrismaSupervisorEvaluationStatus.DRAFT,
              summary: normalizedPayload.summary,
              generalComments: normalizedPayload.generalComments,
              content: this.toPrismaJsonContent(normalizedPayload.content),
            },
          });

      await transaction.auditEvent.create({
        data: this.buildAuditEvent({
          processId,
          user,
          eventType,
          action,
          processStatus: ProcessStatus.EM_AVALIACAO,
          occurredAt,
          comment: normalizedPayload.comment,
          beforeState: existingEvaluation
            ? { supervisorEvaluationStatus: this.toContractEvaluationStatus(existingEvaluation.status) }
            : null,
          afterState: { supervisorEvaluationStatus: SupervisorEvaluationStatus.DRAFT },
        }),
      });

      return this.toResponseDto(savedEvaluation);
    });
  }

  async submit(
    processId: string,
    user: AuthenticatedUser,
    payload: UpsertSupervisorEvaluationDto,
  ): Promise<SupervisorEvaluationResponseDto> {
    this.ensureAllowedRole(user.role);
    const normalizedPayload = this.normalizePayload(payload);

    return this.prismaService.$transaction(async (transaction) => {
      const process = await this.processesService.findProcessOrThrow(transaction, processId);
      const processStatus = this.toContractProcessStatus(process.status);

      if (processStatus !== ProcessStatus.EM_AVALIACAO) {
        throw new BadRequestException(
          `Supervisor evaluation can only be submitted while process is in status ${ProcessStatus.EM_AVALIACAO}`,
        );
      }

      const existingEvaluation = await transaction.supervisorEvaluation.findUnique({
        where: { processId },
      });

      const beforeState = existingEvaluation
        ? { supervisorEvaluationStatus: this.toContractEvaluationStatus(existingEvaluation.status) }
        : null;

      const submittedAt = new Date();
      const savedEvaluation = existingEvaluation
        ? await transaction.supervisorEvaluation.update({
            where: { processId },
            data: {
              evaluatorUserId: user.sub,
              summary: normalizedPayload.summary,
              generalComments: normalizedPayload.generalComments,
              content: this.toPrismaJsonContent(normalizedPayload.content),
              status: PrismaSupervisorEvaluationStatus.SUBMITTED,
              submittedAt,
            },
          })
        : await transaction.supervisorEvaluation.create({
            data: {
              processId,
              evaluatorUserId: user.sub,
              summary: normalizedPayload.summary,
              generalComments: normalizedPayload.generalComments,
              content: this.toPrismaJsonContent(normalizedPayload.content),
              status: PrismaSupervisorEvaluationStatus.SUBMITTED,
              submittedAt,
            },
          });

      const occurredAt = submittedAt.toISOString();

      if (!existingEvaluation) {
        await transaction.auditEvent.create({
          data: this.buildAuditEvent({
            processId,
            user,
            eventType: AuditEventType.EVALUATION_STARTED,
            action: ProcessAction.START_EVALUATION,
            processStatus,
            occurredAt,
            comment: normalizedPayload.comment,
            beforeState: null,
            afterState: { supervisorEvaluationStatus: SupervisorEvaluationStatus.DRAFT },
          }),
        });
      }

      await transaction.auditEvent.create({
        data: this.buildAuditEvent({
          processId,
          user,
          eventType: AuditEventType.EVALUATION_COMPLETED,
          action: ProcessAction.COMPLETE_EVALUATION,
          processStatus: ProcessStatus.AGUARDANDO_ASSINATURA,
          occurredAt,
          comment: normalizedPayload.comment,
          beforeState,
          afterState: { supervisorEvaluationStatus: SupervisorEvaluationStatus.SUBMITTED },
        }),
      });

      await this.processesService.transitionWorkflowInTransaction(transaction, processId, user, {
        action: ProcessAction.RELEASE_FOR_SERVER_SIGNATURE,
        comment: normalizedPayload.comment,
      });

      return this.toResponseDto(savedEvaluation);
    });
  }

  async rectify(
    processId: string,
    user: AuthenticatedUser,
    payload: UpsertSupervisorEvaluationDto,
  ): Promise<SupervisorEvaluationResponseDto> {
    this.ensureAllowedRole(user.role);
    const normalizedPayload = this.normalizePayload(payload);

    return this.prismaService.$transaction(async (transaction) => {
      const process = await this.processesService.findProcessOrThrow(transaction, processId);
      const processStatus = this.toContractProcessStatus(process.status);

      if (processStatus !== ProcessStatus.AGUARDANDO_ASSINATURA) {
        throw new BadRequestException(
          `Supervisor evaluation can only be rectified before signature while process is in status ${ProcessStatus.AGUARDANDO_ASSINATURA}`,
        );
      }

      const existingEvaluation = await transaction.supervisorEvaluation.findUnique({
        where: { processId },
      });

      if (!existingEvaluation) {
        throw new NotFoundException(`Supervisor evaluation for process ${processId} was not found`);
      }

      if (existingEvaluation.status !== PrismaSupervisorEvaluationStatus.SUBMITTED) {
        throw new BadRequestException('Only submitted supervisor evaluations can be rectified');
      }

      const rectifiedEvaluation = await transaction.supervisorEvaluation.update({
        where: { processId },
        data: {
          evaluatorUserId: user.sub,
          summary: normalizedPayload.summary,
          generalComments: normalizedPayload.generalComments,
          content: this.toPrismaJsonContent(normalizedPayload.content),
          status: PrismaSupervisorEvaluationStatus.SUBMITTED,
          submittedAt: new Date(),
        },
      });

      await transaction.auditEvent.create({
        data: this.buildAuditEvent({
          processId,
          user,
          eventType: AuditEventType.EVALUATION_RECTIFIED,
          action: ProcessAction.RECTIFY_EVALUATION,
          processStatus,
          occurredAt: new Date().toISOString(),
          comment: normalizedPayload.comment,
          beforeState: { supervisorEvaluationStatus: SupervisorEvaluationStatus.SUBMITTED },
          afterState: { supervisorEvaluationStatus: SupervisorEvaluationStatus.SUBMITTED },
        }),
      });

      return this.toResponseDto(rectifiedEvaluation);
    });
  }

  private ensureAllowedRole(role: UserRole): void {
    if (!ALLOWED_ROLES.some((allowedRole) => allowedRole === role)) {
      throw new ForbiddenException(`Role ${role} cannot manipulate supervisor evaluations`);
    }
  }

  private normalizePayload(payload: UpsertSupervisorEvaluationDto): UpsertSupervisorEvaluationDto {
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('Supervisor evaluation payload must be an object');
    }

    const summary = this.normalizeRequiredText(payload.summary, 'summary');
    const generalComments = this.normalizeRequiredText(payload.generalComments, 'generalComments');
    const content = this.normalizeContent(payload.content);
    const comment = this.normalizeOptionalText(payload.comment);

    return {
      summary,
      generalComments,
      content,
      ...(comment ? { comment } : {}),
    };
  }

  private normalizeRequiredText(value: unknown, fieldName: string): string {
    if (typeof value !== 'string') {
      throw new BadRequestException(`Supervisor evaluation ${fieldName} must be a string`);
    }

    const normalizedValue = value.trim();
    if (normalizedValue.length === 0) {
      throw new BadRequestException(`Supervisor evaluation ${fieldName} is required`);
    }

    return normalizedValue;
  }

  private normalizeOptionalText(value: unknown): string | null {
    if (value === undefined) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('Supervisor evaluation comment must be a string when provided');
    }

    const normalizedValue = value.trim();
    return normalizedValue.length > 0 ? normalizedValue : null;
  }

  private normalizeContent(value: unknown): SupervisorEvaluationContentDto {
    if (!value || typeof value !== 'object') {
      throw new BadRequestException('Supervisor evaluation content must be an object');
    }

    const criteria = (value as { criteria?: unknown }).criteria;
    if (!Array.isArray(criteria) || criteria.length === 0) {
      throw new BadRequestException('Supervisor evaluation content must include at least one criterion');
    }

    return {
      criteria: criteria.map((criterion, index) => {
        if (!criterion || typeof criterion !== 'object') {
          throw new BadRequestException(`Supervisor evaluation criterion ${index} must be an object`);
        }

        const candidate = criterion as {
          code?: unknown;
          label?: unknown;
          rating?: unknown;
          comment?: unknown;
        };

        if (typeof candidate.code !== 'string' || candidate.code.trim().length === 0) {
          throw new BadRequestException(`Supervisor evaluation criterion ${index} must include a code`);
        }

        if (typeof candidate.label !== 'string' || candidate.label.trim().length === 0) {
          throw new BadRequestException(`Supervisor evaluation criterion ${index} must include a label`);
        }

        if (
          typeof candidate.rating !== 'number' ||
          !Number.isFinite(candidate.rating) ||
          candidate.rating < 1 ||
          candidate.rating > 5
        ) {
          throw new BadRequestException(
            `Supervisor evaluation criterion ${index} rating must be a number between 1 and 5`,
          );
        }

        if (candidate.comment !== undefined && typeof candidate.comment !== 'string') {
          throw new BadRequestException(`Supervisor evaluation criterion ${index} comment must be a string`);
        }

        return {
          code: candidate.code.trim(),
          label: candidate.label.trim(),
          rating: candidate.rating,
          ...(typeof candidate.comment === 'string' && candidate.comment.trim().length > 0
            ? { comment: candidate.comment.trim() }
            : {}),
        };
      }),
    };
  }

  private toPrismaJsonContent(content: SupervisorEvaluationContentDto): Prisma.InputJsonObject {
    return {
      criteria: content.criteria.map((criterion) => ({
        code: criterion.code,
        label: criterion.label,
        rating: criterion.rating,
        ...(criterion.comment !== undefined ? { comment: criterion.comment } : {}),
      })),
    };
  }

  private toNullablePrismaJson(
    value: Prisma.InputJsonObject | null,
  ): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue | undefined {
    return value ?? Prisma.JsonNull;
  }

  private parseStoredContent(content: Prisma.JsonValue): SupervisorEvaluationContentDto {
    if (!isSupervisorEvaluationContentDto(content)) {
      throw new BadRequestException('Stored supervisor evaluation content is invalid');
    }

    return {
      criteria: content.criteria.map((criterion) => ({
        code: criterion.code,
        label: criterion.label,
        rating: criterion.rating,
        ...(criterion.comment !== undefined ? { comment: criterion.comment } : {}),
      })),
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
      beforeState: this.toNullablePrismaJson(params.beforeState),
      afterState: params.afterState,
      occurredAt: new Date(params.occurredAt),
      metadata: {
        eventType: params.eventType,
        action: params.action,
        performedByUserId: params.user.sub,
        performedByRole: params.user.role,
        occurredAt: params.occurredAt,
        processStatus: params.processStatus,
        origin: 'SUPERVISOR_EVALUATION',
        ...(params.comment ? { comment: params.comment } : {}),
      },
    };
  }

  private toResponseDto(evaluation: {
    id: string;
    processId: string;
    evaluatorUserId: string;
    status: PrismaSupervisorEvaluationStatus;
    summary: string;
    generalComments: string;
    content: Prisma.JsonValue;
    submittedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): SupervisorEvaluationResponseDto {
    return {
      id: evaluation.id,
      processId: evaluation.processId,
      evaluatorUserId: evaluation.evaluatorUserId,
      status: this.toContractEvaluationStatus(evaluation.status),
      summary: evaluation.summary,
      generalComments: evaluation.generalComments,
      content: this.parseStoredContent(evaluation.content),
      submittedAt: evaluation.submittedAt?.toISOString() ?? null,
      createdAt: evaluation.createdAt.toISOString(),
      updatedAt: evaluation.updatedAt.toISOString(),
    };
  }

  private toContractProcessStatus(status: PrismaProcessStatus): ProcessStatus {
    if (!Object.values(ProcessStatus).includes(status as ProcessStatus)) {
      throw new BadRequestException(`Unsupported process status ${status}`);
    }

    return status as ProcessStatus;
  }

  private toContractEvaluationStatus(
    status: PrismaSupervisorEvaluationStatus,
  ): SupervisorEvaluationStatus {
    if (!Object.values(SupervisorEvaluationStatus).includes(status as SupervisorEvaluationStatus)) {
      throw new BadRequestException(`Unsupported supervisor evaluation status ${status}`);
    }

    return status as SupervisorEvaluationStatus;
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
