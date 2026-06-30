import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { CesadCommissionActType, CesadCommissionMemberRoleType } from '@sadep/contracts';

class CreateCommissionDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsDateString()
  effectiveStartDate!: string;

  @IsDateString()
  @IsOptional()
  effectiveEndDate?: string | null;
}

class CreateCommissionActDto {
  @IsEnum(CesadCommissionActType)
  actType!: CesadCommissionActType;

  @IsString()
  @IsNotEmpty()
  number!: string;

  @IsInt()
  @Min(1900)
  @Max(2100)
  year!: number;

  @IsDateString()
  @IsOptional()
  signedAt?: string | null;

  @IsDateString()
  @IsOptional()
  publishedAt?: string | null;

  @IsDateString()
  @IsOptional()
  validityStartDate?: string | null;

  @IsDateString()
  @IsOptional()
  validityEndDate?: string | null;

  @IsString()
  @IsOptional()
  summary?: string | null;

  @IsString()
  @IsOptional()
  referenceText?: string | null;
}

class CreateCommissionMemberDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsEnum(CesadCommissionMemberRoleType)
  roleType!: CesadCommissionMemberRoleType;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  @IsOptional()
  endDate?: string | null;
}

export class CreateCesadCommissionDto {
  @ValidateNested()
  @Type(() => CreateCommissionDto)
  commission!: CreateCommissionDto;

  @ValidateNested()
  @Type(() => CreateCommissionActDto)
  act!: CreateCommissionActDto;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateCommissionMemberDto)
  members!: CreateCommissionMemberDto[];
}
