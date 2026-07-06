import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CloseCesadCommissionDto {
  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsDateString()
  effectiveEndDate?: string;
}
