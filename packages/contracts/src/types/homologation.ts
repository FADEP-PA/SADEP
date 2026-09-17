import type { ProcessStatus } from '../enums';

export interface HomologationStatusRef {
  processId: string;
  processStatus: ProcessStatus;
  homologatedAt: string | null;
  homologatedByUserId: string | null;
  homologationRemarks: string | null;
  notifiedAt: string | null;
  notifiedByUserId: string | null;
  acknowledgedAt: string | null;
}

export interface ApproveHomologationRequest {
  homologationRemarks?: string;
}

export interface NotifyResultRequest {
  notificationRemarks?: string;
}
