import { IsOptional, IsString, MaxLength } from 'class-validator';
import {
  EVALUATION_TEXT_MAX_LENGTH,
  EVALUATION_TEXT_LIMIT_MESSAGE,
  SelfEvaluationStatus,
  type SelfEvaluationDocumentContextRef,
  type SelfEvaluationWithDocumentContextRef,
} from '@sadep/contracts';

export class UpsertSelfEvaluationDto {
  @IsString()
  @MaxLength(EVALUATION_TEXT_MAX_LENGTH, { message: EVALUATION_TEXT_LIMIT_MESSAGE })
  selfReflection!: string;

  @IsOptional()
  @IsString()
  @MaxLength(EVALUATION_TEXT_MAX_LENGTH, { message: EVALUATION_TEXT_LIMIT_MESSAGE })
  additionalNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(EVALUATION_TEXT_MAX_LENGTH, { message: EVALUATION_TEXT_LIMIT_MESSAGE })
  comment?: string;
}

export class SignSelfEvaluationDto {
  @IsOptional()
  @IsString()
  comment?: string;
}

export type SelfEvaluationDocumentContext = SelfEvaluationDocumentContextRef;
export type SelfEvaluationResponseDto = SelfEvaluationWithDocumentContextRef;

export function isSelfEvaluationStatus(value: string): value is SelfEvaluationStatus {
  return Object.values(SelfEvaluationStatus).includes(value as SelfEvaluationStatus);
}
