import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SupersedeCesadCommissionDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsOptional()
  @IsDateString()
  effectiveEndDate?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  successorCommissionId?: string;
}
