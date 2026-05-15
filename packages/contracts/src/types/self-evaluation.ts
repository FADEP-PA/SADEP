import type {
  DocumentStatus,
  DocumentType,
  SelfEvaluationStatus,
  SignatureStatus,
  UserRole,
} from '../enums';

export interface SelfEvaluationRef {
  id: string;
  processId: string;
  processStageId: string;
  authorUserId: string;
  status: SelfEvaluationStatus;
  selfReflection: string;
  additionalNotes: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SelfEvaluationDocumentSignatureRef {
  signatoryRole: UserRole;
  status: SignatureStatus;
  signedAt: string | null;
}

export interface SelfEvaluationDocumentContextRef {
  documentId: string;
  documentType: DocumentType;
  documentStatus: DocumentStatus;
  hasArtifact: boolean;
  artifactPath: string | null;
  signatures: SelfEvaluationDocumentSignatureRef[];
  supervisorSignaturePending: boolean;
}

export interface SelfEvaluationWithDocumentContextRef extends SelfEvaluationRef {
  documentContext?: SelfEvaluationDocumentContextRef;
}
