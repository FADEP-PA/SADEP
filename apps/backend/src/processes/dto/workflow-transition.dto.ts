import { ProcessAction } from '@sadep/contracts';

export type WorkflowTransitionRequestDto = {
  action: ProcessAction;
  comment?: string;
};

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
