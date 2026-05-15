import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import {
  AuditEventType as PrismaAuditEventType,
  CesadCommissionMemberRoleType as PrismaCesadCommissionMemberRoleType,
  CesadStageOpinionExpectedSignerDerivationType as PrismaCesadStageOpinionExpectedSignerDerivationType,
  CesadStageOpinionSigningCapacity as PrismaCesadStageOpinionSigningCapacity,
  CesadStageOpinionStatus as PrismaCesadStageOpinionStatus,
  Prisma,
  ProcessStatus as PrismaProcessStatus,
  UserRole as PrismaUserRole,
} from '@prisma/client';
import {
  AuditEventType,
  CesadCommissionMemberRoleType,
  CesadStageOpinionExpectedSignerDerivationType,
  CesadStageOpinionSigningCapacity,
  CesadStageOpinionStatus,
  type CesadStageOpinionExpectedSignerRef,
  ProcessAction,
  ProcessStatus,
  UserRole,
} from '@sadep/contracts';

import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { CesadContextAuthorizationService } from '../../cesad/authorization/cesad-context-authorization.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ProcessesService, type PrismaTransactionClient } from '../processes.service';
import type {
  CesadStageOpinionResponseDto,
  UpsertCesadStageOpinionDto,
} from './dto/cesad-stage-opinion.dto';

const CESAD_STAGE_OPINION_READ_ALLOWED_STATUSES = new Set<ProcessStatus>([
  ProcessStatus.EM_ANALISE_CESAD,
  ProcessStatus.PARECER_EMITIDO,
]);

const CESAD_STAGE_OPINION_WRITE_ALLOWED_STATUSES = new Set<ProcessStatus>([
  ProcessStatus.EM_ANALISE_CESAD,
]);

