import type {
  DocumentStatus,
  DocumentType,
  SignatureStatus,
} from '../enums';

export interface CesadStageOpinionSignatureDocumentRef {
  documentId: string;
  documentType: DocumentType;
  documentStatus: DocumentStatus;
  hasArtifact: boolean;
  artifactPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CesadStageOpinionExpectedSignerSignatureRef {
  expectedSignerId: string;
  actingUserId: string;
  actingCommissionMemberId: string;
  nameSnapshot: string;
  emailSnapshot: string;
  sortOrder: number;
  frozenAt: string;
  signatureId: string | null;
  signatureStatus: SignatureStatus | null;
  signedAt: string | null;
}

export interface CesadStageOpinionSignatureStatusRef {
  processId: string;
  processStageId: string;
  stageSequence: number;
  stageCode: string;
  document: CesadStageOpinionSignatureDocumentRef | null;
  expectedSigners: CesadStageOpinionExpectedSignerSignatureRef[];
  allExpectedSignersSigned: boolean;
}
