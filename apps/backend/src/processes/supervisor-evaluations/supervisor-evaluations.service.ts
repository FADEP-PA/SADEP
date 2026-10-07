import { validateEvaluationText } from '../evaluation-text-validation';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
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
  calculateEvaluationRatingsScore,
  isValidEvaluationRating,
  LEGACY_EVALUATION_SCORING_VERSION,
  PERCENT_EVALUATION_SCORING_VERSION,
  ProcessAction,
  ProcessStatus,
  SupervisorEvaluationStatus,
  UserRole,
} from '@sadep/contracts';

import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  toDatabaseAuditEventType,
  toDatabaseRole,
  toContractProcessStatus as toContractProcessStatusShared,
} from '../process-type-mappers';
import { ProcessesService, type PrismaTransactionClient } from '../processes.service';
import { ProcessDocumentsService } from '../../application/documents/process-documents.service';
import { ProcessDocumentArtifactService } from '../../application/documents/process-document-artifact.service';
import type {
  SupervisorEvaluationContentDto,
  SupervisorEvaluationResponseDto,
  SupervisorEvaluationWorkspaceSnapshotDto,
  UpsertSupervisorEvaluationDto,
} from './dto/supervisor-evaluation.dto';
import { isSupervisorEvaluationContentDto } from './dto/supervisor-evaluation.dto';

const READ_ALLOWED_ROLES = [UserRole.IMMEDIATE_SUPERVISOR, UserRole.INTERN_SERVER] as const;
const WRITE_ALLOWED_ROLES = [UserRole.IMMEDIATE_SUPERVISOR] as const;

