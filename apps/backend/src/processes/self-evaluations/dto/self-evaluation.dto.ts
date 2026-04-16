import {
  DocumentStatus,
  DocumentType,
  SelfEvaluationStatus,
  SignatureStatus,
  UserRole,
  type SelfEvaluationRef,
} from '@aep-pa/contracts';

export interface UpsertSelfEvaluationDto {
  selfReflection: string;
  additionalNotes?: string;
  comment?: string;
}

export interface SignSelfEvaluationDto {
  comment?: string;
}

export interface SelfEvaluationDocumentContext {
  documentId: string;
  documentType: DocumentType;
  documentStatus: DocumentStatus;
  hasArtifact: boolean;
  artifactPath: string | null;
  signatures: Array<{
    signatoryRole: UserRole;
    status: SignatureStatus;
    signedAt: string | null;
  }>;
  supervisorSignaturePending: boolean;
}

export interface SelfEvaluationResponseDto extends SelfEvaluationRef {
  documentContext?: SelfEvaluationDocumentContext;
}

export function isSelfEvaluationStatus(value: string): value is SelfEvaluationStatus {
  return Object.values(SelfEvaluationStatus).includes(value as SelfEvaluationStatus);
}
