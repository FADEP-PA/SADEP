import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearAccessToken, setAccessToken } from '@/shared/auth/access-token-store';
import { HttpError } from './http-error';
import { httpRequest } from './http-client';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
  } as unknown as Response;
}

function plainResponse(status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'text/plain' }),
    json: async () => undefined,
  } as unknown as Response;
}

describe('httpRequest', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('location', { assign: vi.fn(), pathname: '/inicio' });
  });

  afterEach(() => {
    vi.runAllTimers();
    clearAccessToken();
    vi.unstubAllGlobals();
  });

  describe('resposta bem-sucedida', () => {
    it('retorna o JSON parseado em uma resposta 200', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 'proc-1', status: 'EM_AVALIACAO' }));

      const result = await httpRequest<{ id: string; status: string }>('/processes/proc-1/workflow');

      expect(result).toEqual({ id: 'proc-1', status: 'EM_AVALIACAO' });
    });

    it('retorna undefined quando o content-type nao e application/json', async () => {
      fetchMock.mockResolvedValueOnce(plainResponse(200));

      const result = await httpRequest('/health');

      expect(result).toBeUndefined();
    });
  });

  describe('header Authorization', () => {
    it('inclui Authorization Bearer quando useStoredAccessToken e true e ha token armazenado', async () => {
      setAccessToken('tok-xyz');
      fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));

      await httpRequest('/processes/x/workflow', { useStoredAccessToken: true });

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok-xyz');
    });

    it('omite o header Authorization quando nao ha token armazenado', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));

      await httpRequest('/health');

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    });
  });

  describe('estrutura da requisicao', () => {
    it('usa cache no-store em todas as requisicoes', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));

      await httpRequest('/health');

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(init.cache).toBe('no-store');
    });

    it('serializa o body como JSON string', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));

      await httpRequest('/auth/login', {
        method: 'POST',
        body: { email: 'a@test.com', password: 'senha' },
      });

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(init.body).toBe(JSON.stringify({ email: 'a@test.com', password: 'senha' }));
    });

    it('inclui params definidos como query string e omite valores undefined', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, []));

      await httpRequest('/processes', {
        params: { page: 1, status: 'EM_AVALIACAO', filter: undefined },
      });

      const [url] = fetchMock.mock.calls[0] as [string];
      const parsed = new URL(url);
      expect(parsed.searchParams.get('page')).toBe('1');
      expect(parsed.searchParams.get('status')).toBe('EM_AVALIACAO');
      expect(parsed.searchParams.has('filter')).toBe(false);
    });

    it('constroi a URL a partir do fallback de API_BASE_URL', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));

      await httpRequest('/health');

      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toBe(`${API_BASE}/health`);
    });
  });

  describe('erros HTTP', () => {
    it('lanca HttpError com o status correto em uma resposta 404', async () => {
      fetchMock.mockResolvedValue(jsonResponse(404, { message: 'Processo nao encontrado' }));

      const error = await httpRequest('/processes/nope/workflow').catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).status).toBe(404);
    });

    it('lanca HttpError com a mensagem vinda do payload em uma resposta 400', async () => {
      fetchMock.mockResolvedValue(jsonResponse(400, { message: 'Dados invalidos', error: 'Bad Request' }));

      const error = await httpRequest('/auth/login', { method: 'POST', body: {} }).catch(
        (e: unknown) => e,
      );

      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).message).toBe('Dados invalidos');
    });

    it('repropaga erros que nao sao HttpError sem modificacao', async () => {
      const networkError = new TypeError('Failed to fetch');
      fetchMock.mockRejectedValueOnce(networkError);

      const error = await httpRequest('/health').catch((e: unknown) => e);

      expect(error).toBe(networkError);
    });
  });

  describe('retry apos 401', () => {
    it('renova o token via refresh e reexecuta a requisicao original apos 401', async () => {
      setAccessToken('token-expirado');
      fetchMock
        .mockResolvedValueOnce(jsonResponse(401, { message: 'Unauthorized' }))
        .mockResolvedValueOnce(jsonResponse(200, { accessToken: 'token-novo' }))
        .mockResolvedValueOnce(jsonResponse(200, { id: 'proc-1' }));

      const result = await httpRequest<{ id: string }>('/processes/proc-1/workflow', {
        useStoredAccessToken: true,
      });

      expect(result).toEqual({ id: 'proc-1' });
      expect(fetchMock).toHaveBeenCalledTimes(3);

      const [, retryInit] = fetchMock.mock.calls[2] as [string, RequestInit];
      expect((retryInit.headers as Record<string, string>).Authorization).toBe('Bearer token-novo');
    });

    it('lanca o erro quando o proprio refresh retorna 401', async () => {
      setAccessToken('token-expirado');
      fetchMock
        .mockResolvedValueOnce(jsonResponse(401, {}))
        .mockResolvedValueOnce(jsonResponse(401, { message: 'Sessao invalida' }));

      const error = await httpRequest('/processes/x/workflow', {
        useStoredAccessToken: true,
      }).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).status).toBe(401);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('nao tenta refresh quando nao ha token armazenado', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(401, {}));

      const error = await httpRequest('/health').catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).status).toBe(401);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('nao tenta refresh quando retryOnUnauthorized e false', async () => {
      setAccessToken('algum-token');
      fetchMock.mockResolvedValueOnce(jsonResponse(401, {}));

      const error = await httpRequest('/processes/x/workflow', {
        useStoredAccessToken: true,
        retryOnUnauthorized: false,
      }).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).status).toBe(401);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('nao tenta refresh em rotas /auth/', async () => {
      setAccessToken('algum-token');
      fetchMock.mockResolvedValueOnce(jsonResponse(401, {}));

      const error = await httpRequest('/auth/me', {
        useStoredAccessToken: true,
      }).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).status).toBe(401);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('single-flight do refresh', () => {
    it('compartilha uma unica chamada ao /auth/refresh entre requisicoes 401 concorrentes', async () => {
      setAccessToken('token-compartilhado');
      fetchMock
        .mockResolvedValueOnce(jsonResponse(401, {}))
        .mockResolvedValueOnce(jsonResponse(401, {}))
        .mockResolvedValueOnce(jsonResponse(200, { accessToken: 'token-renovado' }))
        .mockResolvedValueOnce(jsonResponse(200, { resultado: 'A' }))
        .mockResolvedValueOnce(jsonResponse(200, { resultado: 'B' }));

      const [a, b] = await Promise.all([
        httpRequest<{ resultado: string }>('/processes/proc-a/workflow', { useStoredAccessToken: true }),
        httpRequest<{ resultado: string }>('/processes/proc-b/workflow', { useStoredAccessToken: true }),
      ]);

      expect(a).toEqual({ resultado: 'A' });
      expect(b).toEqual({ resultado: 'B' });

      const refreshCalls = (fetchMock.mock.calls as [string, RequestInit][]).filter(([url]) =>
        url.includes('/auth/refresh'),
      );
      expect(refreshCalls).toHaveLength(1);
    });
  });
});
