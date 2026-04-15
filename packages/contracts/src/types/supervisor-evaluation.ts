import type {
  DocumentStatus,
  DocumentType,
  SignatureStatus,
  SupervisorEvaluationStatus,
  UserRole,
} from '../enums';

export interface SupervisorEvaluationCriterionInput {
  code: string;
  label: string;
  rating: number;
  comment?: string;
}

export interface SupervisorEvaluationContentInput {
  criteria: SupervisorEvaluationCriterionInput[];
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
}

export interface SupervisorEvaluationDocumentContextRef {
  documentId: string;
  documentType: DocumentType;
  documentStatus: DocumentStatus;
  signatures: SupervisorEvaluationDocumentSignatureRef[];
  internSignaturePending: boolean;
}

export interface SupervisorEvaluationWithDocumentContextRef extends SupervisorEvaluationRef {
  documentContext?: SupervisorEvaluationDocumentContextRef;
}
