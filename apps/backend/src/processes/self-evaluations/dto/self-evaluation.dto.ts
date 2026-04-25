import {
  SelfEvaluationStatus,
  type SelfEvaluationRef,
  type SelfEvaluationDocumentContextRef,
  type SelfEvaluationWithDocumentContextRef,
} from '@aep-pa/contracts';

export interface UpsertSelfEvaluationDto {
  selfReflection: string;
  additionalNotes?: string;
  comment?: string;
}

export interface SignSelfEvaluationDto {
  comment?: string;
}

export type SelfEvaluationDocumentContext = SelfEvaluationDocumentContextRef;
export type SelfEvaluationResponseDto = SelfEvaluationWithDocumentContextRef;

export function isSelfEvaluationStatus(value: string): value is SelfEvaluationStatus {
  return Object.values(SelfEvaluationStatus).includes(value as SelfEvaluationStatus);
}
