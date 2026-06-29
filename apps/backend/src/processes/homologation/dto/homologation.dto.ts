import { IsOptional, IsString } from 'class-validator';

export class ApproveHomologationDto {
  @IsOptional()
  @IsString()
  homologationRemarks?: string;
}

export class NotifyResultDto {
  @IsOptional()
  @IsString()
  notificationRemarks?: string;
}

export class ReturnForRegularizationDto {
  @IsOptional()
  @IsString()
  returnRemarks?: string;
}
