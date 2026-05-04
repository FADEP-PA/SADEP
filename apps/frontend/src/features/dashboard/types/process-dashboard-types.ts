import type {
  ProcessAction,
  ProcessStatus,
  SupervisorEvaluationWithDocumentContextRef,
  UserRole,
  AuditEventType,
} from '@sadep/contracts';

export type WorkflowResponse = {
  id: string;
  status: ProcessStatus;
  availableActions: ProcessAction[];
};

export type WorkflowHistoryItem = {
  id: string;
  action: ProcessAction;
  eventType: AuditEventType | string;
  actorUserId: string | null;
  actorRole: UserRole | string | null;
  beforeState: unknown;
  afterState: unknown;
  comment: string | null;
  occurredAt: string;
};


export type ProcessDashboardListItem = {
  id: string;
  status: ProcessStatus;
  currentStage: ProcessStatus;
  primaryAction: ProcessAction | null;
  availableActionsCount: number;
  historyCount: number;
  lastViewedAt: string;
};

export type ProcessDashboardSnapshot = {
  workflow: WorkflowResponse;
  history: WorkflowHistoryItem[];
  supervisorEvaluation: SupervisorEvaluationWithDocumentContextRef | null;
  supervisorEvaluationWarning?: string | null;
};
