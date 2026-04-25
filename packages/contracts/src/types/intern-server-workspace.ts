import type { ProcessStatus } from '../enums';
import type { CesadStageOpinionRef } from './cesad-stage-opinion';
import type {
  SelfEvaluationWithDocumentContextRef,
} from './self-evaluation';
import type {
  SupervisorEvaluationWithDocumentContextRef,
} from './supervisor-evaluation';

export interface InternServerWorkspaceStageRef {
  stageId: string;
  sequence: number;
  stageCode: string;
  startedAt: string | null;
  endedAt: string | null;
  totalStages: number;
}

export interface InternServerWorkspaceCapabilitiesRef {
  canViewSupervisorEvaluation: boolean;
  canSignSupervisorEvaluation: boolean;
  canViewSelfEvaluation: boolean;
  canEditSelfEvaluation: boolean;
  canSubmitSelfEvaluation: boolean;
}

export interface InternServerCesadOpinionAccessRef {
  canView: boolean;
  blockedReason: string | null;
  requiresFormalNotification: boolean;
  opinion: CesadStageOpinionRef | null;
}

export interface InternServerWorkspaceSnapshotRef {
  process: {
    id: string;
    status: ProcessStatus;
  };
  currentStage: InternServerWorkspaceStageRef;
  supervisorEvaluation: SupervisorEvaluationWithDocumentContextRef | null;
  selfEvaluation: SelfEvaluationWithDocumentContextRef | null;
  capabilities: InternServerWorkspaceCapabilitiesRef;
  cesadOpinionAccess: InternServerCesadOpinionAccessRef;
}
