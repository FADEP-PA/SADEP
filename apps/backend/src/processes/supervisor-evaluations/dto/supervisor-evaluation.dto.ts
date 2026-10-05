import { IsArray, IsInt, IsIn, IsNotEmpty, IsOptional, IsString, Max, Min, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import {
  EVALUATION_TEXT_MAX_LENGTH,
  EVALUATION_TEXT_LIMIT_MESSAGE,
  PERCENT_EVALUATION_SCORING_VERSION,
  LEGACY_EVALUATION_SCORING_VERSION,
  type EvaluationScoringVersion,
  type EvaluationScoreScale,
  type SupervisorEvaluationTextFields,
  SupervisorEvaluationStatus,
  type SupervisorEvaluationRef,
  ProcessStatus,
  DocumentType,
  DocumentStatus,
  SignatureStatus,
  UserRole,
} from '@sadep/contracts';

export class SupervisorEvaluationCriterionDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsInt()
  @Min(0)
  @Max(100)
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(EVALUATION_TEXT_MAX_LENGTH, { message: EVALUATION_TEXT_LIMIT_MESSAGE })
  comment?: string;
}

export class SupervisorEvaluationObservationDto {
  @IsString()
  @MaxLength(EVALUATION_TEXT_MAX_LENGTH, { message: EVALUATION_TEXT_LIMIT_MESSAGE })
  id!: string;
  @IsString()
  @MaxLength(EVALUATION_TEXT_MAX_LENGTH, { message: EVALUATION_TEXT_LIMIT_MESSAGE })
  monthLabel!: string;
  @IsString()
  @MaxLength(EVALUATION_TEXT_MAX_LENGTH, { message: EVALUATION_TEXT_LIMIT_MESSAGE })
  description!: string;
}

export class SupervisorEvaluationTextFieldsDto implements SupervisorEvaluationTextFields {
  @IsString()
  @MaxLength(EVALUATION_TEXT_MAX_LENGTH, { message: EVALUATION_TEXT_LIMIT_MESSAGE })
  unitCompetencies!: string;
  @IsString()
  @MaxLength(EVALUATION_TEXT_MAX_LENGTH, { message: EVALUATION_TEXT_LIMIT_MESSAGE })
  serverAssignments!: string;
  @IsString()
  @MaxLength(EVALUATION_TEXT_MAX_LENGTH, { message: EVALUATION_TEXT_LIMIT_MESSAGE })
  generalComments!: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupervisorEvaluationObservationDto)
  monthlyObservations!: SupervisorEvaluationObservationDto[];
}

export class SupervisorEvaluationContentDto {
  @IsOptional()
  @IsIn(['LEGACY_1_5', 'PERCENT_0_100'])
  scoreScale?: EvaluationScoreScale;

  @IsOptional()
  @IsIn([LEGACY_EVALUATION_SCORING_VERSION, PERCENT_EVALUATION_SCORING_VERSION])
  scoringVersion?: EvaluationScoringVersion;

  @IsOptional()
  @ValidateNested()
  @Type(() => SupervisorEvaluationTextFieldsDto)
  textFields?: SupervisorEvaluationTextFieldsDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupervisorEvaluationCriterionDto)
  criteria!: SupervisorEvaluationCriterionDto[];
}

export class UpsertSupervisorEvaluationDto {
  @IsString()
  @IsNotEmpty()
  summary!: string;

  @IsString()
  @IsNotEmpty()
  generalComments!: string;

  @ValidateNested()
  @Type(() => SupervisorEvaluationContentDto)
  content!: SupervisorEvaluationContentDto;

  @IsOptional()
  @IsString()
  @MaxLength(EVALUATION_TEXT_MAX_LENGTH, { message: EVALUATION_TEXT_LIMIT_MESSAGE })
  comment?: string;
}

export interface SupervisorEvaluationDocumentContext {
  documentId: string;
  documentType: DocumentType;
  documentStatus: DocumentStatus;
  hasArtifact: boolean;
  artifactPath: string | null;
  signatures: Array<{
    signatoryRole: UserRole;
    status: SignatureStatus;
    signedAt: string | null;
  }>;
  internSignaturePending: boolean;
}

export interface SupervisorEvaluationResponseDto extends SupervisorEvaluationRef {
  documentContext?: SupervisorEvaluationDocumentContext;
}

export interface SupervisorEvaluationWorkspaceSnapshotDto {
  process: {
    id: string;
    status: ProcessStatus;
  };
  supervisorEvaluation: SupervisorEvaluationResponseDto | null;
  documentContext: SupervisorEvaluationDocumentContext | null;
  canEditDraft: boolean;
  canSubmit: boolean;
  canRectify: boolean;
}

export function isSupervisorEvaluationStatus(value: string): value is SupervisorEvaluationStatus {
  return Object.values(SupervisorEvaluationStatus).includes(value as SupervisorEvaluationStatus);
}

export function isSupervisorEvaluationCriterionDto(
  value: unknown,
  scale: EvaluationScoreScale = 'LEGACY_1_5',
): value is SupervisorEvaluationCriterionDto {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<SupervisorEvaluationCriterionDto>;
  return (
    typeof candidate.code === 'string' &&
    candidate.code.trim().length > 0 &&
    typeof candidate.label === 'string' &&
    candidate.label.trim().length > 0 &&
    typeof candidate.rating === 'number' &&
    Number.isFinite(candidate.rating) &&
    Number.isInteger(candidate.rating) &&
    candidate.rating >= (scale === 'PERCENT_0_100' ? 0 : 1) &&
    candidate.rating <= (scale === 'PERCENT_0_100' ? 100 : 5) &&
    (candidate.comment === undefined || typeof candidate.comment === 'string')
  );
}

export function isSupervisorEvaluationContentDto(
  value: unknown,
): value is SupervisorEvaluationContentDto {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<SupervisorEvaluationContentDto>;
  const scale = candidate.scoreScale ?? 'LEGACY_1_5';
  const version = candidate.scoringVersion ?? LEGACY_EVALUATION_SCORING_VERSION;
  if (
    (scale === 'PERCENT_0_100' && version !== PERCENT_EVALUATION_SCORING_VERSION) ||
    (scale === 'LEGACY_1_5' && version !== LEGACY_EVALUATION_SCORING_VERSION)
  ) return false;
  return Array.isArray(candidate.criteria) && candidate.criteria.every((criterion) => isSupervisorEvaluationCriterionDto(criterion, scale));
}
