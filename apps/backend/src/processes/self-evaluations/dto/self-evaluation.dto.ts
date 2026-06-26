import { IsOptional, IsString } from 'class-validator';
import {
  SelfEvaluationStatus,
  type SelfEvaluationDocumentContextRef,
  type SelfEvaluationWithDocumentContextRef,
} from '@sadep/contracts';

export class UpsertSelfEvaluationDto {
  @IsString()
  selfReflection!: string;

  @IsOptional()
  @IsString()
  additionalNotes?: string;

  @IsOptional()
  @IsString()
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
