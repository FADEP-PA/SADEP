'use client';

import { useState } from 'react';

import { getRequestErrorMessage } from '@/shared/api/http-error';
import { useAuth } from '@/shared/auth/auth-context';

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
      setErrorMessage(getRequestErrorMessage(error, 'Nao foi possivel realizar o login.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-screen">
      <div className="login-screen__shell">
        <section className="login-screen__brand" aria-hidden="true">
          <p>Acesse o portal</p>
          <h1>AEP-PA</h1>
        </section>

        <section className="login-screen__card" aria-labelledby="login-title">
          <div className="login-screen__card-header">
            <p className="login-kicker">Login</p>
            <h2 id="login-title">Acesso ao AEP-PA</h2>
            <p className="login-screen__hint">Entre com suas credenciais.</p>
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
                <span>Manter sessao</span>
              </label>

              <span className="login-form__hint">Acesso restrito</span>
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
      </div>
    </main>
  );
}
