import type { ProcessStatus } from '../enums';

export interface ProcessRef {
  processId: string;
  status?: ProcessStatus;
}
