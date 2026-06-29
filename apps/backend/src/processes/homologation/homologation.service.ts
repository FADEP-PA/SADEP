import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditEventType as PrismaAuditEventType,
  DocumentStatus as PrismaDocumentStatus,
  DocumentType as PrismaDocumentType,
  Prisma,
  ProcessStatus as PrismaProcessStatus,
  UserRole as PrismaUserRole,
} from '@prisma/client';
import {
  AuditEventType,
  ProcessAction,
  ProcessStatus,
  type HomologationStatusRef,
  UserRole,
} from '@sadep/contracts';

import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  toDatabaseAuditEventType,
  toDatabaseRole,
  toDatabaseProcessStatus,
  toContractProcessStatus,
  type PrismaTransactionClient,
} from '../process-type-mappers';
import { ProcessStageService } from '../process-stage.service';
import type {
  ApproveHomologationDto,
  NotifyResultDto,
  ReturnForRegularizationDto,
} from './dto/homologation.dto';

@Injectable()
export class HomologationService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly processStageService: ProcessStageService,
  ) {}

  async getStatus(processId: string, user: AuthenticatedUser): Promise<HomologationStatusRef> {
    this.ensureCanAccessHomologation(user);

    const process = await this.processStageService.findProcessOrThrow(
      this.prismaService,
      processId,
    );

    const record = await this.prismaService.homologationRecord.findUnique({
      where: { processId },
    });

    return {
      processId,
      processStatus: toContractProcessStatus(process.status),
      homologatedAt: record?.homologatedAt.toISOString() ?? null,
      homologatedByUserId: record?.homologatedByUserId ?? null,
      homologationRemarks: record?.homologationRemarks ?? null,
      notifiedAt: record?.notifiedAt?.toISOString() ?? null,
      notifiedByUserId: record?.notifiedByUserId ?? null,
      acknowledgedAt: record?.acknowledgedAt?.toISOString() ?? null,
    };
  }

  async approve(
    processId: string,
    user: AuthenticatedUser,
    dto: ApproveHomologationDto,
  ): Promise<HomologationStatusRef> {
    this.ensureIsHomologationAuthority(user);

    return this.prismaService.$transaction(async (tx) => {
      const process = await this.processStageService.findProcessOrThrow(tx, processId);
      const processStatus = toContractProcessStatus(process.status);

      if (processStatus !== ProcessStatus.PARECER_EMITIDO) {
        throw new BadRequestException(
          `Process must be in ${ProcessStatus.PARECER_EMITIDO} status to be homologated`,
        );
      }

      const finalOpinion = await tx.cesadFinalOpinion.findUnique({
        where: { processId },
        select: { id: true, sentToHomologationAt: true },
      });

      if (!finalOpinion || finalOpinion.sentToHomologationAt === null) {
        throw new BadRequestException(
          'CESAD final opinion must be sent to homologation before approval',
        );
      }

      const existing = await tx.homologationRecord.findUnique({ where: { processId } });
      if (existing) {
        throw new ConflictException('Process has already been homologated');
      }

      const now = new Date();
      const remarks = dto.homologationRemarks?.trim() || null;

      const record = await tx.homologationRecord.create({
        data: {
          processId,
          homologatedAt: now,
          homologatedByUserId: user.sub,
          homologationRemarks: remarks,
        },
      });

      await tx.processDocument.create({
        data: {
          evaluationProcessId: processId,
          processStageId: null,
          documentType: PrismaDocumentType.HOMOLOGATION_RECORD,
          documentStatus: PrismaDocumentStatus.CONSOLIDATED,
        },
      });

      await tx.evaluationProcess.update({
        where: { id: processId },
        data: { status: toDatabaseProcessStatus(ProcessStatus.HOMOLOGADO) },
      });

      await tx.auditEvent.create({
        data: this.buildAuditEvent({
          processId,
          user,
          eventType: AuditEventType.RESULT_HOMOLOGATED,
          action: ProcessAction.HOMOLOGATE_RESULT,
          beforeStatus: processStatus,
          afterStatus: ProcessStatus.HOMOLOGADO,
          occurredAt: now,
          extra: { homologationRecordId: record.id, remarks },
        }),
      });

      return {
        processId,
        processStatus: ProcessStatus.HOMOLOGADO,
        homologatedAt: now.toISOString(),
        homologatedByUserId: user.sub,
        homologationRemarks: remarks,
        notifiedAt: null,
        notifiedByUserId: null,
        acknowledgedAt: null,
      };
    });
  }

  async returnForRegularization(
    processId: string,
    user: AuthenticatedUser,
    dto: ReturnForRegularizationDto,
  ): Promise<{ processId: string; processStatus: ProcessStatus }> {
    this.ensureIsHomologationAuthority(user);

    return this.prismaService.$transaction(async (tx) => {
      const process = await this.processStageService.findProcessOrThrow(tx, processId);
      const processStatus = toContractProcessStatus(process.status);

      if (processStatus !== ProcessStatus.PARECER_EMITIDO) {
        throw new BadRequestException(
          `Process must be in ${ProcessStatus.PARECER_EMITIDO} status to be returned for regularization`,
        );
      }

      const existing = await tx.homologationRecord.findUnique({ where: { processId } });
      if (existing) {
        throw new ConflictException('Cannot return a process that has already been homologated');
      }

      const now = new Date();
      const remarks = dto.returnRemarks?.trim() || null;

      await tx.evaluationProcess.update({
        where: { id: processId },
        data: { status: toDatabaseProcessStatus(ProcessStatus.EM_AVALIACAO) },
      });

      await tx.auditEvent.create({
        data: this.buildAuditEvent({
          processId,
          user,
          eventType: AuditEventType.ADJUSTMENT_REQUESTED,
          action: ProcessAction.RETURN_FOR_REGULARIZATION,
          beforeStatus: processStatus,
          afterStatus: ProcessStatus.EM_AVALIACAO,
          occurredAt: now,
          extra: { remarks },
        }),
      });

      return { processId, processStatus: ProcessStatus.EM_AVALIACAO };
    });
  }

  async notify(
    processId: string,
    user: AuthenticatedUser,
    dto: NotifyResultDto,
  ): Promise<HomologationStatusRef> {
    this.ensureIsHomologationAuthority(user);

    return this.prismaService.$transaction(async (tx) => {
      const process = await this.processStageService.findProcessOrThrow(tx, processId);
      const processStatus = toContractProcessStatus(process.status);

      if (processStatus !== ProcessStatus.HOMOLOGADO) {
        throw new BadRequestException(
          `Process must be in ${ProcessStatus.HOMOLOGADO} status to send result notification`,
        );
      }

      const record = await tx.homologationRecord.findUnique({ where: { processId } });
      if (!record) {
        throw new NotFoundException('HomologationRecord not found for this process');
      }

      if (record.notifiedAt !== null) {
        throw new ConflictException('Result notification has already been sent');
      }

      const now = new Date();
      const remarks = dto.notificationRemarks?.trim() || null;

      const updated = await tx.homologationRecord.update({
        where: { processId },
        data: { notifiedAt: now, notifiedByUserId: user.sub },
      });

      await tx.processDocument.create({
        data: {
          evaluationProcessId: processId,
          processStageId: null,
          documentType: PrismaDocumentType.RESULT_NOTIFICATION,
          documentStatus: PrismaDocumentStatus.CONSOLIDATED,
        },
      });

      await tx.evaluationProcess.update({
        where: { id: processId },
        data: { status: toDatabaseProcessStatus(ProcessStatus.NOTIFICADO) },
      });

      await tx.auditEvent.create({
        data: this.buildAuditEvent({
          processId,
          user,
          eventType: AuditEventType.NOTIFICATION_SENT,
          action: ProcessAction.GENERATE_NOTIFICATION,
          beforeStatus: processStatus,
          afterStatus: ProcessStatus.NOTIFICADO,
          occurredAt: now,
          extra: { homologationRecordId: record.id, remarks },
        }),
      });

      return {
        processId,
        processStatus: ProcessStatus.NOTIFICADO,
        homologatedAt: updated.homologatedAt.toISOString(),
        homologatedByUserId: updated.homologatedByUserId,
        homologationRemarks: updated.homologationRemarks,
        notifiedAt: now.toISOString(),
        notifiedByUserId: user.sub,
        acknowledgedAt: null,
      };
    });
  }

  async acknowledge(processId: string, user: AuthenticatedUser): Promise<HomologationStatusRef> {
    return this.prismaService.$transaction(async (tx) => {
      const process = await this.processStageService.findProcessOrThrow(tx, processId);
      const processStatus = toContractProcessStatus(process.status);

      if (processStatus !== ProcessStatus.NOTIFICADO) {
        throw new BadRequestException(
          `Process must be in ${ProcessStatus.NOTIFICADO} status to record acknowledgement`,
        );
      }

      if (process.evaluatedUserId !== user.sub) {
        throw new ForbiddenException('Only the evaluated server can acknowledge the result');
      }

      const record = await tx.homologationRecord.findUnique({ where: { processId } });
      if (!record) {
        throw new NotFoundException('HomologationRecord not found for this process');
      }

      if (record.acknowledgedAt !== null) {
        throw new ConflictException('Acknowledgement has already been recorded');
      }

      const now = new Date();

      const updated = await tx.homologationRecord.update({
        where: { processId },
        data: { acknowledgedAt: now },
      });

      await tx.processDocument.create({
        data: {
          evaluationProcessId: processId,
          processStageId: null,
          documentType: PrismaDocumentType.ACKNOWLEDGEMENT_RECORD,
          documentStatus: PrismaDocumentStatus.CONSOLIDATED,
        },
      });

      await tx.evaluationProcess.update({
        where: { id: processId },
        data: { status: toDatabaseProcessStatus(ProcessStatus.CIENTE) },
      });

      await tx.auditEvent.create({
        data: this.buildAuditEvent({
          processId,
          user,
          eventType: AuditEventType.ACKNOWLEDGEMENT_RECORDED,
          action: ProcessAction.RECORD_ACKNOWLEDGEMENT,
          beforeStatus: processStatus,
          afterStatus: ProcessStatus.CIENTE,
          occurredAt: now,
          extra: { homologationRecordId: record.id },
        }),
      });

      return {
        processId,
        processStatus: ProcessStatus.CIENTE,
        homologatedAt: updated.homologatedAt.toISOString(),
        homologatedByUserId: updated.homologatedByUserId,
        homologationRemarks: updated.homologationRemarks,
        notifiedAt: updated.notifiedAt?.toISOString() ?? null,
        notifiedByUserId: updated.notifiedByUserId,
        acknowledgedAt: now.toISOString(),
      };
    });
  }

  private ensureCanAccessHomologation(user: AuthenticatedUser): void {
    const allowed: UserRole[] = [
      UserRole.HOMOLOGATION_AUTHORITY,
      UserRole.ADMIN,
      UserRole.INTERN_SERVER,
    ];
    if (!allowed.includes(user.role)) {
      throw new ForbiddenException('Insufficient permissions to access homologation data');
    }
  }

  private ensureIsHomologationAuthority(user: AuthenticatedUser): void {
    if (user.role !== UserRole.HOMOLOGATION_AUTHORITY && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only HOMOLOGATION_AUTHORITY or ADMIN can perform this action');
    }
  }

  private buildAuditEvent(params: {
    processId: string;
    user: AuthenticatedUser;
    eventType: AuditEventType;
    action: ProcessAction;
    beforeStatus: ProcessStatus;
    afterStatus: ProcessStatus;
    occurredAt: Date;
    extra?: Record<string, unknown>;
  }): Prisma.AuditEventUncheckedCreateInput {
    const metadata: Record<string, unknown> = {
      eventType: params.eventType,
      action: params.action,
      performedByUserId: params.user.sub,
      performedByRole: params.user.role,
      occurredAt: params.occurredAt.toISOString(),
      processStatus: params.afterStatus,
      origin: 'HOMOLOGATION',
      processId: params.processId,
      ...params.extra,
    };

    return {
      evaluationProcessId: params.processId,
      actorUserId: params.user.sub,
      actorRole: toDatabaseRole(params.user.role) as PrismaUserRole,
      eventType: toDatabaseAuditEventType(params.eventType) as PrismaAuditEventType,
      beforeState: { processStatus: params.beforeStatus } as Prisma.InputJsonObject,
      afterState: { processStatus: params.afterStatus } as Prisma.InputJsonObject,
      occurredAt: params.occurredAt,
      metadata: metadata as Prisma.InputJsonObject,
    };
  }
}
