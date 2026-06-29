import type { ProcessStatus } from '../enums';

export interface ProcessListItemRef {
  id: string;
  status: ProcessStatus;
  evaluatedUserName: string;
  evaluatedUserEmail: string;
  currentStageSequence: number;
  responsibleSupervisorName: string | null;
  createdAt: string;
}

export interface ProcessListRef {
  items: ProcessListItemRef[];
  total: number;
}
