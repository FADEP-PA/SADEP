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
    title: 'Identificacao da conta',
    items: ['Email autenticado da sessao atual.', 'Perfil institucional aplicado ao ambiente.', 'Identificador interno do usuario autenticado.'],
  },
  {
    title: 'Persistencia da sessao',
    items: ['Sessao longa quando a opcao de lembrar estiver ativa.', 'Sessao de aba quando o acesso nao deve persistir.', 'Revalidacao automatica da identidade ao abrir o app.'],
  },
  {
    title: 'Acesso e permissao',
    items: ['As rotas abertas dependem do perfil autenticado.', 'O portal preserva o escopo institucional de cada area.', 'Telas protegidas redirecionam quando o acesso nao e permitido.'],
  },
  {
    title: 'Seguranca operacional',
    items: ['A autenticacao expirada encerra o acesso protegido.', 'Falhas de sessao geram feedback claro ao usuario.', 'O frontend depende apenas dos dados liberados pelo backend.'],
  },
];

export default function AuthenticatedProfilePage() {
  const { session, status, bootstrapError } = useAuth();
  const rolePresentation = session ? getRolePresentation(session.user.role) : null;

  return (
    <AuthGuard>
      <PageSection
        eyebrow="Conta autenticada"
        title="Perfil e sessao atual"
        description="Resumo da identidade autenticada, do perfil institucional e do estado atual da sessao."
      >
        <div className="portal-hero portal-hero--compact">
          <div className="portal-hero__copy">
            <span className="section-chip">Sessao ativa</span>
            <h2>{rolePresentation?.label ?? 'Perfil nao identificado'}</h2>
            <p>
              Esta area concentra a leitura da conta autenticada e ajuda a confirmar rapidamente
              identidade, permissao de acesso e persistencia da sessao.
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
            eyebrow="Sessao"
            title="Dados atuais da conta"
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
            eyebrow="Perfil"
            title="Apresentacao institucional"
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
