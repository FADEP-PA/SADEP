import type { AcknowledgementMode, DocumentType } from '../enums';

export interface EvaluationAcknowledgementRef {
  processId: string;
  processStageId: string;
  documentId: string;
  documentType: DocumentType;
  actorUserId: string;
  modality: AcknowledgementMode | null;
  acknowledgedAt: string;
}
