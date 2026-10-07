import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearAccessToken, setAccessToken } from '@/shared/auth/access-token-store';
import { AcknowledgementMode, ProcessAction } from '@sadep/contracts';
import {
  approveHomologation,
  getEvaluationDocumentPdf,
  completeCesadStageOpinion,
  getCesadStageOpinion,
  getCesadFinalOpinionEligibility,
  getCesadFinalOpinion,
  startCesadFinalOpinion,
  saveCesadFinalOpinionDraft,
  completeCesadFinalOpinion,
  prepareCesadFinalOpinionSignatures,
  getCesadFinalOpinionSignatureStatus,
  signCesadFinalOpinion,
  sendCesadFinalOpinionToHomologation,
  getCesadStageOpinionSignatureStatus,
  getHomologationQueue,
  getHomologationStatus,
  getInternWorkspaceSnapshot,
  notifyHomologationResult,
  getProcessList,
  getSelfEvaluation,
  getSupervisorEvaluationWorkspaceSnapshot,
  getWorkflow,
  getWorkflowHistory,
  prepareCesadStageOpinionSignatures,
  returnHomologationForRegularization,
  saveCesadStageOpinionDraft,
  signCesadStageOpinion,
  signSelfEvaluation,
  signSupervisorEvaluation,
  submitSupervisorEvaluation,
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

  it.each([AcknowledgementMode.ACKNOWLEDGED, AcknowledgementMode.ACKNOWLEDGED_WITH_RESERVATION])('envia modalidade %s no endpoint de ciência', async (acknowledgementMode) => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));
    await signSupervisorEvaluation(PROCESS_ID, acknowledgementMode);
    expect(fetchMock).toHaveBeenCalledWith(API_BASE + '/processes/' + PROCESS_ID + '/supervisor-evaluation/sign', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ acknowledgementMode }),
    }));
  });

  describe('getWorkflow', () => {

  it('baixa bytes PDF autenticados sem usar caminho de storage', async () => {
    const pdf = new Blob(['%PDF-test'], { type: 'application/pdf' });
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, blob: async () => pdf });
    expect(await getEvaluationDocumentPdf(PROCESS_ID, 'document-1')).toBe(pdf);
    expect(fetchMock).toHaveBeenCalledWith(API_BASE + '/processes/' + PROCESS_ID + '/supervisor-evaluation/documents/document-1/artifact', expect.objectContaining({ cache: 'no-store', headers: expect.objectContaining({ Authorization: 'Bearer ' + TOKEN }) }));
  });

  it('rejeita resposta vazia ou conteúdo que não seja PDF', async () => {
    for (const pdf of [new Blob([], { type: 'application/pdf' }), new Blob(['html'], { type: 'text/html' })]) {
      fetchMock.mockResolvedValueOnce({ ok: true, status: 200, blob: async () => pdf });
      await expect(getEvaluationDocumentPdf(PROCESS_ID, 'document-1')).rejects.toThrow('O documento PDF está indisponível.');
    }
  });

  it('renova token expirado e repete o download binário autorizado', async () => {
    const pdf = new Blob(['%PDF-test'], { type: 'application/pdf' });
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { message: 'expired' }))
      .mockResolvedValueOnce(jsonResponse(200, { accessToken: 'renewed-token' }))
      .mockResolvedValueOnce({ ok: true, status: 200, blob: async () => pdf });
    expect(await getEvaluationDocumentPdf(PROCESS_ID, 'document-1')).toBe(pdf);
    expect(fetchMock.mock.calls[2]![1]).toMatchObject({ headers: { Authorization: 'Bearer renewed-token' } });
  });

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
        items: [{ id: PROCESS_ID, status: 'EM_AVALIACAO', evaluatedUserName: 'Joao', selfEvaluationStatus: null }],
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

    it('lanca HttpError quando API retorna 403', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(403, { error: 'Forbidden' }));

      await expect(getCesadStageOpinion(PROCESS_ID, 2)).rejects.toThrow();
    });

    it('lanca HttpError quando API retorna 404', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(404, { error: 'Not Found' }));

      await expect(getCesadStageOpinion(PROCESS_ID, 2)).rejects.toThrow();
    });
  });

  describe('cesad final opinion', () => {
    const body = { reportText: 'Relatório', finalConclusion: 'Conclusão' };

    it('lê elegibilidade e parecer final process-wide', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { processId: PROCESS_ID, isEligible: true }))
        .mockResolvedValueOnce(jsonResponse(200, null));
      await getCesadFinalOpinionEligibility(PROCESS_ID);
      await getCesadFinalOpinion(PROCESS_ID);
      expect(fetchMock.mock.calls[0]![0]).toBe(`${API_BASE}/processes/${PROCESS_ID}/cesad-final-opinion/eligibility`);
      expect(fetchMock.mock.calls[1]![0]).toBe(`${API_BASE}/processes/${PROCESS_ID}/cesad-final-opinion`);
    });

    it('integra iniciar, salvar rascunho e concluir', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { id: 'final-1', status: 'DRAFT' }));
      await startCesadFinalOpinion(PROCESS_ID);
      await saveCesadFinalOpinionDraft(PROCESS_ID, body);
      await completeCesadFinalOpinion(PROCESS_ID, body);
      expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
        `${API_BASE}/processes/${PROCESS_ID}/cesad-final-opinion/start`,
        `${API_BASE}/processes/${PROCESS_ID}/cesad-final-opinion/draft`,
        `${API_BASE}/processes/${PROCESS_ID}/cesad-final-opinion/complete`,
      ]);
      expect(fetchMock.mock.calls[1]![1]).toMatchObject({ method: 'PUT', body: JSON.stringify(body) });
      expect(fetchMock.mock.calls[2]![1]).toMatchObject({ method: 'POST', body: JSON.stringify(body) });
    });

    it('integra preparar, consultar e assinar sem estado local', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { processId: PROCESS_ID, allExpectedSignersSigned: false }));
      await prepareCesadFinalOpinionSignatures(PROCESS_ID);
      await getCesadFinalOpinionSignatureStatus(PROCESS_ID);
      await signCesadFinalOpinion(PROCESS_ID);
      expect(fetchMock.mock.calls.map(([url, init]) => [url, (init as RequestInit).method])).toEqual([
        [`${API_BASE}/processes/${PROCESS_ID}/cesad-final-opinion/signatures/prepare`, 'POST'],
        [`${API_BASE}/processes/${PROCESS_ID}/cesad-final-opinion/signatures`, 'GET'],
        [`${API_BASE}/processes/${PROCESS_ID}/cesad-final-opinion/sign`, 'POST'],
      ]);
    });

    it('integra o envio persistente à homologação', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { processId: PROCESS_ID, sentToHomologationAt: '2026-10-07T10:00:00.000Z' }));
      await sendCesadFinalOpinionToHomologation(PROCESS_ID);
      expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/processes/${PROCESS_ID}/cesad-final-opinion/send-to-homologation`, expect.objectContaining({ method: 'POST', body: JSON.stringify({}) }));
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

    it('lanca HttpError quando API retorna 422 (validacao)', async () => {
      const body = { reportText: '', conclusion: '' };
      fetchMock.mockResolvedValueOnce(
        jsonResponse(422, { error: 'Validation', details: { reportText: 'obrigatorio' } }),
      );

      await expect(saveCesadStageOpinionDraft(PROCESS_ID, 2, body)).rejects.toThrow();
    });

    it('lanca HttpError quando API retorna 409 (conflito)', async () => {
      const body = { reportText: 'Rascunho', conclusion: 'Favoravel' };
      fetchMock.mockResolvedValueOnce(jsonResponse(409, { error: 'Conflict' }));

      await expect(saveCesadStageOpinionDraft(PROCESS_ID, 2, body)).rejects.toThrow();
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

    it('lanca HttpError quando API retorna 403 (acao bloqueada)', async () => {
      const body = { reportText: 'Relatorio final', conclusion: 'Desfavoravel' };
      fetchMock.mockResolvedValueOnce(jsonResponse(403, { error: 'Acao bloqueada' }));

      await expect(completeCesadStageOpinion(PROCESS_ID, 3, body)).rejects.toThrow();
    });

    it('lanca HttpError quando API retorna 409', async () => {
      const body = { reportText: 'Relatorio final', conclusion: 'Desfavoravel' };
      fetchMock.mockResolvedValueOnce(jsonResponse(409, { error: 'Conflict' }));

      await expect(completeCesadStageOpinion(PROCESS_ID, 3, body)).rejects.toThrow();
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

    it('lanca HttpError quando API retorna 409 (parecer ja preparado)', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(409, { error: 'Conflict' }));

      await expect(prepareCesadStageOpinionSignatures(PROCESS_ID, 2)).rejects.toThrow();
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

    it('lanca HttpError quando API retorna 409 (assinatura ja realizada)', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(409, { error: 'Assinatura ja realizada' }));

      await expect(signCesadStageOpinion(PROCESS_ID, 2)).rejects.toThrow();
    });
  });

  describe('getSelfEvaluation', () => {
    it('faz GET /processes/:id/self-evaluation com Authorization Bearer', async () => {
      const payload = { id: 'se-1', processId: PROCESS_ID, status: 'SUBMITTED', selfReflection: 'Reflexao' };
      fetchMock.mockResolvedValueOnce(jsonResponse(200, payload));

      const result = await getSelfEvaluation(PROCESS_ID);

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${API_BASE}/processes/${PROCESS_ID}/self-evaluation`);
      expect(init.method).toBe('GET');
      expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
      expect(result).toMatchObject({ id: 'se-1', status: 'SUBMITTED' });
    });

    it('lanca HttpError quando API retorna 403', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(403, { error: 'Forbidden' }));

      await expect(getSelfEvaluation(PROCESS_ID)).rejects.toThrow();
    });
  });

  describe('getSupervisorEvaluationWorkspaceSnapshot', () => {
    it('faz GET /processes/:id/supervisor-evaluation/workspace com Authorization Bearer', async () => {
      const payload = {
        process: { id: PROCESS_ID, status: 'EM_AVALIACAO' },
        supervisorEvaluation: null,
        documentContext: null,
        canEditDraft: true,
        canSubmit: true,
        canRectify: false,
      };
      fetchMock.mockResolvedValueOnce(jsonResponse(200, payload));

      const result = await getSupervisorEvaluationWorkspaceSnapshot(PROCESS_ID);

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `${API_BASE}/processes/${PROCESS_ID}/supervisor-evaluation/workspace`,
      );
      expect(init.method).toBe('GET');
      expect((init.headers as Record<string, string>).Authorization).toBe(
        `Bearer ${TOKEN}`,
      );
      expect(result).toMatchObject({
        process: { id: PROCESS_ID, status: 'EM_AVALIACAO' },
        canEditDraft: true,
        canSubmit: true,
        canRectify: false,
      });
    });

    it('lanca HttpError quando API retorna 403', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(403, { error: 'Forbidden' }));

      await expect(
        getSupervisorEvaluationWorkspaceSnapshot(PROCESS_ID),
      ).rejects.toThrow();
    });
  });

  describe('submitSupervisorEvaluation', () => {
    it('faz POST /processes/:id/supervisor-evaluation/submit com body serializado', async () => {
      const body = {
        summary: 'Competencias da unidade',
        generalComments: 'Comentarios gerais',
        content: { criteria: [{ code: '1.1', label: 'Item 1', rating: 3 }] },
        comment: 'Avaliacao submetida',
      };
      const payload = { id: 'ev-1', processId: PROCESS_ID, status: 'SUBMITTED' };
      fetchMock.mockResolvedValueOnce(jsonResponse(200, payload));

      const result = await submitSupervisorEvaluation(PROCESS_ID, body);

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${API_BASE}/processes/${PROCESS_ID}/supervisor-evaluation/submit`);
      expect(init.method).toBe('POST');
      expect(init.body).toBe(JSON.stringify(body));
      expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
      expect(result).toMatchObject({ id: 'ev-1', status: 'SUBMITTED' });
    });

    it('lanca HttpError quando API retorna 400 (validacao)', async () => {
      const body = {
        summary: '',
        generalComments: '',
        content: { criteria: [] },
      };
      fetchMock.mockResolvedValueOnce(jsonResponse(400, { error: 'Bad Request' }));

      await expect(submitSupervisorEvaluation(PROCESS_ID, body)).rejects.toThrow();
    });
  });

  describe('signSelfEvaluation', () => {
    it('faz POST /processes/:id/self-evaluation/sign com Authorization Bearer', async () => {
      const payload = { id: 'se-1', processId: PROCESS_ID, status: 'SUBMITTED' };
      fetchMock.mockResolvedValueOnce(jsonResponse(200, payload));

      const result = await signSelfEvaluation(PROCESS_ID);

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${API_BASE}/processes/${PROCESS_ID}/self-evaluation/sign`);
      expect(init.method).toBe('POST');
      expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
      expect(result).toMatchObject({ id: 'se-1' });
    });

    it('envia comment opcional quando fornecido', async () => {
      const payload = { id: 'se-1', processId: PROCESS_ID, status: 'SUBMITTED' };
      fetchMock.mockResolvedValueOnce(jsonResponse(200, payload));

      await signSelfEvaluation(PROCESS_ID, { comment: 'Confirmado' });

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(init.body).toBe(JSON.stringify({ comment: 'Confirmado' }));
    });

    it('lanca HttpError quando API retorna 409 (ja assinado)', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(409, { error: 'Conflict' }));

      await expect(signSelfEvaluation(PROCESS_ID)).rejects.toThrow();
    });
  });

  describe('getHomologationStatus', () => {
    it('faz GET /processes/:id/homologation com Authorization Bearer', async () => {
      const payload = {
        processId: PROCESS_ID,
        processStatus: 'PARECER_EMITIDO',
        homologatedAt: null,
        homologatedByUserId: null,
        homologationRemarks: null,
        notifiedAt: null,
        notifiedByUserId: null,
        acknowledgedAt: null,
      };
      fetchMock.mockResolvedValueOnce(jsonResponse(200, payload));

      const result = await getHomologationStatus(PROCESS_ID);

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${API_BASE}/processes/${PROCESS_ID}/homologation`);
      expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
      expect(result).toMatchObject({ processId: PROCESS_ID, processStatus: 'PARECER_EMITIDO' });
    });

    it('lanca HttpError quando API retorna 403', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(403, { error: 'Forbidden' }));

      await expect(getHomologationStatus(PROCESS_ID)).rejects.toThrow();
    });
  });

  describe('getHomologationQueue', () => {
    it('faz GET /processes/homologation/queue e retorna items e total', async () => {
      const payload = {
        items: [
          {
            id: PROCESS_ID,
            status: 'PARECER_EMITIDO',
            evaluatedUserName: 'Servidor Ana',
            evaluatedUserEmail: 'ana@sadep.local',
            currentStageSequence: 4,
            createdAt: '2026-10-01T10:00:00.000Z',
            sentToHomologationAt: '2026-10-05T10:00:00.000Z',
          },
        ],
        total: 1,
      };
      fetchMock.mockResolvedValueOnce(jsonResponse(200, payload));

      const result = await getHomologationQueue();

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${API_BASE}/processes/homologation/queue`);
      expect(init.method).toBe('GET');
      expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
      expect(result.total).toBe(1);
      expect(result.items[0]).toMatchObject({ id: PROCESS_ID, status: 'PARECER_EMITIDO' });
    });
  });

  describe('approveHomologation', () => {
    it('faz POST /processes/:id/homologation/approve com as observações', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(200, { processId: PROCESS_ID, processStatus: 'HOMOLOGADO' }),
      );

      await approveHomologation(PROCESS_ID, { homologationRemarks: 'De acordo.' });

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${API_BASE}/processes/${PROCESS_ID}/homologation/approve`);
      expect(init.method).toBe('POST');
      expect(init.body).toBe(JSON.stringify({ homologationRemarks: 'De acordo.' }));
    });

    it('lanca HttpError 409 quando o processo ja foi homologado', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(409, { message: 'Process has already been homologated' }),
      );

      await expect(approveHomologation(PROCESS_ID, {})).rejects.toMatchObject({ status: 409 });
    });
  });

  describe('notifyHomologationResult', () => {
    it('faz POST /processes/:id/homologation/notify com as observacoes', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(200, {
          processId: PROCESS_ID,
          processStatus: 'NOTIFICADO',
          homologatedAt: '2026-10-06T10:00:00.000Z',
          homologatedByUserId: 'authority-1',
          homologationRemarks: null,
          notifiedAt: '2026-10-06T11:00:00.000Z',
          notifiedByUserId: 'authority-1',
          acknowledgedAt: null,
        }),
      );

      const result = await notifyHomologationResult(PROCESS_ID, {
        notificationRemarks: 'Notificado ao servidor.',
      });

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${API_BASE}/processes/${PROCESS_ID}/homologation/notify`);
      expect(init.method).toBe('POST');
      expect(init.body).toBe(JSON.stringify({ notificationRemarks: 'Notificado ao servidor.' }));
      expect(result).toMatchObject({ processStatus: 'NOTIFICADO' });
    });

    it('lanca HttpError 409 quando a notificacao ja foi gerada', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(409, { message: 'Result notification has already been sent' }),
      );

      await expect(notifyHomologationResult(PROCESS_ID, {})).rejects.toMatchObject({
        status: 409,
      });
    });

    it('lanca HttpError 400 quando o processo nao esta homologado', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(400, {
          message: 'Process must be in HOMOLOGADO status to send result notification',
        }),
      );

      await expect(notifyHomologationResult(PROCESS_ID, {})).rejects.toMatchObject({
        status: 400,
      });
    });
  });

  describe('returnHomologationForRegularization', () => {
    it('faz POST /processes/:id/homologation/return-for-regularization com as observações', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(200, { processId: PROCESS_ID, processStatus: 'EM_AVALIACAO' }),
      );

      await returnHomologationForRegularization(PROCESS_ID, {
        returnRemarks: 'Corrigir anexos.',
      });

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `${API_BASE}/processes/${PROCESS_ID}/homologation/return-for-regularization`,
      );
      expect(init.method).toBe('POST');
      expect(init.body).toBe(JSON.stringify({ returnRemarks: 'Corrigir anexos.' }));
    });

    it('lanca HttpError 422 quando o processo nao esta apto para devolucao', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(422, { message: 'Process must be in PARECER_EMITIDO status' }),
      );

      await expect(returnHomologationForRegularization(PROCESS_ID, {})).rejects.toMatchObject({
        status: 422,
      });
    });
  });
});
