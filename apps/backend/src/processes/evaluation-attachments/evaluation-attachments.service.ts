import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EvaluationAttachmentOrigin as PrismaEvaluationAttachmentOrigin,
  Prisma,
  ProcessStatus as PrismaProcessStatus,
  SelfEvaluationStatus as PrismaSelfEvaluationStatus,
  SupervisorEvaluationStatus as PrismaSupervisorEvaluationStatus,
} from '@prisma/client';
import {
  AuditEventType,
  EvaluationAttachmentOrigin,
  EvaluationAttachmentRef,
  ListAttachmentsResponse,
  ProcessAction,
  ProcessStatus,
  RemoveAttachmentResponse,
  UploadAttachmentResponse,
  UserRole,
} from '@sadep/contracts';

import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  DOCUMENT_ARTIFACT_STORAGE,
  type DocumentArtifactStorage,
} from '../../infrastructure/documents/document-artifact-storage';
import { ProcessesService } from '../processes.service';
import {
  toContractProcessStatus,
  toDatabaseAuditEventType,
  toDatabaseRole,
  type PrismaTransactionClient,
} from '../process-type-mappers';
import {
  MAX_EVALUATION_ATTACHMENTS_PER_SCOPE,
  validateEvaluationAttachmentFile,
  type EvaluationAttachmentUploadInput,
} from './evaluation-attachment-file-validation';
import { randomUUID } from 'node:crypto';

type EvaluationAttachmentRecord = Prisma.EvaluationAttachmentGetPayload<Record<string, never>>;

type AttachmentScopeProcess = {
  id: string;
  status: PrismaProcessStatus;
  evaluatedUserId: string;
};

type AttachmentStageContext = {
  id: string;
  sequence: number;
  responsibleSupervisorUserId: string | null;
};

