import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, PrismaClient } from '@prisma/client';
import {
  type AuditMetadata,
  ProcessAction,
  type ProcessStatus,
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

type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class ProcessesService {
  constructor(private readonly prismaService: PrismaService) {}

  async getWorkflow(processId: string, user: AuthenticatedUser): Promise<WorkflowResponseDto> {
    const process = await this.prismaService.evaluationProcess.findUnique({
      where: { id: processId },
      select: { id: true, status: true },
    });

    if (!process) {
      throw new NotFoundException(`Evaluation process ${processId} was not found`);
    }

    return {
      id: process.id,
      status: process.status,
      availableActions: this.getAllowedActions(process.status, user.role),
    };
  }

  async getWorkflowHistory(processId: string): Promise<WorkflowHistoryItemDto[]> {
    await this.ensureProcessExists(processId);

    const events = await this.prismaService.auditEvent.findMany({
      where: { evaluationProcessId: processId },
      orderBy: { occurredAt: 'asc' },
    });

    return events
      .filter((event) => isWorkflowAuditEventType(event.eventType))
      .map((event) => {
        const metadata = this.asAuditMetadata(event.metadata);

        return {
          id: event.id,
          action: metadata?.action ?? this.mapEventTypeToAction(event.eventType),
          eventType: event.eventType,
          actorUserId: event.actorUserId,
          actorRole: event.actorRole,
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

    const normalizedComment = this.normalizeComment(payload.comment);

    return this.prismaService.$transaction(async (transaction) => {
      const process = await this.findProcessOrThrow(transaction, processId);
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

      await transaction.evaluationProcess.update({
        where: { id: processId },
        data: { status: transition.to },
      });

      const occurredAt = new Date().toISOString();
      const metadata: Prisma.InputJsonValue = {
        eventType: transition.eventType,
        action: transition.action,
        performedByUserId: user.sub,
        performedByRole: user.role,
        occurredAt,
        processStatus: transition.to,
        ...(normalizedComment ? { comment: normalizedComment } : {}),
      };

      await transaction.auditEvent.create({
        data: {
          evaluationProcessId: process.id,
          actorUserId: user.sub,
          actorRole: this.toDatabaseRole(user.role),
          eventType: transition.eventType,
          beforeState: { status: process.status },
          afterState: { status: transition.to },
          metadata,
        },
      });

      return {
        id: process.id,
        status: transition.to,
        availableActions: this.getAllowedActions(transition.to, user.role),
      };
    });
  }

  private getAllowedActions(status: ProcessStatus, role: UserRole): ProcessAction[] {
    return getAvailableWorkflowTransitions(status)
      .filter((transition) => transition.allowedRoles.includes(role))
      .map((transition) => transition.action);
  }

  private async ensureProcessExists(processId: string): Promise<void> {
    const process = await this.prismaService.evaluationProcess.findUnique({
      where: { id: processId },
      select: { id: true },
    });

    if (!process) {
      throw new NotFoundException(`Evaluation process ${processId} was not found`);
    }
  }

  private async findProcessOrThrow(transaction: PrismaTransactionClient, processId: string) {
    const process = await transaction.evaluationProcess.findUnique({
      where: { id: processId },
      select: { id: true, status: true },
    });

    if (!process) {
      throw new NotFoundException(`Evaluation process ${processId} was not found`);
    }

    return process;
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

  private mapEventTypeToAction(eventType: string): ProcessAction {
    switch (eventType) {
      case 'SENT_TO_CESAD':
        return ProcessAction.SEND_TO_CESAD;
      case 'CESAD_OPINION_ISSUED':
        return ProcessAction.ISSUE_CESAD_OPINION;
      case 'ADJUSTMENT_REQUESTED':
        return ProcessAction.REQUEST_ADJUSTMENT;
      default:
        throw new BadRequestException(`Workflow history contains unsupported event type ${eventType}`);
    }
  }

  private toDatabaseRole(role: UserRole): UserRole {
    if (!Object.values(UserRole).includes(role)) {
      throw new BadRequestException(`Unsupported user role ${role}`);
    }

    return role;
  }
}
