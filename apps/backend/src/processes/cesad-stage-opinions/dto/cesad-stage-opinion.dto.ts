import {
  CesadStageOpinionStatus,
  type CesadStageOpinionInput,
  type CesadStageOpinionRef,
} from '@sadep/contracts';

export interface UpsertCesadStageOpinionDto extends CesadStageOpinionInput {
  comment?: string;
}

export interface CesadStageOpinionResponseDto extends CesadStageOpinionRef {}

export function isCesadStageOpinionStatus(value: string): value is CesadStageOpinionStatus {
  return Object.values(CesadStageOpinionStatus).includes(value as CesadStageOpinionStatus);
}