@Injectable()
export class SupervisorEvaluationsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly processesService: ProcessesService,
    private readonly processDocumentsService: ProcessDocumentsService,
    @Optional() private readonly processDocumentArtifactService?: ProcessDocumentArtifactService,
  ) {}

  async getByProcessId(
    processId: string,
    user: AuthenticatedUser,
  ): Promise<SupervisorEvaluationResponseDto | null> {
    const { currentStage } = await this.assertCanReadSupervisorEvaluation(
      this.prismaService,
      processId,
      user,
    );

    const evaluation = await this.prismaService.supervisorEvaluation.findUnique({
      where: { processStageId: currentStage.id },
    });

    if (!evaluation) {
      return null;
    }

    if (user.role === UserRole.INTERN_SERVER && evaluation.status !== PrismaSupervisorEvaluationStatus.SUBMITTED) {
      throw new ForbiddenException(
        'Intern server can only access supervisor evaluation after submission and document formalization',
      );
    }

    const response = this.toResponseDto(evaluation);

    // Add document context if evaluation is submitted
    if (evaluation.status === PrismaSupervisorEvaluationStatus.SUBMITTED) {
      const documentContext = await this.processDocumentsService.getSupervisorEvaluationDocumentContext(
        this.prismaService,
        processId,
        currentStage.id,
      );
      if (documentContext) {
        response.documentContext = documentContext;
      }
    }

    return response;
  }

  async getWorkspaceByProcessId(
    processId: string,
    user: AuthenticatedUser,
  ): Promise<SupervisorEvaluationWorkspaceSnapshotDto> {
    const { process, currentStage } = await this.assertCanWriteSupervisorEvaluation(
      this.prismaService,
      processId,
      user,
    );

    const processStatus = this.toContractProcessStatus(process.status);
    const evaluation = await this.prismaService.supervisorEvaluation.findUnique({
      where: { processStageId: currentStage.id },
    });
    const documentContext = await this.processDocumentsService.getSupervisorEvaluationDocumentContext(
      this.prismaService,
      processId,
      currentStage.id,
    );
    const supervisorEvaluation = evaluation ? this.toResponseDto(evaluation) : null;

    if (supervisorEvaluation && documentContext) {
      supervisorEvaluation.documentContext = documentContext;
    }

    const canEditDraft = processStatus === ProcessStatus.EM_AVALIACAO;
    const canSubmit = processStatus === ProcessStatus.EM_AVALIACAO;
    const canRectify =
      processStatus === ProcessStatus.AGUARDANDO_ASSINATURA &&
      evaluation?.status === PrismaSupervisorEvaluationStatus.SUBMITTED &&
      (await this.processDocumentsService.canRectifySupervisorEvaluation(
        this.prismaService,
        processId,
        currentStage.id,
      ));

    return {
      process: {
        id: process.id,
        status: processStatus,
        currentStageSequence: currentStage.sequence,
      },
      supervisorEvaluation,
      documentContext,
      canEditDraft,
      canSubmit,
      canRectify,
    };
  }

  async saveDraft(
    processId: string,
    user: AuthenticatedUser,
    payload: UpsertSupervisorEvaluationDto,
  ): Promise<SupervisorEvaluationResponseDto> {
    const normalizedPayload = this.normalizePayload(payload);

    return this.prismaService.$transaction(async (transaction) => {
      const { process, currentStage } = await this.assertCanWriteSupervisorEvaluation(
        transaction,
        processId,
        user,
      );

      if (this.toContractProcessStatus(process.status) !== ProcessStatus.EM_AVALIACAO) {
        throw new BadRequestException(
          `Supervisor evaluation draft can only be saved while process is in status ${ProcessStatus.EM_AVALIACAO}`,
        );
      }

      const existingEvaluation = await transaction.supervisorEvaluation.findUnique({
        where: { processStageId: currentStage.id },
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
            where: { processStageId: currentStage.id },
            data: {
              processStageId: currentStage.id,
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
              processStageId: currentStage.id,
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
          processStageId: currentStage.id,
          stageSequence: currentStage.sequence,
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
    const normalizedPayload = this.normalizePayload(payload);
    if (
      normalizedPayload.content.scoreScale === 'PERCENT_0_100' &&
      !this.hasAllExpectedCriteria(normalizedPayload.content)
    ) {
      throw new BadRequestException('All 20 criteria must have a rating before submission');
    }

    const result = await this.prismaService.$transaction(async (transaction) => {
      const { process, currentStage } = await this.assertCanWriteSupervisorEvaluation(
        transaction,
        processId,
        user,
      );
      const processStatus = this.toContractProcessStatus(process.status);

      if (processStatus !== ProcessStatus.EM_AVALIACAO) {
        throw new BadRequestException(
          `Supervisor evaluation can only be submitted while process is in status ${ProcessStatus.EM_AVALIACAO}`,
        );
      }

      const existingEvaluation = await transaction.supervisorEvaluation.findUnique({
        where: { processStageId: currentStage.id },
      });

      const beforeState = existingEvaluation
        ? { supervisorEvaluationStatus: this.toContractEvaluationStatus(existingEvaluation.status) }
        : null;

      const submittedAt = new Date();
      const savedEvaluation = existingEvaluation
        ? await transaction.supervisorEvaluation.update({
            where: { processStageId: currentStage.id },
            data: {
              processStageId: currentStage.id,
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
              processStageId: currentStage.id,
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
            processStageId: currentStage.id,
            stageSequence: currentStage.sequence,
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
          processStageId: currentStage.id,
          stageSequence: currentStage.sequence,
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

      await this.processesService.transitionWorkflowAsResponsibleSupervisorInTransaction(
        transaction,
        processId,
        user,
        {
          action: ProcessAction.RELEASE_FOR_SERVER_SIGNATURE,
          comment: normalizedPayload.comment,
        },
      );

      // Create or ensure ProcessDocument for supervisor evaluation
      const { documentId } = await this.processDocumentsService.ensureSupervisorEvaluationDocument(
        transaction,
        processId,
        currentStage.id,
        user,
      );

      // Get the intern user ID from the process
      const processWithIntern = await transaction.evaluationProcess.findUnique({
        where: { id: processId },
        select: { evaluatedUserId: true },
      });

      if (!processWithIntern) {
        throw new NotFoundException(`Process ${processId} not found`);
      }

      // Create signature records
      await this.processDocumentsService.createSupervisorEvaluationSignatures(
        transaction,
        processId,
        currentStage.id,
        documentId,
        currentStage.responsibleSupervisorUserId,
        processWithIntern.evaluatedUserId, // intern user ID
        user,
      );

      return { response: this.toResponseDto(savedEvaluation), documentId };
    });

    if (this.processDocumentArtifactService) {
      try {
        await this.processDocumentArtifactService.materializeAfterAuthorizedAction(result.documentId, user);
      } catch {
        // The logical submission is already committed; a physical retry remains safe.
      }
    }
    return result.response;
  }

  async rectify(
    processId: string,
    user: AuthenticatedUser,
    payload: UpsertSupervisorEvaluationDto,
  ): Promise<SupervisorEvaluationResponseDto> {
    const normalizedPayload = this.normalizePayload(payload);

    return this.prismaService.$transaction(async (transaction) => {
      const { process, currentStage } = await this.assertCanWriteSupervisorEvaluation(
        transaction,
        processId,
        user,
      );
      const processStatus = this.toContractProcessStatus(process.status);

      if (processStatus !== ProcessStatus.AGUARDANDO_ASSINATURA) {
        throw new BadRequestException(
          `Supervisor evaluation can only be rectified before signature while process is in status ${ProcessStatus.AGUARDANDO_ASSINATURA}`,
        );
      }

      const existingEvaluation = await transaction.supervisorEvaluation.findUnique({
        where: { processStageId: currentStage.id },
      });

      if (!existingEvaluation) {
        throw new NotFoundException(`Supervisor evaluation for process ${processId} was not found`);
      }

      if (existingEvaluation.status !== PrismaSupervisorEvaluationStatus.SUBMITTED) {
        throw new BadRequestException('Only submitted supervisor evaluations can be rectified');
      }

      // Check if rectification is allowed (intern hasn't signed)
      const canRectify = await this.processDocumentsService.canRectifySupervisorEvaluation(
        transaction,
        processId,
        currentStage.id,
      );

      if (!canRectify) {
        throw new BadRequestException('Supervisor evaluation cannot be rectified after intern signature');
      }

      const rectifiedEvaluation = await transaction.supervisorEvaluation.update({
        where: { processStageId: currentStage.id },
        data: {
          processStageId: currentStage.id,
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
          processStageId: currentStage.id,
          stageSequence: currentStage.sequence,
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

  private async assertCanReadSupervisorEvaluation(
    transaction: PrismaTransactionClient,
    processId: string,
    user: AuthenticatedUser,
  ): Promise<{
    process: { id: string; status: PrismaProcessStatus; evaluatedUserId: string };
    currentStage: {
      id: string;
      sequence: number;
      stageCode: string;
      responsibleSupervisorUserId: string;
      startedAt: Date | null;
      endedAt: Date | null;
    };
  }> {
    this.ensureAllowedRole(user.role, 'read');
    const process = await this.processesService.findProcessOrThrow(transaction, processId);
    const currentStage = await this.resolveCurrentStageWithResponsibleSupervisor(transaction, processId);

    if (user.role === UserRole.INTERN_SERVER) {
      if (process.evaluatedUserId !== user.sub) {
        throw new ForbiddenException('Authenticated user is not the evaluated server for this process');
      }

      return { process, currentStage };
    }

    this.assertResponsibleSupervisor(currentStage, user);
    return { process, currentStage };
  }

  private async assertCanWriteSupervisorEvaluation(
    transaction: PrismaTransactionClient,
    processId: string,
    user: AuthenticatedUser,
  ): Promise<{
    process: { id: string; status: PrismaProcessStatus; evaluatedUserId: string };
    currentStage: {
      id: string;
      sequence: number;
      stageCode: string;
      responsibleSupervisorUserId: string;
      startedAt: Date | null;
      endedAt: Date | null;
    };
  }> {
    this.ensureAllowedRole(user.role, 'write');
    const process = await this.processesService.findProcessOrThrow(transaction, processId);
    const currentStage = await this.resolveCurrentStageWithResponsibleSupervisor(transaction, processId);

    this.assertResponsibleSupervisor(currentStage, user);
    return { process, currentStage };
  }

  private async resolveCurrentStageWithResponsibleSupervisor(
    transaction: PrismaTransactionClient,
    processId: string,
  ): Promise<{
    id: string;
    sequence: number;
    stageCode: string;
    responsibleSupervisorUserId: string;
    startedAt: Date | null;
    endedAt: Date | null;
  }> {
    const currentStage = await this.processesService.resolveCurrentStageOrThrow(transaction, processId);

    if (!currentStage.responsibleSupervisorUserId) {
      throw new ForbiddenException('Process stage does not define a responsible supervisor');
    }

    return {
      ...currentStage,
      responsibleSupervisorUserId: currentStage.responsibleSupervisorUserId,
    };
  }

  private assertResponsibleSupervisor(
    currentStage: { responsibleSupervisorUserId: string },
    user: AuthenticatedUser,
  ): void {
    if (user.role !== UserRole.IMMEDIATE_SUPERVISOR) {
      throw new ForbiddenException(`Role ${user.role} cannot manipulate supervisor evaluations`);
    }

    if (currentStage.responsibleSupervisorUserId !== user.sub) {
      throw new ForbiddenException('Authenticated user is not the responsible supervisor for this process stage');
    }
  }

  private ensureAllowedRole(role: UserRole, mode: 'read' | 'write'): void {
    const allowedRoles = mode === 'read' ? READ_ALLOWED_ROLES : WRITE_ALLOWED_ROLES;

    if (!allowedRoles.some((allowedRole) => allowedRole === role)) {
      throw new ForbiddenException(
        mode === 'read'
          ? `Role ${role} cannot read supervisor evaluations`
          : `Role ${role} cannot manipulate supervisor evaluations`,
      );
    }
  }

  private normalizePayload(payload: UpsertSupervisorEvaluationDto): UpsertSupervisorEvaluationDto {
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('Supervisor evaluation payload must be an object');
    }

    const content = this.normalizeContent(payload.content);
    const fields = content.textFields;
    // Projections are derived, never parsed for validation or trusted from the client.
    if (!fields) {
      validateEvaluationText(payload.summary, 'summary');
      validateEvaluationText(payload.generalComments, 'generalComments');
    }
    const summary = this.normalizeRequiredText(
      fields ? [fields.unitCompetencies.trim(), fields.serverAssignments.trim()].filter(Boolean).join('\n\n') : payload.summary,
      'summary',
    );
    let generalComments: string;
    if (fields) {
      const expectedCriteria = Array.from({ length: 5 }, (_, factor) =>
        Array.from({ length: 4 }, (_, item) => `${factor + 1}.${item + 1}`),
      ).flat().map((code) => content.criteria.find((criterion) => criterion.code === code));
      const complete = expectedCriteria.every((criterion) => criterion !== undefined);
      const score = calculateEvaluationRatingsScore(
        expectedCriteria.flatMap((criterion) => criterion ? [criterion.rating] : []),
        content.scoreScale === 'PERCENT_0_100' ? 'PERCENT_0_100' : 'LEGACY_1_5',
      );
      const result = complete
        ? `Resultado final informado pela chefia: pontuação total ${score.totalStageScore}, média ${score.stageAverage}, conceito ${score.administrativeConcept}.`
        : '';
      generalComments = [fields.generalComments.trim(), result].filter(Boolean).join('\n\n') || 'Avaliação em preenchimento pela chefia.';
    } else {
      generalComments = this.normalizeRequiredText(payload.generalComments, 'generalComments');
    }
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

    validateEvaluationText(value, 'comment');
    const normalizedValue = value.trim();
    return normalizedValue.length > 0 ? normalizedValue : null;
  }

  private normalizeContent(value: unknown): SupervisorEvaluationContentDto {
    if (!value || typeof value !== 'object') {
      throw new BadRequestException('Supervisor evaluation content must be an object');
    }

    const candidateContent = value as {
      criteria?: unknown;
      scoreScale?: unknown;
      scoringVersion?: unknown;
    };
    const criteria = candidateContent.criteria;
    if (!Array.isArray(criteria) || criteria.length === 0) {
      throw new BadRequestException('Supervisor evaluation content must include at least one criterion');
    }

    const hasScale = candidateContent.scoreScale !== undefined || candidateContent.scoringVersion !== undefined;
    const scoreScale = hasScale ? candidateContent.scoreScale : 'LEGACY_1_5';
    const scoringVersion = hasScale ? candidateContent.scoringVersion : LEGACY_EVALUATION_SCORING_VERSION;
    if (scoreScale !== 'LEGACY_1_5' && scoreScale !== 'PERCENT_0_100') {
      throw new BadRequestException('Supervisor evaluation scoreScale must be LEGACY_1_5 or PERCENT_0_100');
    }
    if (scoringVersion !== LEGACY_EVALUATION_SCORING_VERSION && scoringVersion !== PERCENT_EVALUATION_SCORING_VERSION) {
      throw new BadRequestException('Supervisor evaluation scoringVersion is invalid');
    }
    if (
      (scoreScale === 'PERCENT_0_100' && scoringVersion !== PERCENT_EVALUATION_SCORING_VERSION) ||
      (scoreScale === 'LEGACY_1_5' && scoringVersion !== LEGACY_EVALUATION_SCORING_VERSION)
    ) {
      throw new BadRequestException('Supervisor evaluation scoreScale and scoringVersion do not match');
    }
    const textFields = this.normalizeTextFields((value as { textFields?: unknown }).textFields);
    return {
      ...(hasScale ? { scoreScale, scoringVersion } : {}),
      ...(textFields ? { textFields } : {}),
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

        if (!isValidEvaluationRating(candidate.rating, scoreScale)) {
          throw new BadRequestException(
            `Supervisor evaluation criterion ${index} rating must be an integer between ${scoreScale === 'PERCENT_0_100' ? 0 : 1} and ${scoreScale === 'PERCENT_0_100' ? '100 in steps of 10' : 5}`,
          );
        }

        if (candidate.comment !== undefined && typeof candidate.comment !== 'string') {
          throw new BadRequestException(`Supervisor evaluation criterion ${index} comment must be a string`);
        }

        validateEvaluationText(candidate.comment, `criteria[${index}].comment`);
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

  private normalizeTextFields(value: unknown): SupervisorEvaluationContentDto['textFields'] {
    if (value === undefined) return undefined;
    if (!value || typeof value !== 'object') throw new BadRequestException('textFields must be an object');
    const fields = value as Record<string, unknown>;
    for (const key of ['unitCompetencies', 'serverAssignments', 'generalComments']) {
      if (typeof fields[key] !== 'string') throw new BadRequestException(`${key} must be a string`);
      validateEvaluationText(fields[key], key);
    }
    if (!Array.isArray(fields.monthlyObservations)) throw new BadRequestException('monthlyObservations must be an array');
    const monthlyObservations = fields.monthlyObservations.map((value: unknown) => {
      if (!value || typeof value !== 'object') throw new BadRequestException('Observation must be an object');
      const observation = value as Record<string, unknown>;
      for (const key of ['id', 'monthLabel', 'description']) {
        if (typeof observation[key] !== 'string') throw new BadRequestException(`${key} must be a string`);
        validateEvaluationText(observation[key], key);
      }
      return { id: observation.id as string, monthLabel: observation.monthLabel as string, description: observation.description as string };
    });
    return {
      unitCompetencies: fields.unitCompetencies as string,
      serverAssignments: fields.serverAssignments as string,
      generalComments: fields.generalComments as string,
      monthlyObservations,
    };
  }

  private hasAllExpectedCriteria(content: SupervisorEvaluationContentDto): boolean {
    const expectedCodes = Array.from({ length: 5 }, (_, factor) =>
      Array.from({ length: 4 }, (_, item) => `${factor + 1}.${item + 1}`),
    ).flat();
    return expectedCodes.every((code) => content.criteria.some((criterion) => criterion.code === code));
  }

  private toPrismaJsonContent(content: SupervisorEvaluationContentDto): Prisma.InputJsonObject {
    return {
      ...(content.scoreScale ? { scoreScale: content.scoreScale } : {}),
      ...(content.scoringVersion ? { scoringVersion: content.scoringVersion } : {}),
      ...(content.textFields ? { textFields: { ...content.textFields, monthlyObservations: content.textFields.monthlyObservations.map((item) => ({ ...item })) } } : {}),
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
      ...(content.scoreScale ? { scoreScale: content.scoreScale } : {}),
      ...(content.scoringVersion ? { scoringVersion: content.scoringVersion } : {}),
      ...(content.textFields ? { textFields: content.textFields } : {}),
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
    processStageId: string;
    stageSequence: number;
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
        processStageId: params.processStageId,
        stageSequence: params.stageSequence,
        ...(params.comment ? { comment: params.comment } : {}),
      },
    };
  }

  private toResponseDto(evaluation: {
    id: string;
    processId: string;
    processStageId: string;
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
      processStageId: evaluation.processStageId,
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
    return toContractProcessStatusShared(status);
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
    return toDatabaseRole(role);
  }

  private toDatabaseAuditEventType(eventType: AuditEventType): PrismaAuditEventType {
    return toDatabaseAuditEventType(eventType);
  }
}
