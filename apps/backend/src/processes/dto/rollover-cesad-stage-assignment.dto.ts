import { IsDate, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class RolloverCesadStageAssignmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason!: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  referenceDate?: Date;
}
