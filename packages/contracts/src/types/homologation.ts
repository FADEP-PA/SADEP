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
  notificationDocument?: {
    documentId: string;
    hasArtifact: boolean;
    viewedAt: string | null;
    canAcknowledge: boolean;
  } | null;
}

export interface ApproveHomologationRequest {
  homologationRemarks?: string;
}

export interface ReturnForRegularizationRequest {
  returnRemarks?: string;
}

export interface NotifyResultRequest {
  notificationRemarks?: string;
}

export interface HomologationQueueItemRef {
  id: string;
  status: ProcessStatus;
  evaluatedUserName: string;
  evaluatedUserEmail: string;
  currentStageSequence: number;
  createdAt: string;
  sentToHomologationAt: string;
}

export interface HomologationQueueRef {
  items: HomologationQueueItemRef[];
  total: number;
}
