'use client';

import { AuthGuard } from '@/shared/auth/auth-guard';
import { useAuth } from '@/shared/auth/auth-context';
import { getRolePresentation } from '@/shared/rbac/role-catalog';
import { FeedbackAlert } from '@/shared/ui/feedback-alert';
import { InfoCard } from '@/shared/ui/info-card';
import { KeyValueList } from '@/shared/ui/key-value-list';
import { PageSection } from '@/shared/ui/page-section';

const integrationPoints = [
  {
    title: 'Retorno de /auth/login',
    items: ['accessToken: string', 'user.sub: string', 'user.email: string', 'user.role: UserRole'],
  },
  {
    title: 'Retorno de /auth/me',
    items: ['sub: string', 'email: string', 'role: UserRole'],
  },
  {
    title: 'Erros de autenticacao',
    items: [
      '401 para credenciais invalidas, token invalido ou token expirado.',
      'Mensagens tratadas pelo frontend com payload padrao de erro.',
    ],
  },
  {
    title: 'Persistencia local',
    items: [
      'localStorage quando rememberMe estiver ativo.',
      'sessionStorage quando a sessao for apenas da aba.',
      'Revalidacao obrigatoria em /auth/me no bootstrap da app.',
    ],
  },
];

export default function AuthenticatedProfilePage() {
  const { session, status, bootstrapError } = useAuth();
  const rolePresentation = session ? getRolePresentation(session.user.role) : null;

  return (
    <AuthGuard>
      <PageSection
        eyebrow="Usuario autenticado"
        title="Perfil da sessao atual"
        description="Resumo da identidade autenticada, do perfil catalogado e dos pontos principais da integracao de autenticacao."
      >
        <div className="portal-hero portal-hero--compact">
          <div className="portal-hero__copy">
            <span className="section-chip">Sessao ativa</span>
            <h2>{rolePresentation?.label ?? 'Perfil nao identificado'}</h2>
            <p>
              O novo shell institucional deixa o contexto de autenticacao mais visivel e ajuda a
              diagnosticar rapidamente bootstrap, sessao e permissao.
            </p>
          </div>

          <aside className="portal-hero__visual">
            <KeyValueList
              items={[
                { label: 'status', value: status },
                { label: 'email', value: session?.user.email ?? 'Nao informado' },
                { label: 'role', value: session?.user.role ?? 'Nao informado' },
                { label: 'rememberMe', value: session?.rememberMe ? 'true' : 'false' },
              ]}
            />
          </aside>
        </div>

        <div className="metrics-grid">
          <InfoCard
            eyebrow="Payload"
            title="Dados atuais da sessao"
            description="Campos usados pelo frontend para identificar o usuario autenticado."
          >
            <KeyValueList
              items={[
                { label: 'sub', value: session?.user.sub ?? 'Nao informado' },
                { label: 'email', value: session?.user.email ?? 'Nao informado' },
                { label: 'role', value: session?.user.role ?? 'Nao informado' },
                { label: 'rememberMe', value: session?.rememberMe ? 'true' : 'false' },
              ]}
            />
          </InfoCard>

          <InfoCard
            eyebrow="Catalogo"
            title="Apresentacao do perfil"
            description="Referencia institucional usada para rotas iniciais, descricao e rotulagem visual."
          >
            <KeyValueList
              items={[
                { label: 'label', value: rolePresentation?.label ?? 'Nao informado' },
                { label: 'atalho', value: rolePresentation?.shortLabel ?? 'Nao informado' },
                { label: 'homePath', value: rolePresentation?.homePath ?? 'Nao informado' },
                { label: 'descricao', value: rolePresentation?.description ?? 'Nao informada' },
              ]}
            />
          </InfoCard>
        </div>

        <div className="metrics-grid">
          {integrationPoints.map((section) => (
            <InfoCard key={section.title} eyebrow="Integracao" title={section.title}>
              <ul className="content-list">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </InfoCard>
          ))}
        </div>

        {bootstrapError ? (
          <FeedbackAlert title="Ultimo aviso de autenticacao" tone="warning" description={bootstrapError} />
        ) : null}
      </PageSection>
    </AuthGuard>
  );
}
