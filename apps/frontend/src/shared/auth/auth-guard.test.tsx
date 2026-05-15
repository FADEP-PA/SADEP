import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { UserRole } from '@sadep/contracts';

import { AuthGuard } from './auth-guard';
import type { AuthenticatedUser } from './auth-types';

const useAuthMock = vi.fn();
const usePathnameMock = vi.fn<() => string>();

vi.mock('./auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

type AuthContextShape = {
  session: { user: AuthenticatedUser; rememberMe: boolean } | null;
  status: 'loading' | 'authenticated' | 'anonymous';
  bootstrapError: string | null;
};

function setAuthContext(overrides: Partial<AuthContextShape> = {}) {
  useAuthMock.mockReturnValue({
    session: null,
    status: 'loading',
    bootstrapError: null,
    signIn: vi.fn(),
    signOut: vi.fn(),
    refreshSession: vi.fn(),
    ...overrides,
  });
}

function buildAuthenticatedUser(role: UserRole): AuthenticatedUser {
  return {
    sub: 'user-test-id',
    email: 'usuario.teste@sadep.local',
    name: 'Usuario Teste',
    role,
  };
}

describe('AuthGuard', () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue('/chefia-imediata');
  });

  afterEach(() => {
    cleanup();
    useAuthMock.mockReset();
    usePathnameMock.mockReset();
  });

  it('renders the institutional loading state while the session is being validated', () => {
    setAuthContext({ status: 'loading' });

    render(
      <AuthGuard>
        <p>conteudo protegido</p>
      </AuthGuard>,
    );

    expect(screen.getByText('Validando sua sessão e permissões...')).toBeTruthy();
    expect(screen.queryByText('conteudo protegido')).toBeNull();
  });

  it('renders the redirect-to-login state when the session is anonymous', () => {
    setAuthContext({ status: 'anonymous', session: null });

    render(
      <AuthGuard>
        <p>conteudo protegido</p>
      </AuthGuard>,
    );

    expect(screen.getByText('Redirecionando para o login...')).toBeTruthy();
    expect(screen.queryByText('conteudo protegido')).toBeNull();
  });

  it('renders the redirect-to-login state when status is authenticated but session is null', () => {
    setAuthContext({ status: 'authenticated', session: null });

    render(
      <AuthGuard>
        <p>conteudo protegido</p>
      </AuthGuard>,
    );

    expect(screen.getByText('Redirecionando para o login...')).toBeTruthy();
    expect(screen.queryByText('conteudo protegido')).toBeNull();
  });

  it('renders the children when authenticated and no allowedRoles restriction is provided', () => {
    setAuthContext({
      status: 'authenticated',
      session: { user: buildAuthenticatedUser(UserRole.INTERN_SERVER), rememberMe: true },
    });

    render(
      <AuthGuard>
        <p>conteudo protegido</p>
      </AuthGuard>,
    );

    expect(screen.getByText('conteudo protegido')).toBeTruthy();
  });

  it('renders the children when the authenticated role is included in allowedRoles', () => {
    setAuthContext({
      status: 'authenticated',
      session: { user: buildAuthenticatedUser(UserRole.IMMEDIATE_SUPERVISOR), rememberMe: false },
    });

    render(
      <AuthGuard allowedRoles={[UserRole.IMMEDIATE_SUPERVISOR, UserRole.ADMIN]}>
        <p>painel da chefia</p>
      </AuthGuard>,
    );

    expect(screen.getByText('painel da chefia')).toBeTruthy();
  });

  it('renders the access-blocked state with role, pathname and 403 link when the role is not allowed', () => {
    usePathnameMock.mockReturnValue('/cesad-comissao');
    setAuthContext({
      status: 'authenticated',
      session: { user: buildAuthenticatedUser(UserRole.INTERN_SERVER), rememberMe: true },
    });

    render(
      <AuthGuard allowedRoles={[UserRole.CESAD_MEMBER]}>
        <p>conteudo cesad</p>
      </AuthGuard>,
    );

    expect(screen.getByText('Seu perfil não pode acessar esta rota')).toBeTruthy();
    expect(
      screen.getByText(
        'O usuário autenticado está com o papel INTERN_SERVER e não possui permissão para abrir /cesad-comissao.',
      ),
    ).toBeTruthy();

    const fallbackLink = screen.getByRole('link', { name: 'Ir para a página 403' });
    expect(fallbackLink.getAttribute('href')).toBe('/403');
    expect(screen.queryByText('conteudo cesad')).toBeNull();
  });

  it('renders the bootstrap error inside the access-blocked state when the role is not allowed', () => {
    setAuthContext({
      status: 'authenticated',
      session: { user: buildAuthenticatedUser(UserRole.INTERN_SERVER), rememberMe: true },
      bootstrapError: 'Sua sessão expirou. Faça login novamente para continuar.',
    });

    render(
      <AuthGuard allowedRoles={[UserRole.HOMOLOGATION_AUTHORITY]}>
        <p>conteudo restrito</p>
      </AuthGuard>,
    );

    expect(screen.getByText('Seu perfil não pode acessar esta rota')).toBeTruthy();
    expect(
      screen.getByText('Sua sessão expirou. Faça login novamente para continuar.'),
    ).toBeTruthy();
  });
});
