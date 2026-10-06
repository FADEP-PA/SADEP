import type {
  AcknowledgementMode,
  DocumentStatus,
  DocumentType,
  SignatureStatus,
  SupervisorEvaluationStatus,
  UserRole,
} from '../enums';
import type { EvaluationScoringVersion, EvaluationScoreScale } from '../evaluation-score';

export interface SupervisorEvaluationCriterionInput {
  code: string;
  label: string;
  rating: number;
  comment?: string;
}

export interface SupervisorEvaluationContentInput {
  criteria: SupervisorEvaluationCriterionInput[];
  /** New evaluations must declare the 0–100 scoring model explicitly. */
  scoreScale?: EvaluationScoreScale;
  scoringVersion?: EvaluationScoringVersion;
  /** Structured user fields; summary remains a derived compatibility projection. */
  textFields?: SupervisorEvaluationTextFields;
}

export interface SupervisorEvaluationTextFields {
  unitCompetencies: string;
  serverAssignments: string;
  generalComments: string;
  monthlyObservations: Array<{ id: string; monthLabel: string; description: string }>;
}

export interface SupervisorEvaluationRef {
  id: string;
  processId: string;
  processStageId: string;
  evaluatorUserId: string;
  status: SupervisorEvaluationStatus;
  summary: string;
  generalComments: string;
  content: SupervisorEvaluationContentInput;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupervisorEvaluationDocumentSignatureRef {
  signatoryRole: UserRole;
  status: SignatureStatus;
  signedAt: string | null;
  acknowledgementMode: AcknowledgementMode | null;
}

export interface SupervisorEvaluationDocumentContextRef {
  documentId: string;
  documentType: DocumentType;
  documentStatus: DocumentStatus;
  hasArtifact: boolean;
  artifactPath: string | null;
  signatures: SupervisorEvaluationDocumentSignatureRef[];
  internSignaturePending: boolean;
}

export interface SupervisorEvaluationWithDocumentContextRef extends SupervisorEvaluationRef {
  documentContext?: SupervisorEvaluationDocumentContextRef;
}
