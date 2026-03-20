'use client';

import { useState } from 'react';

import { getRequestErrorMessage } from '@/shared/api/http-error';
import { useAuth } from '@/shared/auth/auth-context';

const highlights = [
  'Acesso rápido para servidores, chefias e comissões.',
  'Integração preparada com `/auth/login` e `/auth/me` do backend.',
  'Persistência de sessão simples e redirect pós-login conforme o `UserRole` autenticado.',
];

export function LoginPage() {
  const { signIn, status, bootstrapError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await signIn({
        email,
        password,
        rememberMe,
      });
    } catch (error) {
      setErrorMessage(getRequestErrorMessage(error, 'Não foi possível realizar o login.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-hero" aria-label="Apresentação do sistema">
        <span className="login-badge">AEP-PA</span>
        <h1>Portal de autenticação</h1>
        <p>
          Entre com seu e-mail institucional e senha para acessar os fluxos internos do
          sistema.
        </p>

        <ul className="login-highlights">
          {highlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="login-card" aria-labelledby="login-title">
        <div className="login-card__header">
          <p className="login-kicker">Bem-vindo</p>
          <h2 id="login-title">Faça seu login</h2>
          <p>Use as mesmas credenciais cadastradas no backend.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="field-group" htmlFor="email">
            <span>E-mail</span>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="nome@orgao.pa.gov.br"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSubmitting || status === 'loading'}
              required
            />
          </label>

          <label className="field-group" htmlFor="password">
            <span>Senha</span>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Digite sua senha"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isSubmitting || status === 'loading'}
              required
            />
          </label>

          <div className="login-form__meta">
            <label className="checkbox-field" htmlFor="remember-me">
              <input
                id="remember-me"
                name="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                disabled={isSubmitting || status === 'loading'}
              />
              <span>Manter sessão neste dispositivo</span>
            </label>

            <span className="login-form__hint">Ambiente técnico da Sprint 2B</span>
          </div>

          {errorMessage ? <p className="form-feedback form-feedback--error">{errorMessage}</p> : null}
          {!errorMessage && bootstrapError ? (
            <p className="form-feedback form-feedback--warning">{bootstrapError}</p>
          ) : null}

          <button type="submit" disabled={isSubmitting || status === 'loading'}>
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  );
}
