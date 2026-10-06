import { EvaluationAttachmentOrigin } from '@sadep/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearAccessToken, setAccessToken } from '@/shared/auth/access-token-store';
import { HttpError } from '@/shared/api/http-error';
import { downloadEvaluationAttachment, listEvaluationAttachments, removeSupervisorEvaluationAttachment, uploadSupervisorEvaluationAttachment } from './evaluation-attachments-service';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const PATH = `${API_BASE}/processes/process/stages/stage/evaluation-attachments`;
const fetchMock = vi.fn();
function jsonResponse(status: number, body: unknown) {
  return { ok: status < 400, status, headers: new Headers({ 'content-type': 'application/json' }), json: async () => body };
}

describe('evaluation attachments API', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    setAccessToken('token');
  });
  afterEach(() => { clearAccessToken(); vi.unstubAllGlobals(); });

  it('envia arquivo multipart autenticado, sem serialização JSON ou Content-Type fixo', async () => {
    const response = { attachment: { id: 'persisted-id', originalFilename: 'evidence.pdf' } };
    fetchMock.mockResolvedValueOnce(jsonResponse(201, response));
    const file = new File(['%PDF-test'], 'evidence.pdf', { type: 'application/pdf' });
    expect(await uploadSupervisorEvaluationAttachment('process', 'stage', file)).toEqual(response);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${PATH}/SUPERVISOR_EVALUATION`);
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer token');
    expect(init.headers['Content-Type']).toBeUndefined();
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.body.get('file')).toBe(file);
  });

  it.each([EvaluationAttachmentOrigin.SUPERVISOR_EVALUATION, EvaluationAttachmentOrigin.SELF_EVALUATION])('lista e baixa %s pelo endpoint autorizado', async (origin) => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { attachments: [] }));
    expect(await listEvaluationAttachments('process', 'stage', origin)).toEqual({ attachments: [] });
    const blob = new Blob(['%PDF'], { type: 'application/pdf' });
    fetchMock.mockResolvedValueOnce({ ok: true, blob: async () => blob });
    expect(await downloadEvaluationAttachment('process', 'stage', origin, 'attachment')).toBe(blob);
    expect(fetchMock).toHaveBeenNthCalledWith(2, `${PATH}/${origin}/attachment`, expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token' }), cache: 'no-store' }));
  });

  it('remove somente na origem da Chefia', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { attachmentId: 'attachment', removed: true }));
    expect(await removeSupervisorEvaluationAttachment('process', 'stage', 'attachment')).toEqual({ attachmentId: 'attachment', removed: true });
    expect(fetchMock).toHaveBeenCalledWith(`${PATH}/SUPERVISOR_EVALUATION/attachment`, expect.objectContaining({ method: 'DELETE' }));
  });

  it('mantém FormData ao renovar sessão e tentar novamente', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { message: 'Expired' }))
      .mockResolvedValueOnce(jsonResponse(200, { accessToken: 'renewed-token' }))
      .mockResolvedValueOnce(jsonResponse(201, { attachment: { id: 'persisted' } }));
    const file = new File(['%PDF'], 'evidence.pdf', { type: 'application/pdf' });
    await uploadSupervisorEvaluationAttachment('process', 'stage', file);
    const [, init] = fetchMock.mock.calls[2];
    expect(init.headers.Authorization).toBe('Bearer renewed-token');
    expect(init.body.get('file')).toBe(file);
    expect(init.headers['Content-Type']).toBeUndefined();
  });

  it('propaga autorização negada', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(403, { message: 'Not authorized' }));
    await expect(listEvaluationAttachments('process', 'stage', EvaluationAttachmentOrigin.SELF_EVALUATION)).rejects.toBeInstanceOf(HttpError);
  });
});
