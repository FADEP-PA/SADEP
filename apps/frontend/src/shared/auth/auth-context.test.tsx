import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { UserRole } from '@sadep/contracts';

import { HttpError } from '@/shared/api/http-error';
import { clearAccessToken } from '@/shared/auth/access-token-store';
import { AuthProvider, useAuth } from './auth-context';

// ---- next/navigation mock ----

const replaceMock = vi.fn();
const refreshRouterMock = vi.fn();
const usePathnameMock = vi.fn<() => string>();

vi.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
  useRouter: () => ({ replace: replaceMock, refresh: refreshRouterMock }),
}));

// ---- auth-service mock ----

const refreshSessionMock = vi.fn();
const loginMock = vi.fn();
const logoutSessionMock = vi.fn();

vi.mock('@/shared/api/services/auth-service', () => ({
  refreshSession: (...args: unknown[]) => refreshSessionMock(...args),
  login: (...args: unknown[]) => loginMock(...args),
  logoutSession: (...args: unknown[]) => logoutSessionMock(...args),
}));

// ---- helpers ----

function buildUser(role: UserRole = UserRole.INTERN_SERVER) {
  return { sub: 'u-1', email: 'test@sadep.local', name: 'Teste Institucional', role };
}

function buildLoginResponse(role: UserRole = UserRole.INTERN_SERVER) {
  return { accessToken: 'access-token-test', user: buildUser(role) };
}

type CapturedAuth = ReturnType<typeof useAuth>;
let capturedAuth: CapturedAuth | null = null;

function CaptureContext() {
  const ctx = useAuth();
  useEffect(() => {
    capturedAuth = ctx;
  });
  return (
    <>
      <span data-testid="status">{ctx.status}</span>
      <span data-testid="bootstrap-error">{ctx.bootstrapError ?? ''}</span>
      <span data-testid="session-role">{ctx.session?.user.role ?? ''}</span>
    </>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <CaptureContext />
    </AuthProvider>,
  );
}

// ---- suite ----

