import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import {
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
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class SupervisorEvaluationContentDto {
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
    candidate.rating >= 1 &&
    candidate.rating <= 5 &&
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
  return Array.isArray(candidate.criteria) && candidate.criteria.every(isSupervisorEvaluationCriterionDto);
}
