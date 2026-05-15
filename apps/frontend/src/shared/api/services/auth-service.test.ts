import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { login, logoutSession, refreshSession } from './auth-service';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
  } as unknown as Response;
}

describe('auth-service', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('login', () => {
    it('faz POST /auth/login com o body serializado e credentials include', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(200, { accessToken: 'tok-123', user: { id: '1', role: 'ADMIN' } }),
      );

      const result = await login({ email: 'admin@test.com', password: 'senha123', rememberMe: false });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${API_BASE}/auth/login`);
      expect(init.method).toBe('POST');
      expect(init.credentials).toBe('include');
      expect(init.body).toBe(JSON.stringify({ email: 'admin@test.com', password: 'senha123' }));
      expect(result).toMatchObject({ accessToken: 'tok-123' });
    });
  });

  describe('refreshSession', () => {
    it('faz POST /auth/refresh com credentials include e retorna o novo accessToken', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(200, { accessToken: 'tok-fresh', user: { id: '1', role: 'ADMIN' } }),
      );

      const result = await refreshSession();

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${API_BASE}/auth/refresh`);
      expect(init.method).toBe('POST');
      expect(init.credentials).toBe('include');
      expect(result).toMatchObject({ accessToken: 'tok-fresh' });
    });
  });

  describe('logoutSession', () => {
    it('faz POST /auth/logout com credentials include e retorna ok', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: true }));

      const result = await logoutSession();

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${API_BASE}/auth/logout`);
      expect(init.method).toBe('POST');
      expect(init.credentials).toBe('include');
      expect(result).toEqual({ ok: true });
    });
  });
});
