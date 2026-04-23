import type {
  AuditEventType,
  DocumentStatus,
  DocumentType,
  ProcessAction,
  ProcessStatus,
  SignatureProvider,
  SignatureStatus,
  UserRole,
} from '../enums';
import type { SelfEvaluationRef } from './self-evaluation';
import type { SupervisorEvaluationRef } from './supervisor-evaluation';
import type { CesadStageOpinionRef } from './cesad-stage-opinion';

export interface CesadStageProcessRef {
  id: string;
  status: ProcessStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CesadStageServerRef {
  userId: string;
  email: string;
  role: UserRole;
  displayName: string | null;
  positionName: string | null;
  registrationNumber: string | null;
}

export interface CesadStageRef {
  stageId: string;
  sequence: number;
  stageCode: string;
  startedAt: string | null;
  endedAt: string | null;
  totalStages: number;
}

export interface CesadStageDocumentSignatureRef {
  signatureId: string;
  signatoryUserId: string;
  signatoryRole: UserRole;
  provider: SignatureProvider;
  status: SignatureStatus;
  signedAt: string | null;
}

export interface CesadStageDocumentRef {
  documentType: DocumentType;
  exists: boolean;
  documentId: string | null;
  documentStatus: DocumentStatus | null;
  hasArtifact: boolean;
  artifactPath: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  stageLinkMode: 'STAGE_BOUND' | 'PROCESS_SINGLE_STAGE_FALLBACK' | 'MISSING';
  signatures: CesadStageDocumentSignatureRef[];
  missingReason: string | null;
}

export interface CesadStageDocumentationStatusRef {
  requiredDocumentTypes: DocumentType[];
  allRequiredDocumentsPresent: boolean;
  allRequiredDocumentsSigned: boolean;
  missingRequiredDocumentTypes: DocumentType[];
  pendingSignatureDocumentTypes: DocumentType[];
  stageInstructionStatus: 'COMPLETE' | 'PRESENT_WITH_PENDING_SIGNATURES' | 'MISSING_REQUIRED_DOCUMENTS';
}

export interface CesadStageHistoryItemRef {
  id: string;
  eventType: AuditEventType;
  action: ProcessAction | null;
  actorUserId: string | null;
  actorRole: UserRole | null;
  comment: string | null;
  occurredAt: string;
}

export interface CesadStageReadSnapshotRef {
  readOnly: true;
  process: CesadStageProcessRef;
  server: CesadStageServerRef;
  stage: CesadStageRef;
  documentationStatus: CesadStageDocumentationStatusRef;
  supervisorEvaluation: SupervisorEvaluationRef | null;
  selfEvaluation: SelfEvaluationRef | null;
  cesadStageOpinion: CesadStageOpinionRef | null;
  documents: CesadStageDocumentRef[];
  history: CesadStageHistoryItemRef[];
  warnings: string[];
}
