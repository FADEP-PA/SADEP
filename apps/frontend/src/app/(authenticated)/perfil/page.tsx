'use client';

import Link from 'next/link';

import { AuthGuard } from '@/shared/auth/auth-guard';
import { useAuth } from '@/shared/auth/auth-context';
import { getRolePresentation } from '@/shared/rbac/role-catalog';
import { FeedbackAlert } from '@/shared/ui/feedback-alert';
import { PageSection } from '@/shared/ui/page-section';

function formatSessionStatus(status: string) {
  if (status === 'authenticated') {
    return 'Sessao ativa';
  }

  if (status === 'loading') {
    return 'Verificando sessao';
  }

  return 'Sessao encerrada';
}

export default function AuthenticatedProfilePage() {
  const { session, status, bootstrapError } = useAuth();
  const rolePresentation = session ? getRolePresentation(session.user.role) : null;

  return (
    <AuthGuard>
      <PageSection
        eyebrow="Meu perfil"
        title="Dados da minha conta"
        description="Confira as informacoes basicas do seu acesso ao sistema."
      >
        <section className="profile-summary" aria-labelledby="profile-summary-title">
          <div className="profile-summary__avatar" aria-hidden="true">
            {(session?.user.name?.[0] ?? 'U').toUpperCase()}
          </div>

          <div className="profile-summary__main">
            <span className="section-chip">Conta em uso</span>
            <h2 id="profile-summary-title">{session?.user.name ?? 'Usuario nao informado'}</h2>
            <p>{session?.user.email ?? 'E-mail nao informado'}</p>
          </div>

          <div className="profile-summary__status">
            <span>{formatSessionStatus(status)}</span>
          </div>
        </section>

        <section className="profile-details" aria-label="Detalhes simples da conta">
          <article className="profile-details__panel profile-details__panel--wide">
            <h3>Meu acesso</h3>
            <div className="profile-details__rows">
              <div className="profile-details__row">
                <span>Perfil no sistema</span>
                <strong>{rolePresentation?.label ?? 'Nao informado'}</strong>
              </div>
              <div className="profile-details__row">
                <span>O que posso fazer</span>
                <strong>{rolePresentation?.description ?? 'Acessar as areas liberadas para meu perfil.'}</strong>
              </div>
              <div className="profile-details__row">
                <span>Area principal</span>
                {rolePresentation?.homePath ? (
                  <Link href={rolePresentation.homePath}>Abrir minha area de trabalho</Link>
                ) : (
                  <strong>Nao informada</strong>
                )}
              </div>
            </div>
          </article>

          <article className="profile-details__panel">
            <h3>Minha sessao</h3>
            <div className="profile-details__rows">
              <div className="profile-details__row">
                <span>Situação</span>
                <strong>{formatSessionStatus(status)}</strong>
              </div>
              <div className="profile-details__row">
                <span>Este dispositivo</span>
                <strong>
                  {session?.rememberMe
                    ? 'Vai lembrar meu acesso neste navegador.'
                    : 'Nao vai manter meu acesso depois que eu sair.'}
                </strong>
              </div>
            </div>
          </article>
        </section>

        {bootstrapError ? (
          <FeedbackAlert title="Aviso sobre sua sessao" tone="warning" description={bootstrapError} />
        ) : null}
      </PageSection>
    </AuthGuard>
  );
}
