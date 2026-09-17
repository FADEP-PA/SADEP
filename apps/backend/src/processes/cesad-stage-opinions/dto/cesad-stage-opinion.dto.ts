import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import {
  CesadStageOpinionStatus,
  type CesadStageOpinionRef,
} from '@sadep/contracts';

export class UpsertCesadStageOpinionDto {
  @IsString()
  @IsNotEmpty()
  reportText!: string;

  @IsOptional()
  @IsString()
  legalBasis?: string;

  @IsString()
  @IsNotEmpty()
  conclusion!: string;

  @IsOptional()
  @IsString()
  stageConcept?: string;

  @IsOptional()
  @IsString()
  stageResult?: string;

  @IsOptional()
  @IsString()
  comment?: string;
}

export interface CesadStageOpinionResponseDto extends CesadStageOpinionRef {}

export function isCesadStageOpinionStatus(value: string): value is CesadStageOpinionStatus {
  return Object.values(CesadStageOpinionStatus).includes(value as CesadStageOpinionStatus);
}