@Injectable()
export class EvaluationAttachmentsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly processesService: ProcessesService,
    @Inject(DOCUMENT_ARTIFACT_STORAGE) private readonly storage: DocumentArtifactStorage,
  ) {}

  buildStorageKey(processId: string, processStageId: string, attachmentId: string): string {
    return `processes/${processId}/stages/${processStageId}/attachments/${attachmentId}`;
  }

  async upload(
    processId: string,
    processStageId: string,
    originParam: string,
    file: EvaluationAttachmentUploadInput | undefined,
    user: AuthenticatedUser,
  ): Promise<UploadAttachmentResponse> {
    const origin = this.parseOrigin(originParam);
    const validated = validateEvaluationAttachmentFile(file);

    const process = await this.processesService.findProcessOrThrow(this.prismaService, processId);
    await this.assertCanWrite(this.prismaService, process, processStageId, origin, user);
    await this.assertAttachmentQuota(this.prismaService, processId, processStageId, origin, user);

    const attachmentId = randomUUID();
    const storageKey = this.buildStorageKey(processId, processStageId, attachmentId);
    await this.storage.write(storageKey, validated.buffer, 'create', validated.mimeType);

    let attachment: EvaluationAttachmentRecord;
    try {
      attachment = await this.prismaService.$transaction(async (transaction) => {
        await this.lockAttachmentScope(transaction, processId, processStageId, origin, user.sub);
        await this.lockInstrument(transaction, processStageId, origin);
        const stage = await this.assertCanWrite(transaction, process, processStageId, origin, user);
        await this.assertAttachmentQuota(transaction, processId, processStageId, origin, user);
        const processStatus = await this.resolveProcessStatus(transaction, processId);

        const created = await transaction.evaluationAttachment.create({
          data: {
            id: attachmentId,
            evaluationProcessId: process.id,
            processStageId,
            origin,
            uploaderUserId: user.sub,
            originalFilename: validated.originalFilename,
            mimeType: validated.mimeType,
            sizeBytes: validated.sizeBytes,
            storageKey,
          },
        });

        await transaction.auditEvent.create({
          data: this.buildAttachmentAuditEvent({
            processId: process.id,
            processStageId,
            stageSequence: stage.sequence,
            processStatus,
            user,
            eventType: AuditEventType.EVALUATION_ATTACHMENT_UPLOADED,
            action: ProcessAction.UPLOAD_EVALUATION_ATTACHMENT,
            origin,
            attachment: created,
            beforeState: null,
            afterState: {
              attachmentId: created.id,
              origin,
              originalFilename: created.originalFilename,
              mimeType: created.mimeType,
              sizeBytes: created.sizeBytes,
            },
          }),
        });

        return created;
      });
    } catch (error) {
      // The stored file is only referenced after the transaction commits; compensate best effort.
      try {
        await this.storage.delete(storageKey);
      } catch {
        // Compensation must not mask the original upload failure.
      }
      throw error;
    }

    return { attachment: this.toContractRef(attachment) };
  }

  async list(
    processId: string,
    processStageId: string,
    originParam: string,
    user: AuthenticatedUser,
  ): Promise<ListAttachmentsResponse> {
    const origin = this.parseOrigin(originParam);
    const process = await this.processesService.findProcessOrThrow(this.prismaService, processId);
    await this.assertCanRead(this.prismaService, process, processStageId, origin, user);

    const attachments = await this.prismaService.evaluationAttachment.findMany({
      where: {
        evaluationProcessId: process.id,
        processStageId,
        origin,
      },
      orderBy: { createdAt: 'asc' },
    });

    return { attachments: attachments.map((attachment) => this.toContractRef(attachment)) };
  }

  async download(
    processId: string,
    processStageId: string,
    originParam: string,
    attachmentId: string,
    user: AuthenticatedUser,
  ): Promise<{ content: Buffer; filename: string; mimeType: string }> {
    const origin = this.parseOrigin(originParam);
    const process = await this.processesService.findProcessOrThrow(this.prismaService, processId);
    await this.assertCanRead(this.prismaService, process, processStageId, origin, user);

    const attachment = await this.findScopedAttachment(processId, processStageId, origin, attachmentId);
    if (!(await this.storage.exists(attachment.storageKey))) {
      throw new NotFoundException('Evaluation attachment content not found');
    }

    return {
      content: await this.storage.read(attachment.storageKey),
      filename: attachment.originalFilename,
      mimeType: attachment.mimeType,
    };
  }

  async remove(
    processId: string,
    processStageId: string,
    originParam: string,
    attachmentId: string,
    user: AuthenticatedUser,
  ): Promise<RemoveAttachmentResponse> {
    const origin = this.parseOrigin(originParam);
    const process = await this.processesService.findProcessOrThrow(this.prismaService, processId);
    await this.assertCanWrite(this.prismaService, process, processStageId, origin, user);

    const attachment = await this.findScopedAttachment(processId, processStageId, origin, attachmentId);
    if (attachment.uploaderUserId !== user.sub) {
      throw new ForbiddenException('Authenticated user can only remove their own evaluation attachments');
    }

    const removed = await this.prismaService.$transaction(async (transaction) => {
      await this.lockInstrument(transaction, processStageId, origin);
      const stage = await this.assertCanWrite(transaction, process, processStageId, origin, user);
      const processStatus = await this.resolveProcessStatus(transaction, processId);

      const deleted = await transaction.evaluationAttachment.deleteMany({
        where: {
          id: attachment.id,
          evaluationProcessId: process.id,
          processStageId,
          origin,
          uploaderUserId: user.sub,
        },
      });
      if (deleted.count === 0) {
        return false;
      }

      await transaction.auditEvent.create({
        data: this.buildAttachmentAuditEvent({
          processId: process.id,
          processStageId,
          stageSequence: stage.sequence,
          processStatus,
          user,
          eventType: AuditEventType.EVALUATION_ATTACHMENT_REMOVED,
          action: ProcessAction.REMOVE_EVALUATION_ATTACHMENT,
          origin,
          attachment,
          beforeState: {
            attachmentId: attachment.id,
            origin,
            originalFilename: attachment.originalFilename,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.sizeBytes,
          },
          afterState: { attachmentId: attachment.id, removed: true },
        }),
      });

      return true;
    });

    // The database removal is authoritative; a failed physical delete leaves an
    // unreachable object that can never bypass authorization or audit again.
    try {
      await this.storage.delete(attachment.storageKey);
    } catch {
      // Storage cleanup must not mask the committed removal.
    }

    return { attachmentId: attachment.id, removed };
  }

  private parseOrigin(value: string): EvaluationAttachmentOrigin {
    if (
      value === EvaluationAttachmentOrigin.SUPERVISOR_EVALUATION ||
      value === EvaluationAttachmentOrigin.SELF_EVALUATION
    ) {
      return value;
    }
    throw new BadRequestException(`Unsupported evaluation attachment origin ${value}`);
  }

  private async findScopedAttachment(
    processId: string,
    processStageId: string,
    origin: EvaluationAttachmentOrigin,
    attachmentId: string,
  ): Promise<EvaluationAttachmentRecord> {
    const attachment = await this.prismaService.evaluationAttachment.findFirst({
      where: {
        id: attachmentId,
        evaluationProcessId: processId,
        processStageId,
        origin,
      },
    });
    if (!attachment) {
      throw new NotFoundException('Evaluation attachment not found');
    }
    return attachment;
  }

  private async assertCanWrite(
    client: PrismaTransactionClient,
    process: AttachmentScopeProcess,
    processStageId: string,
    origin: EvaluationAttachmentOrigin,
    user: AuthenticatedUser,
  ): Promise<AttachmentStageContext> {
    const stage = await client.processStage.findFirst({
      where: { id: processStageId, evaluationProcessId: process.id },
      select: { id: true, sequence: true, responsibleSupervisorUserId: true },
    });
    if (!stage) {
      throw new NotFoundException('Process stage not found');
    }

    if (origin === EvaluationAttachmentOrigin.SUPERVISOR_EVALUATION) {
      if (user.role !== UserRole.IMMEDIATE_SUPERVISOR) {
        throw new ForbiddenException(
          `Role ${user.role} cannot manipulate supervisor evaluation attachments`,
        );
      }
      if (stage.responsibleSupervisorUserId !== user.sub) {
        throw new ForbiddenException(
          'Authenticated user is not the responsible supervisor for this process stage',
        );
      }
      const evaluation = await client.supervisorEvaluation.findUnique({
        where: { processStageId },
        select: { status: true },
      });
      if (!evaluation) {
        throw new BadRequestException('Supervisor evaluation for this process stage has not started yet');
      }
      if (evaluation.status !== PrismaSupervisorEvaluationStatus.DRAFT) {
        throw new BadRequestException('Supervisor evaluation attachments are immutable after submission');
      }
      return stage;
    }

    if (user.role !== UserRole.INTERN_SERVER) {
      throw new ForbiddenException(`Role ${user.role} cannot manipulate self evaluation attachments`);
    }
    if (process.evaluatedUserId !== user.sub) {
      throw new ForbiddenException('Authenticated user is not the evaluated server for this process');
    }
    const evaluation = await client.selfEvaluation.findUnique({
      where: { processStageId },
      select: { status: true },
    });
    if (!evaluation) {
      throw new BadRequestException('Self evaluation for this process stage has not started yet');
    }
    if (evaluation.status !== PrismaSelfEvaluationStatus.DRAFT) {
      throw new BadRequestException('Self evaluation attachments are immutable after submission');
    }
    return stage;
  }

  private async assertCanRead(
    client: PrismaTransactionClient,
    process: AttachmentScopeProcess,
    processStageId: string,
    origin: EvaluationAttachmentOrigin,
    user: AuthenticatedUser,
  ): Promise<void> {
    const stage = await client.processStage.findFirst({
      where: { id: processStageId, evaluationProcessId: process.id },
      select: { id: true, responsibleSupervisorUserId: true },
    });
    if (!stage) {
      throw new NotFoundException('Process stage not found');
    }

    if (origin === EvaluationAttachmentOrigin.SUPERVISOR_EVALUATION) {
      const isAuthor =
        user.role === UserRole.IMMEDIATE_SUPERVISOR &&
        stage.responsibleSupervisorUserId === user.sub;
      if (isAuthor) {
        return;
      }
      if (user.role === UserRole.INTERN_SERVER) {
        if (process.evaluatedUserId !== user.sub) {
          throw new ForbiddenException(
            'Authenticated user is not the evaluated server for this process',
          );
        }
        const evaluation = await client.supervisorEvaluation.findUnique({
          where: { processStageId },
          select: { status: true },
        });
        if (evaluation?.status !== PrismaSupervisorEvaluationStatus.SUBMITTED) {
          throw new ForbiddenException(
            'Supervisor evaluation attachments can only be read after submission',
          );
        }
        return;
      }
      throw new ForbiddenException(
        `Role ${user.role} cannot read supervisor evaluation attachments`,
      );
    }

    if (user.role === UserRole.INTERN_SERVER) {
      if (process.evaluatedUserId !== user.sub) {
        throw new ForbiddenException(
          'Authenticated user is not the evaluated server for this process',
        );
      }
      return;
    }
    if (user.role === UserRole.IMMEDIATE_SUPERVISOR) {
      if (stage.responsibleSupervisorUserId !== user.sub) {
        throw new ForbiddenException(
          'Authenticated user is not the responsible supervisor for this process stage',
        );
      }
      const evaluation = await client.selfEvaluation.findUnique({
        where: { processStageId },
        select: { status: true },
      });
      if (evaluation?.status !== PrismaSelfEvaluationStatus.SUBMITTED) {
        throw new ForbiddenException(
          'Self evaluation attachments can only be read after submission',
        );
      }
      return;
    }
    if (user.role === UserRole.ADMIN) {
      const evaluation = await client.selfEvaluation.findUnique({
        where: { processStageId },
        select: { status: true },
      });
      if (evaluation?.status !== PrismaSelfEvaluationStatus.SUBMITTED) {
        throw new ForbiddenException(
          'Self evaluation attachments can only be read after submission',
        );
      }
      return;
    }
    throw new ForbiddenException(`Role ${user.role} cannot read self evaluation attachments`);
  }

  private async assertAttachmentQuota(
    client: PrismaTransactionClient,
    processId: string,
    processStageId: string,
    origin: EvaluationAttachmentOrigin,
    user: AuthenticatedUser,
  ): Promise<void> {
    const count = await client.evaluationAttachment.count({
      where: {
        evaluationProcessId: processId,
        processStageId,
        origin,
        uploaderUserId: user.sub,
      },
    });
    if (count >= MAX_EVALUATION_ATTACHMENTS_PER_SCOPE) {
      throw new BadRequestException(
        `Evaluation attachments are limited to ${MAX_EVALUATION_ATTACHMENTS_PER_SCOPE} files per stage, origin and author`,
      );
    }
  }

  private async lockAttachmentScope(
    transaction: PrismaTransactionClient,
    processId: string,
    processStageId: string,
    origin: EvaluationAttachmentOrigin,
    uploaderUserId: string,
  ): Promise<void> {
    const lockKey = `sadep:evaluation-attachment:${processId}:${processStageId}:${origin}:${uploaderUserId}`;
    await transaction.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))::text`;
  }

  private async lockInstrument(
    transaction: PrismaTransactionClient,
    processStageId: string,
    origin: EvaluationAttachmentOrigin,
  ): Promise<void> {
    if (origin === EvaluationAttachmentOrigin.SUPERVISOR_EVALUATION) {
      await transaction.$queryRaw`SELECT id FROM "SupervisorEvaluation" WHERE "processStageId" = ${processStageId} FOR UPDATE`;
      return;
    }
    await transaction.$queryRaw`SELECT id FROM "SelfEvaluation" WHERE "processStageId" = ${processStageId} FOR UPDATE`;
  }

  private async resolveProcessStatus(
    client: PrismaTransactionClient,
    processId: string,
  ): Promise<ProcessStatus> {
    const process = await client.evaluationProcess.findUnique({
      where: { id: processId },
      select: { status: true },
    });
    if (!process) {
      throw new NotFoundException(`Evaluation process ${processId} was not found`);
    }
    return toContractProcessStatus(process.status);
  }

  private buildAttachmentAuditEvent(params: {
    processId: string;
    processStageId: string;
    stageSequence: number;
    processStatus: ProcessStatus;
    user: AuthenticatedUser;
    eventType: AuditEventType;
    action: ProcessAction;
    origin: EvaluationAttachmentOrigin;
    attachment: {
      id: string;
      originalFilename: string;
      mimeType: string;
      sizeBytes: number;
    };
    beforeState: Prisma.InputJsonObject | null;
    afterState: Prisma.InputJsonObject;
  }): Prisma.AuditEventUncheckedCreateInput {
    const occurredAt = new Date().toISOString();
    return {
      evaluationProcessId: params.processId,
      actorUserId: params.user.sub,
      actorRole: toDatabaseRole(params.user.role),
      eventType: toDatabaseAuditEventType(params.eventType),
      beforeState: params.beforeState ?? Prisma.JsonNull,
      afterState: params.afterState,
      occurredAt: new Date(occurredAt),
      metadata: {
        eventType: params.eventType,
        action: params.action,
        performedByUserId: params.user.sub,
        performedByRole: params.user.role,
        occurredAt,
        processStatus: params.processStatus,
        origin: params.origin,
        processStageId: params.processStageId,
        stageSequence: params.stageSequence,
        attachmentId: params.attachment.id,
        originalFilename: params.attachment.originalFilename,
        mimeType: params.attachment.mimeType,
        sizeBytes: params.attachment.sizeBytes,
      },
    };
  }

  private toContractRef(attachment: EvaluationAttachmentRecord): EvaluationAttachmentRef {
    return {
      id: attachment.id,
      evaluationProcessId: attachment.evaluationProcessId,
      processStageId: attachment.processStageId,
      origin: this.toContractOrigin(attachment.origin),
      uploaderUserId: attachment.uploaderUserId,
      originalFilename: attachment.originalFilename,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      createdAt: attachment.createdAt.toISOString(),
      updatedAt: attachment.updatedAt.toISOString(),
    };
  }

  private toContractOrigin(origin: PrismaEvaluationAttachmentOrigin): EvaluationAttachmentOrigin {
    if (!Object.values(EvaluationAttachmentOrigin).includes(origin as EvaluationAttachmentOrigin)) {
      throw new BadRequestException(`Unsupported evaluation attachment origin ${origin}`);
    }
    return origin as EvaluationAttachmentOrigin;
  }
}
