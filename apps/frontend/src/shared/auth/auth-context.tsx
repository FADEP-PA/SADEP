'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { HttpError } from '@/shared/api/http-error';
import { getAuthenticatedUser, login } from '@/shared/api/services/auth-service';

import {
  DEFAULT_PUBLIC_REDIRECT,
  SESSION_EXPIRED_REDIRECT,
  getAuthenticatedHomeByRole,
  isPublicAuthRoute,
} from './auth-routes';
import { clearSession, persistSession, readSession } from './session-storage';
import type { AuthSession, LoginInput } from './auth-types';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

type AuthContextValue = {
  session: AuthSession | null;
  status: AuthStatus;
  bootstrapError: string | null;
  signIn: (input: LoginInput) => Promise<void>;
  signOut: () => void;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [authRedirectPath, setAuthRedirectPath] = useState<string | null>(null);

  const bootstrapSession = useCallback(async () => {
    const storedSession = readSession();

    if (!storedSession) {
      setSession(null);
      setStatus('anonymous');
      setBootstrapError(null);
      setAuthRedirectPath(null);
      return;
    }

    setStatus('loading');

    try {
      const user = await getAuthenticatedUser(storedSession.accessToken);
      const nextSession = { ...storedSession, user };

      persistSession(nextSession);
      setSession(nextSession);
      setStatus('authenticated');
      setBootstrapError(null);
      setAuthRedirectPath(null);
    } catch (error) {
      clearSession();
      setSession(null);
      setStatus('anonymous');

      const nextErrorMessage =
        error instanceof Error ? error.message : 'Sessão inválida ou expirada.';

      setBootstrapError(nextErrorMessage);

      if (error instanceof HttpError && error.status === 401 && !isPublicAuthRoute(pathname)) {
        setAuthRedirectPath(SESSION_EXPIRED_REDIRECT);
        return;
      }

      setAuthRedirectPath(null);
    }
  }, [pathname]);

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
      const nextSession: AuthSession = {
        accessToken: response.accessToken,
        user: response.user,
        rememberMe: input.rememberMe,
      };

      persistSession(nextSession);
      setSession(nextSession);
      setStatus('authenticated');
      setBootstrapError(null);
      setAuthRedirectPath(null);
      router.replace(getAuthenticatedHomeByRole(response.user.role));
      router.refresh();
    },
    [router],
  );

  const signOut = useCallback(() => {
    clearSession();
    setSession(null);
    setStatus('anonymous');
    setAuthRedirectPath(null);
    router.replace(DEFAULT_PUBLIC_REDIRECT);
    router.refresh();
  }, [router]);

  const refreshSession = useCallback(async () => {
    if (!session) {
      return;
    }

    try {
      const user = await getAuthenticatedUser(session.accessToken);
      const nextSession = { ...session, user };
      persistSession(nextSession);
      setSession(nextSession);
      setStatus('authenticated');
      setBootstrapError(null);
    } catch (error) {
      if (error instanceof HttpError && error.status === 401) {
        setBootstrapError('Sua sessão expirou. Faça login novamente para continuar.');
        clearSession();
        setSession(null);
        setStatus('anonymous');
        setAuthRedirectPath(SESSION_EXPIRED_REDIRECT);
        return;
      }

      throw error;
    }
  }, [session]);

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
