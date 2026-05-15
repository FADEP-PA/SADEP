import type {
  CesadOpinionKind,
  DocumentStatus,
  DocumentType,
  SignatureStatus,
} from '../enums';

export interface CesadFinalOpinionSignatureDocumentRef {
  documentId: string;
  documentType: DocumentType;
  opinionKind: CesadOpinionKind;
  documentStatus: DocumentStatus;
  hasArtifact: boolean;
  artifactPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CesadFinalOpinionExpectedSignerSignatureRef {
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

export interface CesadFinalOpinionSignatureStatusRef {
  processId: string;
  cesadFinalOpinionId: string;
  commissionId: string | null;
  document: CesadFinalOpinionSignatureDocumentRef | null;
  expectedSigners: CesadFinalOpinionExpectedSignerSignatureRef[];
  allExpectedSignersSigned: boolean;
}
