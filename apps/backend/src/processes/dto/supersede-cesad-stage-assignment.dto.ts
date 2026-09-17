import { IsDate, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class SupersedeCesadStageAssignmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  newCommissionId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason!: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  referenceDate?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  formalActReference?: string;
}
