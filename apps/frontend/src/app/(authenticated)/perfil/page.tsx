'use client';

import Link from 'next/link';

import { AuthGuard } from '@/shared/auth/auth-guard';
import { useAuth } from '@/shared/auth/auth-context';
import { getRolePresentation } from '@/shared/rbac/role-catalog';
import { FeedbackAlert } from '@/shared/ui/feedback-alert';
import { PageSection } from '@/shared/ui/page-section';

function formatSessionStatus(status: string) {
  if (status === 'authenticated') {
    return 'Sessão ativa';
  }

  if (status === 'loading') {
    return 'Verificando sessão';
  }

  return 'Sessão encerrada';
}

export default function AuthenticatedProfilePage() {
  const { session, status, bootstrapError } = useAuth();
  const rolePresentation = session ? getRolePresentation(session.user.role) : null;

  return (
    <AuthGuard>
      <PageSection
        eyebrow="Meu perfil"
        title="Dados da minha conta"
        description="Confira as informações básicas do seu acesso ao sistema."
      >
        <section className="profile-details" aria-label="Detalhes simples da conta">
          <article className="profile-details__panel profile-details__panel--wide">
            <h3>Meu acesso</h3>
            <div className="profile-details__rows">
              <div className="profile-details__row">
                <span>Perfil no sistema</span>
                <strong>{rolePresentation?.label ?? 'Não informado'}</strong>
              </div>
              <div className="profile-details__row">
                <span>O que posso fazer</span>
                <strong>{rolePresentation?.description ?? 'Acessar as áreas liberadas para meu perfil.'}</strong>
              </div>
              <div className="profile-details__row">
                <span>Área principal</span>
                {rolePresentation?.homePath ? (
                  <Link href={rolePresentation.homePath}>Abrir minha área de trabalho</Link>
                ) : (
                  <strong>Não informada</strong>
                )}
              </div>
            </div>
          </article>

          <article className="profile-details__panel">
            <h3>Minha sessão</h3>
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
                    : 'Não vai manter meu acesso depois que eu sair.'}
                </strong>
              </div>
            </div>
          </article>
        </section>

        {bootstrapError ? (
          <FeedbackAlert title="Aviso sobre sua sessão" tone="warning" description={bootstrapError} />
        ) : null}
      </PageSection>
    </AuthGuard>
  );
}
