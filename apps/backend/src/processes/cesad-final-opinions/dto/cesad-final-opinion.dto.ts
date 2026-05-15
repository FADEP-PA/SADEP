import type {
  CesadFinalOpinionEligibilityRef,
  CesadFinalOpinionInput,
  CesadFinalOpinionRef,
} from '@sadep/contracts';

export interface UpsertCesadFinalOpinionDto extends CesadFinalOpinionInput {
  comment?: string;
}

export interface CesadFinalOpinionResponseDto extends CesadFinalOpinionRef {}

export interface CesadFinalOpinionEligibilityResponseDto extends CesadFinalOpinionEligibilityRef {}
