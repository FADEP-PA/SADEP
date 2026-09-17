import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginPage } from './login-page';

const signInMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock('@/shared/auth/auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

function setAuthContext(overrides: {
  status?: 'loading' | 'anonymous' | 'authenticated';
  bootstrapError?: string | null;
  signIn?: typeof signInMock;
}) {
  useAuthMock.mockReturnValue({
    status: 'anonymous',
    bootstrapError: null,
    signIn: signInMock,
    ...overrides,
  });
}

describe('LoginPage', () => {
  beforeEach(() => {
    signInMock.mockReset();
    setAuthContext({});
  });

  it('renderiza campos de email, senha, checkbox e botao de submit', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText('E-mail')).toBeTruthy();
    expect(screen.getByLabelText('Senha')).toBeTruthy();
    expect(screen.getByLabelText('Manter sessão')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeTruthy();
  });

  it('chama signIn com email, password e rememberMe ao submeter', async () => {
    signInMock.mockResolvedValueOnce(undefined);
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'user@test.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha123' } });

    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: 'Entrar' }).closest('form')!);
    });

    expect(signInMock).toHaveBeenCalledWith({
      email: 'user@test.com',
      password: 'senha123',
      rememberMe: true,
    });
  });

  it('exibe "Entrando..." e desabilita o botao durante a submissao', async () => {
    let resolveSignIn!: () => void;
    signInMock.mockReturnValueOnce(new Promise<void>((res) => { resolveSignIn = res; }));
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: '123' } });

    act(() => {
      fireEvent.submit(screen.getByRole('button', { name: 'Entrar' }).closest('form')!);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Entrando...' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Entrando...' })).toBeDisabled();
    });

    await act(async () => { resolveSignIn(); });
  });

  it('exibe mensagem de erro quando signIn rejeita', async () => {
    signInMock.mockRejectedValueOnce(new Error('Credenciais invalidas'));
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'errada' } });

    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: 'Entrar' }).closest('form')!);
    });

    expect(screen.getByText('Credenciais invalidas')).toBeTruthy();
  });

  it('exibe bootstrapError quando nao ha errorMessage proprio', () => {
    setAuthContext({ bootstrapError: 'Sessão expirada. Faça login novamente.' });
    render(<LoginPage />);

    expect(screen.getByText('Sessão expirada. Faça login novamente.')).toBeTruthy();
  });

  it('desabilita campos quando status e loading', () => {
    setAuthContext({ status: 'loading' });
    render(<LoginPage />);

    expect(screen.getByLabelText('E-mail')).toBeDisabled();
    expect(screen.getByLabelText('Senha')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeDisabled();
  });
});