@Injectable()
export class CesadStageOpinionsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly processesService: ProcessesService,
    private readonly cesadContextAuthorizationService: CesadContextAuthorizationService,
  ) {}

  async getByStageSequence(
    processId: string,
    stageSequence: number,
    user: AuthenticatedUser,
  ): Promise<CesadStageOpinionResponseDto | null> {
    const process = await this.processesService.findProcessOrThrow(this.prismaService, processId);
    this.ensureReadAllowedForProcessStatus(this.toContractProcessStatus(process.status));

    const stage = await this.processesService.findStageBySequenceOrThrow(
      this.prismaService,
      processId,
      stageSequence,
    );
    await this.cesadContextAuthorizationService.ensureCanReadCesadStage({
      user,
      processStageId: stage.id,
    });

    const opinion = await this.prismaService.cesadStageOpinion.findUnique({
      where: { processStageId: stage.id },
      include: {
        expectedSigners: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return opinion ? this.toResponseDto(opinion) : null;
  }

  async saveDraft(
    processId: string,
    stageSequence: number,
    user: AuthenticatedUser,
    payload: UpsertCesadStageOpinionDto,
  ): Promise<CesadStageOpinionResponseDto> {
    const normalizedPayload = this.normalizePayload(payload, false);

    return this.prismaService.$transaction(async (transaction) => {
      const process = await this.processesService.findProcessOrThrow(transaction, processId);
      const processStatus = this.toContractProcessStatus(process.status);
      this.ensureWriteAllowedForProcessStatus(processStatus);

      const stage = await this.processesService.findStageBySequenceOrThrow(
        transaction,
        processId,
        stageSequence,
      );
      this.processesService.assertStageIsActiveForArtifactCreation(stage);
      await this.cesadContextAuthorizationService.ensureCanWriteCesadStageOpinion({
        user,
        processStageId: stage.id,
        transaction,
      });
      const existingOpinion = await transaction.cesadStageOpinion.findUnique({
        where: { processStageId: stage.id },
      });

      if (existingOpinion?.status === PrismaCesadStageOpinionStatus.COMPLETED) {
        throw new BadRequestException('Completed CESAD stage opinion cannot be edited as draft');
      }

      const occurredAt = new Date().toISOString();
      const savedOpinion = existingOpinion
        ? await transaction.cesadStageOpinion.update({
            where: { processStageId: stage.id },
            data: {
              authorUserId: user.sub,
              status: PrismaCesadStageOpinionStatus.DRAFT,
              reportText: normalizedPayload.reportText,
              legalBasis: normalizedPayload.legalBasis,
              conclusion: normalizedPayload.conclusion,
              stageConcept: normalizedPayload.stageConcept,
              stageResult: normalizedPayload.stageResult,
              completedAt: null,
            },
          })
        : await transaction.cesadStageOpinion.create({
            data: {
              processId,
              processStageId: stage.id,
              authorUserId: user.sub,
              status: PrismaCesadStageOpinionStatus.DRAFT,
              reportText: normalizedPayload.reportText,
              legalBasis: normalizedPayload.legalBasis,
              conclusion: normalizedPayload.conclusion,
              stageConcept: normalizedPayload.stageConcept,
              stageResult: normalizedPayload.stageResult,
            },
          });

      if (!existingOpinion) {
        await transaction.auditEvent.create({
          data: this.buildAuditEvent({
            processId,
            processStageId: stage.id,
            stageSequence: stage.sequence,
            user,
            eventType: AuditEventType.CESAD_STAGE_OPINION_STARTED,
            action: ProcessAction.START_CESAD_OPINION,
            processStatus,
            occurredAt,
            comment: normalizedPayload.comment,
            beforeState: null,
            afterState: { cesadStageOpinionStatus: CesadStageOpinionStatus.DRAFT },
            metadata: {
              cesadStageOpinionId: savedOpinion.id,
              scope: 'STAGE',
            },
          }),
        });
      } else {
        await transaction.auditEvent.create({
          data: this.buildAuditEvent({
            processId,
            processStageId: stage.id,
            stageSequence: stage.sequence,
            user,
            eventType: AuditEventType.CESAD_STAGE_OPINION_DRAFT_SAVED,
            action: ProcessAction.SAVE_CESAD_OPINION_DRAFT,
            processStatus,
            occurredAt,
            comment: normalizedPayload.comment,
            beforeState: { cesadStageOpinionStatus: this.toContractOpinionStatus(existingOpinion.status) },
            afterState: { cesadStageOpinionStatus: CesadStageOpinionStatus.DRAFT },
            metadata: {
              cesadStageOpinionId: savedOpinion.id,
              scope: 'STAGE',
            },
          }),
        });
      }

      return this.toResponseDto(savedOpinion);
    });
  }

  async complete(
    processId: string,
    stageSequence: number,
    user: AuthenticatedUser,
    payload: UpsertCesadStageOpinionDto,
  ): Promise<CesadStageOpinionResponseDto> {
    const normalizedPayload = this.normalizePayload(payload, true);

    return this.prismaService.$transaction(async (transaction) => {
      const process = await this.processesService.findProcessOrThrow(transaction, processId);
      const processStatus = this.toContractProcessStatus(process.status);
      this.ensureWriteAllowedForProcessStatus(processStatus);

      const stage = await this.processesService.findStageBySequenceOrThrow(
        transaction,
        processId,
        stageSequence,
      );
      this.processesService.assertStageIsActiveForArtifactCreation(stage);
      await this.cesadContextAuthorizationService.ensureCanWriteCesadStageOpinion({
        user,
        processStageId: stage.id,
        transaction,
      });
      const existingOpinion = await transaction.cesadStageOpinion.findUnique({
        where: { processStageId: stage.id },
      });

      if (existingOpinion?.status === PrismaCesadStageOpinionStatus.COMPLETED) {
        throw new BadRequestException('CESAD stage opinion has already been completed');
      }

      const completedAt = new Date();
      const completedOpinion = existingOpinion
        ? await transaction.cesadStageOpinion.update({
            where: { processStageId: stage.id },
            data: {
              authorUserId: user.sub,
              status: PrismaCesadStageOpinionStatus.COMPLETED,
              reportText: normalizedPayload.reportText,
              legalBasis: normalizedPayload.legalBasis,
              conclusion: normalizedPayload.conclusion,
              stageConcept: normalizedPayload.stageConcept,
              stageResult: normalizedPayload.stageResult,
              completedAt,
            },
          })
        : await transaction.cesadStageOpinion.create({
            data: {
              processId,
              processStageId: stage.id,
              authorUserId: user.sub,
              status: PrismaCesadStageOpinionStatus.COMPLETED,
              reportText: normalizedPayload.reportText,
              legalBasis: normalizedPayload.legalBasis,
              conclusion: normalizedPayload.conclusion,
              stageConcept: normalizedPayload.stageConcept,
              stageResult: normalizedPayload.stageResult,
              completedAt,
            },
          });

      const occurredAt = completedAt.toISOString();

      if (!existingOpinion) {
        await transaction.auditEvent.create({
          data: this.buildAuditEvent({
            processId,
            processStageId: stage.id,
            stageSequence: stage.sequence,
            user,
            eventType: AuditEventType.CESAD_STAGE_OPINION_STARTED,
            action: ProcessAction.START_CESAD_OPINION,
            processStatus,
            occurredAt,
            comment: normalizedPayload.comment,
            beforeState: null,
            afterState: { cesadStageOpinionStatus: CesadStageOpinionStatus.DRAFT },
            metadata: {
              cesadStageOpinionId: completedOpinion.id,
              scope: 'STAGE',
            },
          }),
        });
      }

      await transaction.auditEvent.create({
        data: this.buildAuditEvent({
          processId,
          processStageId: stage.id,
          stageSequence: stage.sequence,
          user,
          eventType: AuditEventType.CESAD_STAGE_OPINION_COMPLETED,
          action: ProcessAction.COMPLETE_CESAD_STAGE_OPINION,
          processStatus,
          occurredAt,
          comment: normalizedPayload.comment,
          beforeState: {
            cesadStageOpinionStatus: existingOpinion
              ? this.toContractOpinionStatus(existingOpinion.status)
              : CesadStageOpinionStatus.DRAFT,
          },
          afterState: { cesadStageOpinionStatus: CesadStageOpinionStatus.COMPLETED },
          metadata: {
            cesadStageOpinionId: completedOpinion.id,
            scope: 'STAGE',
          },
        }),
      });

      return this.toResponseDto(completedOpinion);
    });
  }

  private ensureReadAllowedForProcessStatus(status: ProcessStatus): void {
    if (!CESAD_STAGE_OPINION_READ_ALLOWED_STATUSES.has(status)) {
      throw new BadRequestException(
        `CESAD stage opinion read is only available while process is in ${ProcessStatus.EM_ANALISE_CESAD} or ${ProcessStatus.PARECER_EMITIDO} status`,
      );
    }
  }

  private ensureWriteAllowedForProcessStatus(status: ProcessStatus): void {
    if (!CESAD_STAGE_OPINION_WRITE_ALLOWED_STATUSES.has(status)) {
      throw new BadRequestException(
        `CESAD stage opinion artifact can only be manipulated while process is in ${ProcessStatus.EM_ANALISE_CESAD} status`,
      );
    }
  }

  private normalizePayload(
    payload: UpsertCesadStageOpinionDto,
    requireCompletedFields: boolean,
  ): {
    reportText: string;
    legalBasis: string | null;
    conclusion: string;
    stageConcept: string | null;
    stageResult: string | null;
    comment: string | null;
  } {
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('CESAD stage opinion payload must be an object');
    }

    const reportText = this.normalizeRequiredOrDraftText(
      payload.reportText,
      'reportText',
      requireCompletedFields,
    );
    const conclusion = this.normalizeRequiredOrDraftText(
      payload.conclusion,
      'conclusion',
      requireCompletedFields,
    );

    return {
      reportText,
      legalBasis: this.normalizeOptionalText(payload.legalBasis, 'legalBasis'),
      conclusion,
      stageConcept: this.normalizeOptionalText(payload.stageConcept, 'stageConcept'),
      stageResult: this.normalizeOptionalText(payload.stageResult, 'stageResult'),
      comment: this.normalizeOptionalText(payload.comment, 'comment'),
    };
  }

  private normalizeRequiredOrDraftText(
    value: unknown,
    fieldName: string,
    requireCompletedFields: boolean,
  ): string {
    if (typeof value !== 'string') {
      throw new BadRequestException(`CESAD stage opinion ${fieldName} must be a string`);
    }

    const normalizedValue = value.trim();
    if (requireCompletedFields && normalizedValue.length === 0) {
      throw new BadRequestException(`CESAD stage opinion ${fieldName} is required to complete the artifact`);
    }

    return normalizedValue;
  }

  private normalizeOptionalText(value: unknown, fieldName: string): string | null {
    if (value === undefined) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(`CESAD stage opinion ${fieldName} must be a string when provided`);
    }

    const normalizedValue = value.trim();
    return normalizedValue.length > 0 ? normalizedValue : null;
  }

  private buildAuditEvent(params: {
    processId: string;
    processStageId: string;
    stageSequence: number;
    user: AuthenticatedUser;
    eventType: AuditEventType;
    action: ProcessAction;
    processStatus: ProcessStatus;
    occurredAt: string;
    comment: string | null;
    beforeState: Prisma.InputJsonObject | null;
    afterState: Prisma.InputJsonObject;
    metadata: Record<string, unknown>;
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
        origin: 'CESAD_STAGE_OPINION',
        processStageId: params.processStageId,
        stageSequence: params.stageSequence,
        ...params.metadata,
        ...(params.comment ? { comment: params.comment } : {}),
      },
    };
  }

  private toResponseDto(opinion: {
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
    expectedSigners?: Array<{
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
  }): CesadStageOpinionResponseDto {
    return {
      id: opinion.id,
      scope: 'STAGE',
      processId: opinion.processId,
      processStageId: opinion.processStageId,
      authorUserId: opinion.authorUserId,
      status: this.toContractOpinionStatus(opinion.status),
      reportText: opinion.reportText,
      legalBasis: opinion.legalBasis,
      conclusion: opinion.conclusion,
      stageConcept: opinion.stageConcept,
      stageResult: opinion.stageResult,
      completedAt: opinion.completedAt?.toISOString() ?? null,
      expectedSigners: (opinion.expectedSigners ?? []).map((signer) =>
        this.toExpectedSignerRef(signer),
      ),
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

  private toContractOpinionStatus(
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
        `Unsupported CESAD stage opinion expected signer derivation type ${derivationType}`,
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
        `Unsupported CESAD stage opinion signing capacity ${signingCapacity}`,
      );
    }

    return signingCapacity as CesadStageOpinionSigningCapacity;
  }

  private toContractCommissionMemberRoleType(
    roleType: PrismaCesadCommissionMemberRoleType,
  ): CesadCommissionMemberRoleType {
    if (!Object.values(CesadCommissionMemberRoleType).includes(roleType as CesadCommissionMemberRoleType)) {
      throw new BadRequestException(`Unsupported CESAD commission member role type ${roleType}`);
    }

    return roleType as CesadCommissionMemberRoleType;
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
