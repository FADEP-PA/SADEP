import type { EvaluationAttachmentOrigin } from '../enums/evaluation-attachment-origin';

export interface EvaluationAttachmentRef {
  id: string;
  evaluationProcessId: string;
  processStageId: string;
  origin: EvaluationAttachmentOrigin;
  uploaderUserId: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
}

export interface UploadAttachmentResponse {
  attachment: EvaluationAttachmentRef;
}

export interface ListAttachmentsResponse {
  attachments: EvaluationAttachmentRef[];
}

export interface DownloadAttachmentInfo {
  filename: string;
  mimeType: string;
}

export interface RemoveAttachmentResponse {
  attachmentId: string;
  removed: boolean;
}
