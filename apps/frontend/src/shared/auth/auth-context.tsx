'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { HttpError } from '@/shared/api/http-error';
import { getDefaultRouteByRole } from '@/shared/rbac/menu';

import { loginRequest, meRequest } from './auth-api';
import { clearSession, persistSession, readSession } from './session-storage';
import type { AuthSession, LoginInput } from './auth-types';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';
type AuthFailureReason = 'expired' | 'generic' | null;

type AuthContextValue = {
  session: AuthSession | null;
  status: AuthStatus;
  bootstrapError: string | null;
  authFailureReason: AuthFailureReason;
  signIn: (input: LoginInput) => Promise<void>;
  signOut: () => void;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const PUBLIC_ROUTES = ['/', '/403', '/sessao-expirada'];
const DEFAULT_PUBLIC_REDIRECT = '/';
const SESSION_EXPIRED_REDIRECT = '/sessao-expirada';

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [authFailureReason, setAuthFailureReason] = useState<AuthFailureReason>(null);

  const handleSessionExpired = useCallback(
    (message = 'Sua sessão expirou. Faça login novamente para continuar.') => {
      clearSession();
      setSession(null);
      setStatus('anonymous');
      setBootstrapError(message);
      setAuthFailureReason('expired');
      router.replace(SESSION_EXPIRED_REDIRECT);
      router.refresh();
    },
    [router],
  );

  const bootstrapSession = useCallback(async () => {
    const storedSession = readSession();

    if (!storedSession) {
      setSession(null);
      setStatus('anonymous');
      setBootstrapError(null);
      setAuthFailureReason(null);
      return;
    }

    setStatus('loading');

    try {
      const user = await meRequest(storedSession.accessToken);
      const nextSession = { ...storedSession, user };

      persistSession(nextSession);
      setSession(nextSession);
      setStatus('authenticated');
      setBootstrapError(null);
      setAuthFailureReason(null);
    } catch (error) {
      if (error instanceof HttpError && error.status === 401) {
        handleSessionExpired();
        return;
      }

      clearSession();
      setSession(null);
      setStatus('anonymous');
      setBootstrapError(error instanceof Error ? error.message : 'Sessão inválida ou indisponível.');
      setAuthFailureReason('generic');
    }
  }, [handleSessionExpired]);

  useEffect(() => {
    void bootstrapSession();
  }, [bootstrapSession]);

  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (status !== 'authenticated' && !PUBLIC_ROUTES.includes(pathname)) {
      router.replace(authFailureReason === 'expired' ? SESSION_EXPIRED_REDIRECT : DEFAULT_PUBLIC_REDIRECT);
      return;
    }

    if (status === 'authenticated' && session && PUBLIC_ROUTES.includes(pathname)) {
      router.replace(getDefaultRouteByRole(session.user.role));
    }
  }, [authFailureReason, pathname, router, session, status]);

  const signIn = useCallback(
    async (input: LoginInput) => {
      const response = await loginRequest(input);
      const nextSession: AuthSession = {
        accessToken: response.accessToken,
        user: response.user,
        rememberMe: input.rememberMe,
      };

      persistSession(nextSession);
      setSession(nextSession);
      setStatus('authenticated');
      setBootstrapError(null);
      setAuthFailureReason(null);
      router.replace(getDefaultRouteByRole(nextSession.user.role));
      router.refresh();
    },
    [router],
  );

  const signOut = useCallback(() => {
    clearSession();
    setSession(null);
    setStatus('anonymous');
    setBootstrapError(null);
    setAuthFailureReason(null);
    router.replace(DEFAULT_PUBLIC_REDIRECT);
    router.refresh();
  }, [router]);

  const refreshSession = useCallback(async () => {
    if (!session) {
      return;
    }

    try {
      const user = await meRequest(session.accessToken);
      const nextSession = { ...session, user };
      persistSession(nextSession);
      setSession(nextSession);
      setStatus('authenticated');
      setBootstrapError(null);
      setAuthFailureReason(null);
    } catch (error) {
      if (error instanceof HttpError && error.status === 401) {
        handleSessionExpired();
        return;
      }

      throw error;
    }
  }, [handleSessionExpired, session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      status,
      bootstrapError,
      authFailureReason,
      signIn,
      signOut,
      refreshSession,
    }),
    [authFailureReason, bootstrapError, refreshSession, session, signIn, signOut, status],
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
