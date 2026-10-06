import {
  EvaluationAttachmentOrigin,
  type ListAttachmentsResponse,
  type RemoveAttachmentResponse,
  type UploadAttachmentResponse,
} from '@sadep/contracts';

import { httpRequest } from '@/shared/api/http-client';

function scopePath(processId: string, stageId: string, origin: EvaluationAttachmentOrigin) {
  return `/processes/${encodeURIComponent(processId)}/stages/${encodeURIComponent(stageId)}/evaluation-attachments/${origin}`;
}

export function listEvaluationAttachments(processId: string, stageId: string, origin: EvaluationAttachmentOrigin, signal?: AbortSignal) {
  return httpRequest<ListAttachmentsResponse>(scopePath(processId, stageId, origin), { useStoredAccessToken: true, signal });
}

export function uploadSupervisorEvaluationAttachment(processId: string, stageId: string, file: File) {
  const body = new FormData();
  body.append('file', file);
  return httpRequest<UploadAttachmentResponse>(scopePath(processId, stageId, EvaluationAttachmentOrigin.SUPERVISOR_EVALUATION), {
    useStoredAccessToken: true, method: 'POST', body,
  });
}

export function removeSupervisorEvaluationAttachment(processId: string, stageId: string, attachmentId: string) {
  return httpRequest<RemoveAttachmentResponse>(`${scopePath(processId, stageId, EvaluationAttachmentOrigin.SUPERVISOR_EVALUATION)}/${encodeURIComponent(attachmentId)}`, {
    useStoredAccessToken: true, method: 'DELETE',
  });
}

export function uploadSelfEvaluationAttachment(processId: string, stageId: string, file: File) {
  const body = new FormData();
  body.append('file', file);
  return httpRequest<UploadAttachmentResponse>(scopePath(processId, stageId, EvaluationAttachmentOrigin.SELF_EVALUATION), {
    useStoredAccessToken: true, method: 'POST', body,
  });
}

export function removeSelfEvaluationAttachment(processId: string, stageId: string, attachmentId: string) {
  return httpRequest<RemoveAttachmentResponse>(`${scopePath(processId, stageId, EvaluationAttachmentOrigin.SELF_EVALUATION)}/${encodeURIComponent(attachmentId)}`, {
    useStoredAccessToken: true, method: 'DELETE',
  });
}

export function downloadEvaluationAttachment(processId: string, stageId: string, origin: EvaluationAttachmentOrigin, attachmentId: string) {
  return httpRequest<Blob>(`${scopePath(processId, stageId, origin)}/${encodeURIComponent(attachmentId)}`, {
    useStoredAccessToken: true, responseType: 'blob',
  });
}
