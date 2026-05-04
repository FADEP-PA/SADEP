'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { HttpError } from '@/shared/api/http-error';
import { login, logoutSession, refreshSession as refreshAuthSession } from '@/shared/api/services/auth-service';

import {
  DEFAULT_PUBLIC_REDIRECT,
  SESSION_EXPIRED_REDIRECT,
  getAuthenticatedHomeByRole,
  isPublicAuthRoute,
} from './auth-routes';
import { clearAccessToken, setAccessToken } from './access-token-store';
import { clearSession, persistRememberMePreference, readRememberMePreference } from './session-storage';
import type { AuthSession, LoginInput } from './auth-types';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

type AuthContextValue = {
  session: AuthSession | null;
  status: AuthStatus;
  bootstrapError: string | null;
  signIn: (input: LoginInput) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getSessionValidationErrorMessage(error: unknown) {
  if (error instanceof HttpError && error.status === 401) {
    return 'Sua sessao expirou. Faca login novamente para continuar.';
  }

  if (error instanceof HttpError && error.status >= 500) {
    return 'Nao foi possivel validar sua sessao porque o backend esta indisponivel no momento.';
  }

  if (error instanceof Error && error.name === 'AbortError') {
    return 'Nao foi possivel validar sua sessao porque a resposta do backend excedeu o tempo limite.';
  }

  if (error instanceof TypeError) {
    return 'Nao foi possivel validar sua sessao porque o backend nao respondeu ou houve falha de rede.';
  }

  if (error instanceof HttpError) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return 'Nao foi possivel validar sua sessao. Faca login novamente para continuar.';
}

function getRedirectPathForValidationFailure(pathname: string, error: unknown) {
  if (isPublicAuthRoute(pathname)) {
    return null;
  }

  if (error instanceof HttpError && error.status === 401) {
    return SESSION_EXPIRED_REDIRECT;
  }

  return DEFAULT_PUBLIC_REDIRECT;
}

function getCurrentBrowserPathname() {
  return typeof window === 'undefined' ? DEFAULT_PUBLIC_REDIRECT : window.location.pathname;
}

function isUnauthorizedError(error: unknown) {
  return error instanceof HttpError && error.status === 401;
}

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [authRedirectPath, setAuthRedirectPath] = useState<string | null>(null);

  const bootstrapSession = useCallback(async () => {
    const rememberMe = readRememberMePreference() ?? true;
    clearAccessToken();
    clearSession();
    setStatus('loading');

    try {
      const response = await refreshAuthSession();
      setAccessToken(response.accessToken);

      const nextSession: AuthSession = {
        accessToken: response.accessToken,
        user: response.user,
        rememberMe,
      };

      setSession(nextSession);
      setStatus('authenticated');
      setBootstrapError(null);
      setAuthRedirectPath(null);
    } catch (error) {
      setBootstrapError(getSessionValidationErrorMessage(error));
      clearAccessToken();
      clearSession();

      if (isUnauthorizedError(error)) {
        setSession(null);
        setStatus('anonymous');
        setAuthRedirectPath(getRedirectPathForValidationFailure(getCurrentBrowserPathname(), error));
        return;
      }

      setSession(null);
      setStatus('anonymous');
      setAuthRedirectPath(null);
    }
  }, []);

  useEffect(() => {
    void bootstrapSession();
  }, [bootstrapSession]);

  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (status !== 'authenticated' && !isPublicAuthRoute(pathname)) {
      router.replace(authRedirectPath ?? DEFAULT_PUBLIC_REDIRECT);
      return;
    }

    if (status === 'authenticated' && session && pathname === '/') {
      router.replace(getAuthenticatedHomeByRole(session.user.role));
    }

    if (status === 'authenticated' && session && pathname === SESSION_EXPIRED_REDIRECT) {
      router.replace(getAuthenticatedHomeByRole(session.user.role));
    }
  }, [authRedirectPath, pathname, router, session, status]);

  const signIn = useCallback(
    async (input: LoginInput) => {
      const response = await login(input);
      setAccessToken(response.accessToken);
      persistRememberMePreference(input.rememberMe);
      clearSession();

      const nextSession: AuthSession = {
        accessToken: response.accessToken,
        user: response.user,
        rememberMe: input.rememberMe,
      };

      setSession(nextSession);
      setStatus('authenticated');
      setBootstrapError(null);
      setAuthRedirectPath(null);
      router.replace(getAuthenticatedHomeByRole(response.user.role));
      router.refresh();
    },
    [router],
  );

  const signOut = useCallback(async () => {
    try {
      await logoutSession();
    } catch {
      // Logout local must complete even if the backend is temporarily unavailable.
    } finally {
      clearAccessToken();
      clearSession();
      setSession(null);
      setStatus('anonymous');
      setAuthRedirectPath(null);
      router.replace(DEFAULT_PUBLIC_REDIRECT);
      router.refresh();
    }
  }, [router]);

  const refreshSession = useCallback(async () => {
    if (!session) {
      return;
    }

    try {
      const response = await refreshAuthSession();
      setAccessToken(response.accessToken);
      const nextSession = {
        accessToken: response.accessToken,
        user: response.user,
        rememberMe: session.rememberMe,
      };
      setSession(nextSession);
      setStatus('authenticated');
      setBootstrapError(null);
      setAuthRedirectPath(null);
    } catch (error) {
      setBootstrapError(getSessionValidationErrorMessage(error));

      if (isUnauthorizedError(error)) {
        clearAccessToken();
        clearSession();
        setSession(null);
        setStatus('anonymous');
        setAuthRedirectPath(getRedirectPathForValidationFailure(pathname, error));
        return;
      }

      setStatus('authenticated');
      setAuthRedirectPath(null);
    }
  }, [pathname, session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      status,
      bootstrapError,
      signIn,
      signOut,
      refreshSession,
    }),
    [bootstrapError, refreshSession, session, signIn, signOut, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
