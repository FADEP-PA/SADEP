import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ProcessAction } from '@sadep/contracts';

export class WorkflowTransitionRequestDto {
  @IsEnum(ProcessAction)
  action!: ProcessAction;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

export type WorkflowResponseDto = {
  id: string;
  status: string;
  availableActions: ProcessAction[];
};

export type WorkflowHistoryItemDto = {
  id: string;
  action: ProcessAction;
  eventType: string;
  actorUserId: string | null;
  actorRole: string | null;
  beforeState: unknown;
  afterState: unknown;
  comment: string | null;
  occurredAt: string;
};
