import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import type {
  CesadFinalOpinionEligibilityRef,
  CesadFinalOpinionRef,
  CesadFinalOpinionSendToHomologationRef,
} from '@sadep/contracts';

export class UpsertCesadFinalOpinionDto {
  @IsString()
  @IsNotEmpty()
  reportText!: string;

  @IsOptional()
  @IsString()
  legalBasis?: string;

  @IsString()
  @IsNotEmpty()
  finalConclusion!: string;

  @IsOptional()
  @IsString()
  finalResult?: string;

  @IsOptional()
  @IsString()
  finalConcept?: string;

  @IsOptional()
  @IsString()
  recommendation?: string;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class SendCesadFinalOpinionToHomologationDto {
  @IsOptional()
  @IsString()
  comment?: string;
}

export class StartCesadFinalOpinionDto {
  @IsOptional()
  @IsString()
  comment?: string;
}

export interface CesadFinalOpinionResponseDto extends CesadFinalOpinionRef {}

export interface CesadFinalOpinionEligibilityResponseDto extends CesadFinalOpinionEligibilityRef {}

export interface SendCesadFinalOpinionToHomologationResponseDto
  extends CesadFinalOpinionSendToHomologationRef {}
