import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditEventType as PrismaAuditEventType,
  CesadFinalOpinionStatus as PrismaCesadFinalOpinionStatus,
  CesadOpinionKind as PrismaCesadOpinionKind,
  DocumentStatus as PrismaDocumentStatus,
  DocumentType as PrismaDocumentType,
  Prisma,
  ProcessStatus as PrismaProcessStatus,
  SignatureStatus as PrismaSignatureStatus,
  UserRole as PrismaUserRole,
} from '@prisma/client';
import {
  AuditEventType,
  type CesadFinalOpinionConsolidatedSnapshotRef,
  CesadFinalOpinionStatus,
  ProcessAction,
  ProcessStatus,
  UserRole,
} from '@sadep/contracts';

import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { CesadContextAuthorizationService } from '../../cesad/authorization/cesad-context-authorization.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  toDatabaseAuditEventType,
  toDatabaseRole,
  toContractProcessStatus as toContractProcessStatusShared,
} from '../process-type-mappers';
import { ProcessesService, type PrismaTransactionClient } from '../processes.service';
import { CesadFinalOpinionConsolidationService } from './cesad-final-opinion-consolidation.service';
import {
  CesadFinalOpinionEligibilityService,
  type CesadFinalOpinionEligibilityResult,
} from './cesad-final-opinion-eligibility.service';
import type {
  CesadFinalOpinionEligibilityResponseDto,
  CesadFinalOpinionResponseDto,
  SendCesadFinalOpinionToHomologationDto,
  SendCesadFinalOpinionToHomologationResponseDto,
  UpsertCesadFinalOpinionDto,
} from './dto/cesad-final-opinion.dto';

