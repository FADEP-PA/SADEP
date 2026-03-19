import type { DocumentStatus, DocumentType } from '../enums';

export interface DocumentRef {
  documentId: string;
  documentType: DocumentType;
  status?: DocumentStatus;
}
