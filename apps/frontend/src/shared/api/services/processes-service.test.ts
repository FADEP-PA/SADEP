import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearAccessToken, setAccessToken } from '@/shared/auth/access-token-store';
import { ProcessAction } from '@sadep/contracts';
import {
  getInternWorkspaceSnapshot,
  getWorkflow,
  getWorkflowHistory,
  transitionWorkflow,
} from './processes-service';

const API_BASE = 'http://localhost:3000';
const PROCESS_ID = 'proc-abc';
const TOKEN = 'test-token';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
  } as unknown as Response;
}

describe('processes-service', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('location', { assign: vi.fn(), pathname: '/inicio' });
    setAccessToken(TOKEN);
  });

  afterEach(() => {
    clearAccessToken();
    vi.unstubAllGlobals();
  });

  describe('getWorkflow', () => {
    it('faz GET /processes/:id/workflow com Authorization Bearer', async () => {
      const payload = { id: PROCESS_ID, status: 'EM_AVALIACAO', currentStage: 1 };
      fetchMock.mockResolvedValueOnce(jsonResponse(200, payload));

      const result = await getWorkflow(PROCESS_ID);

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${API_BASE}/processes/${PROCESS_ID}/workflow`);
      expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
      expect(result).toMatchObject({ id: PROCESS_ID });
    });
  });

  describe('getWorkflowHistory', () => {
    it('faz GET /processes/:id/history e retorna { items, meta.total }', async () => {
      const items = [{ id: 'h1', action: 'SEND_TO_CESAD', createdAt: '2024-01-01' }];
      fetchMock.mockResolvedValueOnce(jsonResponse(200, items));

      const result = await getWorkflowHistory(PROCESS_ID);

      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toBe(`${API_BASE}/processes/${PROCESS_ID}/history`);
      expect(result.items).toEqual(items);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('getInternWorkspaceSnapshot', () => {
    it('faz GET /processes/:id/intern-workspace com Authorization Bearer', async () => {
      const payload = { processId: PROCESS_ID, canSubmitSelfEvaluation: true };
      fetchMock.mockResolvedValueOnce(jsonResponse(200, payload));

      const result = await getInternWorkspaceSnapshot(PROCESS_ID);

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${API_BASE}/processes/${PROCESS_ID}/intern-workspace`);
      expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
      expect(result).toMatchObject({ processId: PROCESS_ID });
    });
  });

  describe('transitionWorkflow', () => {
    it('faz POST /processes/:id/workflow/transition com action e comment serializados', async () => {
      const payload = { id: PROCESS_ID, status: 'EM_AVALIACAO_CESAD' };
      fetchMock.mockResolvedValueOnce(jsonResponse(200, payload));

      const result = await transitionWorkflow(PROCESS_ID, {
        action: ProcessAction.SEND_TO_CESAD,
        comment: 'Encaminhado',
      });

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${API_BASE}/processes/${PROCESS_ID}/workflow/transition`);
      expect(init.method).toBe('POST');
      expect(init.body).toBe(
        JSON.stringify({ action: ProcessAction.SEND_TO_CESAD, comment: 'Encaminhado' }),
      );
      expect(result).toMatchObject({ status: 'EM_AVALIACAO_CESAD' });
    });
  });
});
