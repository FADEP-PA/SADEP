import type {
  CesadFinalOpinionEligibilityRef,
  CesadFinalOpinionInput,
  CesadFinalOpinionRef,
  CesadFinalOpinionSendToHomologationRef,
} from '@sadep/contracts';

export interface UpsertCesadFinalOpinionDto extends CesadFinalOpinionInput {
  comment?: string;
}

export interface CesadFinalOpinionResponseDto extends CesadFinalOpinionRef {}

export interface CesadFinalOpinionEligibilityResponseDto extends CesadFinalOpinionEligibilityRef {}

export interface SendCesadFinalOpinionToHomologationDto {
  comment?: string;
}

export interface SendCesadFinalOpinionToHomologationResponseDto
  extends CesadFinalOpinionSendToHomologationRef {}