type CesadFinalOpinionRow = {
  id: string;
  processId: string;
  authorUserId: string;
  status: PrismaCesadFinalOpinionStatus;
  reportText: string;
  legalBasis: string | null;
  finalConclusion: string;
  finalResult: string | null;
  finalConcept: string | null;
  recommendation: string | null;
  consolidatedSnapshot: Prisma.JsonValue | null;
  completedAt: Date | null;
  sentToHomologationAt: Date | null;
  sentToHomologationByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type NormalizedPayload = {
  reportText: string;
  legalBasis: string | null;
  finalConclusion: string;
  finalResult: string | null;
  finalConcept: string | null;
  recommendation: string | null;
  comment: string | null;
};

@Injectable()
export class CesadFinalOpinionsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly processesService: ProcessesService,
    private readonly cesadContextAuthorizationService: CesadContextAuthorizationService,
    private readonly eligibilityService: CesadFinalOpinionEligibilityService,
    private readonly consolidationService: CesadFinalOpinionConsolidationService,
  ) {}

  async getEligibility(
    processId: string,
    user: AuthenticatedUser,
  ): Promise<CesadFinalOpinionEligibilityResponseDto> {
    await this.processesService.findProcessOrThrow(this.prismaService, processId);
    await this.cesadContextAuthorizationService.ensureCanReadCesadFinalOpinion({
      user,
      processId,
    });

    return this.eligibilityService.evaluate(processId);
  }

  async getByProcess(
    processId: string,
    user: AuthenticatedUser,
  ): Promise<CesadFinalOpinionResponseDto | null> {
    await this.processesService.findProcessOrThrow(this.prismaService, processId);
    await this.cesadContextAuthorizationService.ensureCanReadCesadFinalOpinion({
      user,
      processId,
    });

    const opinion = await this.prismaService.cesadFinalOpinion.findUnique({
      where: { processId },
    });

    return opinion ? this.toResponseDto(opinion) : null;
  }

  async start(
    processId: string,
    user: AuthenticatedUser,
    payload?: { comment?: string },
  ): Promise<CesadFinalOpinionResponseDto> {
    return this.prismaService.$transaction(async (transaction) => {
      const process = await this.processesService.findProcessOrThrow(transaction, processId);
      const processStatus = this.toContractProcessStatus(process.status);
      this.ensureWriteAllowedForProcessStatus(processStatus);
      await this.cesadContextAuthorizationService.ensureCanWriteCesadFinalOpinion({
        user,
        processId,
        transaction,
        allowAdmin: true,
      });

      const existing = await transaction.cesadFinalOpinion.findUnique({
        where: { processId },
      });

      if (existing) {
        throw new ConflictException(
          'CESAD final opinion already exists for this process',
        );
      }

      const eligibility = await this.eligibilityService.evaluate(processId, transaction);
      this.ensureEligibleOrThrow(eligibility);

      const occurredAt = new Date();
      const created = await transaction.cesadFinalOpinion.create({
        data: {
          processId,
          authorUserId: user.sub,
          status: PrismaCesadFinalOpinionStatus.DRAFT,
          reportText: '',
          finalConclusion: '',
        },
      });

      await transaction.auditEvent.create({
        data: this.buildAuditEvent({
          processId,
          cesadFinalOpinionId: created.id,
          user,
          eventType: AuditEventType.CESAD_FINAL_OPINION_STARTED,
          action: ProcessAction.START_CESAD_FINAL_OPINION,
          processStatus,
          occurredAt,
          comment: this.normalizeComment(payload?.comment),
          beforeState: null,
          afterState: { cesadFinalOpinionStatus: CesadFinalOpinionStatus.DRAFT },
          eligibility,
        }),
      });

      return this.toResponseDto(created);
    });
  }

  async saveDraft(
    processId: string,
    user: AuthenticatedUser,
    payload: UpsertCesadFinalOpinionDto,
  ): Promise<CesadFinalOpinionResponseDto> {
    const normalizedPayload = this.normalizePayload(payload, false);

    return this.prismaService.$transaction(async (transaction) => {
      const process = await this.processesService.findProcessOrThrow(transaction, processId);
      const processStatus = this.toContractProcessStatus(process.status);
      this.ensureWriteAllowedForProcessStatus(processStatus);
      await this.cesadContextAuthorizationService.ensureCanWriteCesadFinalOpinion({
        user,
        processId,
        transaction,
        allowAdmin: true,
      });

      const existing = await transaction.cesadFinalOpinion.findUnique({
        where: { processId },
      });

      const occurredAt = new Date();
      let opinion: CesadFinalOpinionRow;
      let beforeStatus: CesadFinalOpinionStatus | null = null;

      if (existing) {
        if (existing.status === PrismaCesadFinalOpinionStatus.COMPLETED) {
          throw new BadRequestException(
            'Completed CESAD final opinion cannot be edited as draft',
          );
        }
        beforeStatus = this.toContractFinalOpinionStatus(existing.status);
        opinion = await transaction.cesadFinalOpinion.update({
          where: { processId },
          data: {
            authorUserId: user.sub,
            status: PrismaCesadFinalOpinionStatus.DRAFT,
            reportText: normalizedPayload.reportText,
            legalBasis: normalizedPayload.legalBasis,
            finalConclusion: normalizedPayload.finalConclusion,
            finalResult: normalizedPayload.finalResult,
            finalConcept: normalizedPayload.finalConcept,
            recommendation: normalizedPayload.recommendation,
            completedAt: null,
          },
        });
      } else {
        const eligibility = await this.eligibilityService.evaluate(processId, transaction);
        this.ensureEligibleOrThrow(eligibility);
        opinion = await transaction.cesadFinalOpinion.create({
          data: {
            processId,
            authorUserId: user.sub,
            status: PrismaCesadFinalOpinionStatus.DRAFT,
            reportText: normalizedPayload.reportText,
            legalBasis: normalizedPayload.legalBasis,
            finalConclusion: normalizedPayload.finalConclusion,
            finalResult: normalizedPayload.finalResult,
            finalConcept: normalizedPayload.finalConcept,
            recommendation: normalizedPayload.recommendation,
          },
        });

        await transaction.auditEvent.create({
          data: this.buildAuditEvent({
            processId,
            cesadFinalOpinionId: opinion.id,
            user,
            eventType: AuditEventType.CESAD_FINAL_OPINION_STARTED,
            action: ProcessAction.START_CESAD_FINAL_OPINION,
            processStatus,
            occurredAt,
            comment: null,
            beforeState: null,
            afterState: { cesadFinalOpinionStatus: CesadFinalOpinionStatus.DRAFT },
            eligibility,
          }),
        });
      }

      await transaction.auditEvent.create({
        data: this.buildAuditEvent({
          processId,
          cesadFinalOpinionId: opinion.id,
          user,
          eventType: AuditEventType.CESAD_FINAL_OPINION_DRAFT_SAVED,
          action: ProcessAction.SAVE_CESAD_FINAL_OPINION_DRAFT,
          processStatus,
          occurredAt,
          comment: normalizedPayload.comment,
          beforeState: existing
            ? { cesadFinalOpinionStatus: beforeStatus ?? CesadFinalOpinionStatus.DRAFT }
            : { cesadFinalOpinionStatus: CesadFinalOpinionStatus.DRAFT },
          afterState: { cesadFinalOpinionStatus: CesadFinalOpinionStatus.DRAFT },
        }),
      });

      return this.toResponseDto(opinion);
    });
  }

  async complete(
    processId: string,
    user: AuthenticatedUser,
    payload: UpsertCesadFinalOpinionDto,
  ): Promise<CesadFinalOpinionResponseDto> {
    return this.prismaService.$transaction(async (transaction) => {
      const process = await this.processesService.findProcessOrThrow(transaction, processId);
      const processStatus = this.toContractProcessStatus(process.status);
      this.ensureWriteAllowedForProcessStatus(processStatus);
      await this.cesadContextAuthorizationService.ensureCanWriteCesadFinalOpinion({
        user,
        processId,
        transaction,
        allowAdmin: true,
      });

      const eligibility = await this.eligibilityService.evaluate(processId, transaction);
      this.ensureEligibleOrThrow(eligibility);

      const existing = await transaction.cesadFinalOpinion.findUnique({
        where: { processId },
      });

      if (!existing) {
        throw new BadRequestException(
          'CESAD final opinion must be started as DRAFT before completion',
        );
      }

      if (existing.status === PrismaCesadFinalOpinionStatus.COMPLETED) {
        throw new BadRequestException('CESAD final opinion has already been completed');
      }

      if (existing.status !== PrismaCesadFinalOpinionStatus.DRAFT) {
        throw new BadRequestException('Only DRAFT CESAD final opinion can be completed');
      }

      const snapshot = await this.consolidationService.buildSnapshot(processId, transaction);
      const completedAt = new Date();
      const normalizedPayload = this.normalizePayload(payload, true);
      const beforeStatus = this.toContractFinalOpinionStatus(existing.status);

      const opinion = await transaction.cesadFinalOpinion.update({
        where: { processId },
        data: {
          authorUserId: user.sub,
          status: PrismaCesadFinalOpinionStatus.COMPLETED,
          reportText: normalizedPayload.reportText,
          legalBasis: normalizedPayload.legalBasis,
          finalConclusion: normalizedPayload.finalConclusion,
          finalResult: normalizedPayload.finalResult,
          finalConcept: normalizedPayload.finalConcept,
          recommendation: normalizedPayload.recommendation,
          consolidatedSnapshot: this.toJsonInput(snapshot),
          completedAt,
        },
      });

      await transaction.auditEvent.create({
        data: this.buildAuditEvent({
          processId,
          cesadFinalOpinionId: opinion.id,
          user,
          eventType: AuditEventType.CESAD_FINAL_OPINION_COMPLETED,
          action: ProcessAction.COMPLETE_CESAD_FINAL_OPINION,
          processStatus,
          occurredAt: completedAt,
          comment: normalizedPayload.comment,
          beforeState: {
            cesadFinalOpinionStatus: beforeStatus,
          },
          afterState: { cesadFinalOpinionStatus: CesadFinalOpinionStatus.COMPLETED },
          eligibility,
          snapshotMeta: {
            generatedAt: snapshot.generatedAt,
            stageCount: snapshot.stageCount,
            completedStageCount: snapshot.completedStageCount,
          },
          resultSummary: {
            finalConcept: normalizedPayload.finalConcept,
            finalResult: normalizedPayload.finalResult,
            recommendation: normalizedPayload.recommendation,
          },
        }),
      });

      return this.toResponseDto(opinion);
    });
  }

  async sendToHomologation(
    processId: string,
    user: AuthenticatedUser,
    payload: SendCesadFinalOpinionToHomologationDto = {},
  ): Promise<SendCesadFinalOpinionToHomologationResponseDto> {
    const comment = this.normalizeComment(payload.comment);

    return this.prismaService.$transaction(async (transaction) => {
      const process = await this.processesService.findProcessOrThrow(transaction, processId);
      const processStatus = this.toContractProcessStatus(process.status);
      this.ensureWriteAllowedForProcessStatus(processStatus);

      await this.cesadContextAuthorizationService.ensureCanWriteCesadFinalOpinion({
        user,
        processId,
        transaction,
        allowAdmin: true,
      });

      const opinion = await transaction.cesadFinalOpinion.findUnique({
        where: { processId },
        include: {
          expectedSigners: {
            include: {
              signatureRecords: true,
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });

      if (!opinion) {
        throw new NotFoundException('CESAD final opinion not found');
      }

      if (opinion.status !== PrismaCesadFinalOpinionStatus.COMPLETED) {
        throw new BadRequestException(
          'Only a COMPLETED CESAD final opinion can be sent to homologation',
        );
      }

      if (opinion.sentToHomologationAt !== null) {
        throw new ConflictException('CESAD final opinion has already been sent to homologation');
      }

      const finalDocument = await transaction.processDocument.findFirst({
        where: {
          evaluationProcessId: processId,
          processStageId: null,
          documentType: PrismaDocumentType.CESAD_OPINION,
          opinionKind: PrismaCesadOpinionKind.FINAL_CONCLUSIVE,
        },
        include: {
          signatureRecords: true,
        },
      });

      if (!finalDocument) {
        const mismatchedFinalCesadDocument = await transaction.processDocument.findFirst({
          where: {
            evaluationProcessId: processId,
            processStageId: null,
            documentType: PrismaDocumentType.CESAD_OPINION,
          },
        });

        if (mismatchedFinalCesadDocument) {
          throw new BadRequestException(
            'CESAD final opinion document must have opinionKind FINAL_CONCLUSIVE',
          );
        }

        throw new NotFoundException('CESAD final opinion document not found');
      }

      if (finalDocument.documentStatus !== PrismaDocumentStatus.SIGNED) {
        throw new BadRequestException(
          'CESAD final opinion document must be SIGNED before sending to homologation',
        );
      }

      if (opinion.expectedSigners.length === 0) {
        throw new BadRequestException(
          'CESAD final opinion cannot be sent to homologation without expected signers',
        );
      }

      const expectedSignerIds = opinion.expectedSigners.map((signer) => signer.id);
      const completedFinalSignatures = finalDocument.signatureRecords.filter(
        (signature) =>
          signature.cesadFinalOpinionExpectedSignerId !== null &&
          expectedSignerIds.includes(signature.cesadFinalOpinionExpectedSignerId) &&
          signature.status === PrismaSignatureStatus.COMPLETED,
      );

      if (completedFinalSignatures.length !== expectedSignerIds.length) {
        throw new BadRequestException(
          'CESAD final opinion requires all expected signatures completed before sending to homologation',
        );
      }

      const sentToHomologationAt = new Date();
      const updatedOpinion = await transaction.cesadFinalOpinion.update({
        where: { processId },
        data: {
          sentToHomologationAt,
          sentToHomologationByUserId: user.sub,
        },
      });

      await transaction.auditEvent.create({
        data: this.buildAuditEvent({
          processId,
          cesadFinalOpinionId: opinion.id,
          user,
          eventType: AuditEventType.SENT_TO_HOMOLOGATION,
          action: ProcessAction.SEND_TO_HOMOLOGATION,
          processStatus,
          occurredAt: sentToHomologationAt,
          comment,
          beforeState: {
            cesadFinalOpinionStatus: CesadFinalOpinionStatus.COMPLETED,
            sentToHomologationAt: null,
          },
          afterState: {
            cesadFinalOpinionStatus: CesadFinalOpinionStatus.COMPLETED,
            sentToHomologationAt: sentToHomologationAt.toISOString(),
          },
          sendToHomologation: {
            finalOpinionDocumentId: finalDocument.id,
            expectedSignerCount: expectedSignerIds.length,
            completedSignatureCount: completedFinalSignatures.length,
          },
        }),
      });

      return {
        processId,
        cesadFinalOpinionId: updatedOpinion.id,
        sentToHomologationAt: sentToHomologationAt.toISOString(),
        sentToHomologationByUserId: user.sub,
        processStatus,
      };
    });
  }

  private ensureWriteAllowedForProcessStatus(status: ProcessStatus): void {
    if (status !== ProcessStatus.PARECER_EMITIDO) {
      throw new BadRequestException(
        `CESAD final opinion can only be manipulated while process is in ${ProcessStatus.PARECER_EMITIDO} status`,
      );
    }
  }

  private ensureEligibleOrThrow(eligibility: CesadFinalOpinionEligibilityResult): void {
    if (!eligibility.isEligible) {
      throw new BadRequestException({
        message: 'Process is not eligible for CESAD final opinion',
        reasons: eligibility.reasons,
      });
    }
  }

  private normalizePayload(
    payload: UpsertCesadFinalOpinionDto,
    requireCompletedFields: boolean,
  ): NormalizedPayload {
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('CESAD final opinion payload must be an object');
    }

    const reportText = this.normalizeRequiredOrDraftText(
      payload.reportText,
      'reportText',
      requireCompletedFields,
    );
    const finalConclusion = this.normalizeRequiredOrDraftText(
      payload.finalConclusion,
      'finalConclusion',
      requireCompletedFields,
    );

    return {
      reportText,
      legalBasis: this.normalizeOptionalText(payload.legalBasis, 'legalBasis'),
      finalConclusion,
      finalResult: this.normalizeOptionalText(payload.finalResult, 'finalResult'),
      finalConcept: this.normalizeOptionalText(payload.finalConcept, 'finalConcept'),
      recommendation: this.normalizeOptionalText(payload.recommendation, 'recommendation'),
      comment: this.normalizeOptionalText(payload.comment, 'comment'),
    };
  }

  private normalizeRequiredOrDraftText(
    value: unknown,
    fieldName: string,
    requireCompletedFields: boolean,
  ): string {
    if (typeof value !== 'string') {
      throw new BadRequestException(`CESAD final opinion ${fieldName} must be a string`);
    }

    const normalizedValue = value.trim();
    if (requireCompletedFields && normalizedValue.length === 0) {
      throw new BadRequestException(
        `CESAD final opinion ${fieldName} is required to complete the artifact`,
      );
    }

    return normalizedValue;
  }

  private normalizeOptionalText(value: unknown, fieldName: string): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(
        `CESAD final opinion ${fieldName} must be a string when provided`,
      );
    }

    const normalizedValue = value.trim();
    return normalizedValue.length > 0 ? normalizedValue : null;
  }

  private normalizeComment(value: unknown): string | null {
    return this.normalizeOptionalText(value, 'comment');
  }

  private buildAuditEvent(params: {
    processId: string;
    cesadFinalOpinionId: string;
    user: AuthenticatedUser;
    eventType: AuditEventType;
    action: ProcessAction;
    processStatus: ProcessStatus;
    occurredAt: Date;
    comment: string | null;
    beforeState: Prisma.InputJsonObject | null;
    afterState: Prisma.InputJsonObject;
    eligibility?: CesadFinalOpinionEligibilityResult;
    snapshotMeta?: {
      generatedAt: string;
      stageCount: number;
      completedStageCount: number;
    };
    resultSummary?: {
      finalConcept: string | null;
      finalResult: string | null;
      recommendation: string | null;
    };
    sendToHomologation?: {
      finalOpinionDocumentId: string;
      expectedSignerCount: number;
      completedSignatureCount: number;
    };
  }): Prisma.AuditEventUncheckedCreateInput {
    const occurredAtIso = params.occurredAt.toISOString();
    const metadata: Record<string, unknown> = {
      eventType: params.eventType,
      action: params.action,
      performedByUserId: params.user.sub,
      performedByRole: params.user.role,
      occurredAt: occurredAtIso,
      processStatus: params.processStatus,
      origin: 'CESAD_FINAL_OPINION',
      scope: 'FINAL',
      processId: params.processId,
      cesadFinalOpinionId: params.cesadFinalOpinionId,
    };

    if (params.eligibility) {
      metadata.stageCount = params.eligibility.stageCount;
      metadata.completedStageCount = params.eligibility.completedStageCount;
    }

    if (params.snapshotMeta) {
      metadata.snapshotGeneratedAt = params.snapshotMeta.generatedAt;
      metadata.snapshotStageCount = params.snapshotMeta.stageCount;
      metadata.snapshotCompletedStageCount = params.snapshotMeta.completedStageCount;
    }

    if (params.resultSummary) {
      if (params.resultSummary.finalConcept) {
        metadata.finalConcept = params.resultSummary.finalConcept;
      }
      if (params.resultSummary.finalResult) {
        metadata.finalResult = params.resultSummary.finalResult;
      }
      if (params.resultSummary.recommendation) {
        metadata.recommendation = params.resultSummary.recommendation;
      }
    }

    if (params.sendToHomologation) {
      metadata.finalOpinionDocumentId = params.sendToHomologation.finalOpinionDocumentId;
      metadata.opinionKind = 'FINAL_CONCLUSIVE';
      metadata.documentStatus = 'SIGNED';
      metadata.expectedSignerCount = params.sendToHomologation.expectedSignerCount;
      metadata.completedSignatureCount = params.sendToHomologation.completedSignatureCount;
      metadata.sentToHomologationAt = occurredAtIso;
    }

    if (params.comment) {
      metadata.comment = params.comment;
    }

    return {
      evaluationProcessId: params.processId,
      actorUserId: params.user.sub,
      actorRole: this.toDatabaseRole(params.user.role),
      eventType: this.toDatabaseAuditEventType(params.eventType),
      beforeState: params.beforeState ?? Prisma.JsonNull,
      afterState: params.afterState,
      occurredAt: params.occurredAt,
      metadata: metadata as Prisma.InputJsonObject,
    };
  }

  private toResponseDto(opinion: CesadFinalOpinionRow): CesadFinalOpinionResponseDto {
    return {
      id: opinion.id,
      scope: 'FINAL',
      processId: opinion.processId,
      authorUserId: opinion.authorUserId,
      status: this.toContractFinalOpinionStatus(opinion.status),
      reportText: opinion.reportText,
      legalBasis: opinion.legalBasis,
      finalConclusion: opinion.finalConclusion,
      finalResult: opinion.finalResult,
      finalConcept: opinion.finalConcept,
      recommendation: opinion.recommendation,
      consolidatedSnapshot: this.toContractSnapshot(opinion.consolidatedSnapshot),
      completedAt: opinion.completedAt?.toISOString() ?? null,
      sentToHomologationAt: opinion.sentToHomologationAt?.toISOString() ?? null,
      sentToHomologationByUserId: opinion.sentToHomologationByUserId,
      createdAt: opinion.createdAt.toISOString(),
      updatedAt: opinion.updatedAt.toISOString(),
    };
  }

  private toContractSnapshot(
    snapshot: Prisma.JsonValue | null,
  ): CesadFinalOpinionConsolidatedSnapshotRef | null {
    if (snapshot === null) {
      return null;
    }
    if (typeof snapshot !== 'object' || Array.isArray(snapshot)) {
      return null;
    }
    return snapshot as unknown as CesadFinalOpinionConsolidatedSnapshotRef;
  }

  private toJsonInput(value: CesadFinalOpinionConsolidatedSnapshotRef): Prisma.InputJsonValue {
    return value as unknown as Prisma.InputJsonValue;
  }

  private toContractFinalOpinionStatus(
    status: PrismaCesadFinalOpinionStatus,
  ): CesadFinalOpinionStatus {
    if (!Object.values(CesadFinalOpinionStatus).includes(status as CesadFinalOpinionStatus)) {
      throw new BadRequestException(`Unsupported CESAD final opinion status ${status}`);
    }
    return status as CesadFinalOpinionStatus;
  }

  private toContractProcessStatus(status: PrismaProcessStatus): ProcessStatus {
    return toContractProcessStatusShared(status);
  }

  private toDatabaseRole(role: UserRole): PrismaUserRole {
    return toDatabaseRole(role);
  }

  private toDatabaseAuditEventType(eventType: AuditEventType): PrismaAuditEventType {
    return toDatabaseAuditEventType(eventType);
  }
}
