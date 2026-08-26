import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearAccessToken, setAccessToken } from '@/shared/auth/access-token-store';
import { ProcessAction } from '@sadep/contracts';
import {
  completeCesadStageOpinion,
  getCesadStageOpinion,
  getCesadStageOpinionSignatureStatus,
  getInternWorkspaceSnapshot,
  getProcessList,
  getWorkflow,
  getWorkflowHistory,
  prepareCesadStageOpinionSignatures,
  saveCesadStageOpinionDraft,
  signCesadStageOpinion,
  transitionWorkflow,
} from './processes-service';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
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

  describe('getProcessList', () => {
    it('faz GET /processes com Authorization Bearer e retorna items e total', async () => {
      const payload = {
        items: [{ id: PROCESS_ID, status: 'EM_AVALIACAO', evaluatedUserName: 'Joao' }],
        total: 1,
      };
      fetchMock.mockResolvedValueOnce(jsonResponse(200, payload));

      const result = await getProcessList();

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${API_BASE}/processes`);
      expect(init.method).toBe('GET');
      expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getCesadStageOpinion', () => {
    it('faz GET /processes/:id/stages/:seq/cesad-stage-opinion com Authorization Bearer', async () => {
      const payload = { id: 'op-1', reportText: 'Relatorio', status: 'DRAFT' };
      fetchMock.mockResolvedValueOnce(jsonResponse(200, payload));

      const result = await getCesadStageOpinion(PROCESS_ID, 2);

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${API_BASE}/processes/${PROCESS_ID}/stages/2/cesad-stage-opinion`);
      expect(init.method).toBe('GET');
      expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
      expect(result).toMatchObject({ id: 'op-1' });
    });
  });

  describe('saveCesadStageOpinionDraft', () => {
    it('faz PUT /processes/:id/stages/:seq/cesad-stage-opinion/draft com body serializado', async () => {
      const body = { reportText: 'Rascunho', conclusion: 'Favoravel' };
      const payload = { id: 'op-2', ...body, status: 'DRAFT' };
      fetchMock.mockResolvedValueOnce(jsonResponse(200, payload));

      const result = await saveCesadStageOpinionDraft(PROCESS_ID, 2, body);

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${API_BASE}/processes/${PROCESS_ID}/stages/2/cesad-stage-opinion/draft`);
      expect(init.method).toBe('PUT');
      expect(init.body).toBe(JSON.stringify(body));
      expect(result).toMatchObject({ id: 'op-2', status: 'DRAFT' });
    });
  });

  describe('completeCesadStageOpinion', () => {
    it('faz POST /processes/:id/stages/:seq/cesad-stage-opinion/complete com body serializado', async () => {
      const body = { reportText: 'Relatorio final', conclusion: 'Desfavoravel' };
      const payload = { id: 'op-3', ...body, status: 'COMPLETED' };
      fetchMock.mockResolvedValueOnce(jsonResponse(200, payload));

      const result = await completeCesadStageOpinion(PROCESS_ID, 3, body);

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${API_BASE}/processes/${PROCESS_ID}/stages/3/cesad-stage-opinion/complete`);
      expect(init.method).toBe('POST');
      expect(init.body).toBe(JSON.stringify(body));
      expect(result).toMatchObject({ id: 'op-3', status: 'COMPLETED' });
    });
  });

  describe('prepareCesadStageOpinionSignatures', () => {
    it('faz POST /processes/:id/stages/:seq/cesad-stage-opinion/signatures/prepare com Authorization Bearer', async () => {
      const payload = {
        processId: PROCESS_ID,
        processStageId: 'ps-1',
        stageSequence: 2,
        stageCode: 'ETAPA_1',
        document: { documentId: 'doc-1', documentStatus: 'READY_FOR_SIGNATURE' },
        expectedSigners: [],
        allExpectedSignersSigned: false,
      };
      fetchMock.mockResolvedValueOnce(jsonResponse(200, payload));

      const result = await prepareCesadStageOpinionSignatures(PROCESS_ID, 2);

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${API_BASE}/processes/${PROCESS_ID}/stages/2/cesad-stage-opinion/signatures/prepare`);
      expect(init.method).toBe('POST');
      expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
      expect(result).toMatchObject({ processId: PROCESS_ID, allExpectedSignersSigned: false });
    });
  });

  describe('getCesadStageOpinionSignatureStatus', () => {
    it('faz GET /processes/:id/stages/:seq/cesad-stage-opinion/signatures com Authorization Bearer', async () => {
      const payload = {
        processId: PROCESS_ID,
        processStageId: 'ps-1',
        stageSequence: 2,
        stageCode: 'ETAPA_1',
        document: { documentId: 'doc-1', documentStatus: 'READY_FOR_SIGNATURE' },
        expectedSigners: [{ expectedSignerId: 'es-1', signatureStatus: 'PENDING' }],
        allExpectedSignersSigned: false,
      };
      fetchMock.mockResolvedValueOnce(jsonResponse(200, payload));

      const result = await getCesadStageOpinionSignatureStatus(PROCESS_ID, 2);

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${API_BASE}/processes/${PROCESS_ID}/stages/2/cesad-stage-opinion/signatures`);
      expect(init.method).toBe('GET');
      expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
      expect(result).toMatchObject({ allExpectedSignersSigned: false });
      expect(result.expectedSigners).toHaveLength(1);
    });
  });

  describe('signCesadStageOpinion', () => {
    it('faz POST /processes/:id/stages/:seq/cesad-stage-opinion/sign com Authorization Bearer', async () => {
      const payload = {
        processId: PROCESS_ID,
        processStageId: 'ps-1',
        stageSequence: 2,
        stageCode: 'ETAPA_1',
        document: { documentId: 'doc-1', documentStatus: 'SIGNED' },
        expectedSigners: [{ expectedSignerId: 'es-1', signatureStatus: 'COMPLETED', signedAt: '2025-01-01T00:00:00Z' }],
        allExpectedSignersSigned: true,
      };
      fetchMock.mockResolvedValueOnce(jsonResponse(200, payload));

      const result = await signCesadStageOpinion(PROCESS_ID, 2);

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${API_BASE}/processes/${PROCESS_ID}/stages/2/cesad-stage-opinion/sign`);
      expect(init.method).toBe('POST');
      expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
      expect(result).toMatchObject({ allExpectedSignersSigned: true });
    });
  });
});
