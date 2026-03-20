'use client';

import { useState } from 'react';

import { getRequestErrorMessage } from '@/shared/api/http-error';
import { useAuth } from '@/shared/auth/auth-context';
import { AuthGuard } from '@/shared/auth/auth-guard';

export function ProfilePage() {
  const { session, refreshSession } = useAuth();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<'success' | 'warning'>('warning');

  async function handleRefreshSession() {
    setFeedback(null);
    setFeedbackTone('warning');

    try {
      await refreshSession();
      setFeedback('Sessão revalidada com sucesso via /auth/me.');
      setFeedbackTone('success');
    } catch (error) {
      setFeedback(getRequestErrorMessage(error, 'Não foi possível revalidar a sessão atual.'));
    }
  }

  return (
    <AuthGuard>
      <section className="technical-home" aria-labelledby="profile-page-title">
        <div className="technical-home__hero">
          <div>
            <span className="technical-home__badge">Perfil autenticado</span>
            <h2 id="profile-page-title">Dados técnicos da sessão do usuário</h2>
            <p>
              Página técnica para validar o payload do usuário autenticado retornado por
              `/auth/me` e a estratégia de sessão adotada no frontend.
            </p>
          </div>

          <div className="technical-home__panel">
            <strong>Identidade autenticada</strong>
            <ul>
              <li>sub: {session?.user.sub}</li>
              <li>email: {session?.user.email}</li>
              <li>role: {session?.user.role}</li>
              <li>persistência: {session?.rememberMe ? 'localStorage' : 'sessionStorage'}</li>
            </ul>
          </div>
        </div>

        <div className="technical-home__grid">
          <article className="technical-home__card">
            <h3>Payload do usuário autenticado</h3>
            <p>Estrutura atual: {`{ sub, email, role }`}.</p>
          </article>
          <article className="technical-home__card">
            <h3>Token no frontend</h3>
            <p>Enviado como bearer token no header Authorization e nunca exposto na UI.</p>
          </article>
          <article className="technical-home__card">
            <h3>Revalidação</h3>
            <p>Use o botão abaixo para forçar nova leitura de `/auth/me` com a sessão atual.</p>
          </article>
        </div>

        <section className="technical-home__checklist">
          <div>
            <span className="technical-home__section-label">Ação técnica</span>
            <h3>Revalidar sessão autenticada</h3>
          </div>

          <div className="technical-home__actions-row">
            <button type="button" className="technical-home__secondary-button" onClick={() => void handleRefreshSession()}>
              Atualizar dados via /auth/me
            </button>
          </div>

          {feedback ? <p className={`form-feedback ${feedbackTone === 'success' ? 'form-feedback--success' : 'form-feedback--warning'}`}>{feedback}</p> : null}
        </section>
      </section>
    </AuthGuard>
  );
}