describe('AuthProvider', () => {
  beforeEach(() => {
    capturedAuth = null;
    usePathnameMock.mockReturnValue('/servidor-estagiario');
  });

  afterEach(() => {
    cleanup();
    clearAccessToken();
    vi.unstubAllGlobals();
    replaceMock.mockReset();
    refreshRouterMock.mockReset();
    loginMock.mockReset();
    logoutSessionMock.mockReset();
    refreshSessionMock.mockReset();
  });

  describe('bootstrap da sessão', () => {
    it('inicia como loading e resolve para authenticated quando refreshSession retorna sessão válida', async () => {
      refreshSessionMock.mockResolvedValueOnce(buildLoginResponse());

      renderProvider();

      expect(screen.getByTestId('status').textContent).toBe('loading');

      await waitFor(() => {
        expect(screen.getByTestId('status').textContent).toBe('authenticated');
      });

      expect(screen.getByTestId('session-role').textContent).toBe(UserRole.INTERN_SERVER);
      expect(screen.getByTestId('bootstrap-error').textContent).toBe('');
    });

    it('resolve para anonymous sem bootstrapError quando refresh retorna 401 em rota pública', async () => {
      usePathnameMock.mockReturnValue('/');
      refreshSessionMock.mockRejectedValueOnce(new HttpError(401, 'Unauthorized'));

      renderProvider();

      await waitFor(() => {
        expect(screen.getByTestId('status').textContent).toBe('anonymous');
      });

      expect(screen.getByTestId('bootstrap-error').textContent).toBe('');
      expect(replaceMock).not.toHaveBeenCalled();
    });

    it('exibe bootstrapError de sessão expirada e redireciona para /sessao-expirada quando refresh retorna 401 em rota protegida', async () => {
      vi.stubGlobal('location', { assign: vi.fn(), pathname: '/servidor-estagiario' });
      refreshSessionMock.mockRejectedValueOnce(new HttpError(401, 'Unauthorized'));

      renderProvider();

      await waitFor(() => {
        expect(screen.getByTestId('status').textContent).toBe('anonymous');
      });

      expect(screen.getByTestId('bootstrap-error').textContent).toBe(
        'Sua sessão expirou. Faça login novamente para continuar.',
      );
      expect(replaceMock).toHaveBeenCalledWith('/sessao-expirada');
    });

    it('exibe bootstrapError de serviço indisponível quando refresh retorna 500', async () => {
      vi.stubGlobal('location', { assign: vi.fn(), pathname: '/servidor-estagiario' });
      refreshSessionMock.mockRejectedValueOnce(new HttpError(500, 'Internal Server Error'));

      renderProvider();

      await waitFor(() => {
        expect(screen.getByTestId('status').textContent).toBe('anonymous');
      });

      expect(screen.getByTestId('bootstrap-error').textContent).toContain(
        'serviço de autenticação está indisponível',
      );
    });

    it('exibe bootstrapError de falha de rede quando refresh lança TypeError', async () => {
      vi.stubGlobal('location', { assign: vi.fn(), pathname: '/servidor-estagiario' });
      refreshSessionMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      renderProvider();

      await waitFor(() => {
        expect(screen.getByTestId('status').textContent).toBe('anonymous');
      });

      expect(screen.getByTestId('bootstrap-error').textContent).toContain(
        'serviço de autenticação não respondeu',
      );
    });
  });

  describe('signIn', () => {
    it('autentica e redireciona para home do papel após login bem-sucedido', async () => {
      usePathnameMock.mockReturnValue('/');
      refreshSessionMock.mockRejectedValueOnce(new HttpError(401, 'Unauthorized'));

      renderProvider();

      await waitFor(() => {
        expect(screen.getByTestId('status').textContent).toBe('anonymous');
      });

      loginMock.mockResolvedValueOnce(buildLoginResponse(UserRole.IMMEDIATE_SUPERVISOR));

      await act(async () => {
        await capturedAuth?.signIn({
          email: 'chefia@sadep.local',
          password: 'senha',
          rememberMe: true,
        });
      });

      expect(screen.getByTestId('status').textContent).toBe('authenticated');
      expect(screen.getByTestId('session-role').textContent).toBe(UserRole.IMMEDIATE_SUPERVISOR);
      expect(replaceMock).toHaveBeenCalledWith('/chefia-imediata');
    });
  });

  describe('signOut', () => {
    it('limpa a sessão e redireciona para / após logout bem-sucedido', async () => {
      refreshSessionMock.mockResolvedValueOnce(buildLoginResponse());
      logoutSessionMock.mockResolvedValueOnce({ ok: true });

      renderProvider();

      await waitFor(() => {
        expect(screen.getByTestId('status').textContent).toBe('authenticated');
      });

      await act(async () => {
        await capturedAuth?.signOut();
      });

      expect(screen.getByTestId('status').textContent).toBe('anonymous');
      expect(screen.getByTestId('session-role').textContent).toBe('');
      expect(replaceMock).toHaveBeenCalledWith('/');
    });

    it('completa o logout local e redireciona mesmo quando logoutSession lança erro', async () => {
      refreshSessionMock.mockResolvedValueOnce(buildLoginResponse());
      logoutSessionMock.mockRejectedValueOnce(new Error('Network error'));

      renderProvider();

      await waitFor(() => {
        expect(screen.getByTestId('status').textContent).toBe('authenticated');
      });

      await act(async () => {
        await capturedAuth?.signOut();
      });

      expect(screen.getByTestId('status').textContent).toBe('anonymous');
      expect(replaceMock).toHaveBeenCalledWith('/');
    });
  });

  describe('refreshSession', () => {
    it('atualiza a sessão e mantém authenticated quando refresh retorna nova sessão', async () => {
      refreshSessionMock.mockResolvedValueOnce(buildLoginResponse(UserRole.CESAD_MEMBER));

      renderProvider();

      await waitFor(() => {
        expect(screen.getByTestId('status').textContent).toBe('authenticated');
      });

      refreshSessionMock.mockResolvedValueOnce(buildLoginResponse(UserRole.CESAD_MEMBER));

      await act(async () => {
        await capturedAuth?.refreshSession();
      });

      expect(screen.getByTestId('status').textContent).toBe('authenticated');
      expect(screen.getByTestId('session-role').textContent).toBe(UserRole.CESAD_MEMBER);
    });

    it('muda para anonymous e limpa a sessão quando refresh retorna 401', async () => {
      refreshSessionMock.mockResolvedValueOnce(buildLoginResponse());

      renderProvider();

      await waitFor(() => {
        expect(screen.getByTestId('status').textContent).toBe('authenticated');
      });

      refreshSessionMock.mockRejectedValueOnce(new HttpError(401, 'Unauthorized'));

      await act(async () => {
        await capturedAuth?.refreshSession();
      });

      expect(screen.getByTestId('status').textContent).toBe('anonymous');
      expect(screen.getByTestId('session-role').textContent).toBe('');
    });
  });
});
