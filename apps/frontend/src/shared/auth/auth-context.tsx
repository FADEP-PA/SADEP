'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { HttpError } from '@/shared/api/http-error';

import { loginRequest, meRequest } from './auth-api';
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

const DEFAULT_AUTHENTICATED_REDIRECT = '/inicio';
const DEFAULT_PUBLIC_REDIRECT = '/';

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  const bootstrapSession = useCallback(async () => {
    const storedSession = readSession();

    if (!storedSession) {
      setSession(null);
      setStatus('anonymous');
      setBootstrapError(null);
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
    } catch (error) {
      clearSession();
      setSession(null);
      setStatus('anonymous');
      setBootstrapError(error instanceof Error ? error.message : 'Sessão inválida ou expirada.');
    }
  }, []);

  useEffect(() => {
    void bootstrapSession();
  }, [bootstrapSession]);

  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (status !== 'authenticated' && pathname !== '/' && pathname !== '/403') {
      router.replace(DEFAULT_PUBLIC_REDIRECT);
      return;
    }

    if (status === 'authenticated' && pathname === '/') {
      router.replace(DEFAULT_AUTHENTICATED_REDIRECT);
    }
  }, [pathname, router, status]);

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
      router.replace(DEFAULT_AUTHENTICATED_REDIRECT);
      router.refresh();
    },
    [router],
  );

  const signOut = useCallback(() => {
    clearSession();
    setSession(null);
    setStatus('anonymous');
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
    } catch (error) {
      if (error instanceof HttpError && error.status === 401) {
        signOut();
        return;
      }

      throw error;
    }
  }, [session, signOut]);

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
