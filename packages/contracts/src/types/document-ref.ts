import type { CesadOpinionKind, DocumentStatus, DocumentType } from '../enums';

export interface DocumentRef {
  documentId: string;
  documentType: DocumentType;
  status?: DocumentStatus;
  opinionKind?: CesadOpinionKind | null;
}
