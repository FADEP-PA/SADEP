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
    title: 'Formato do retorno de /auth/login',
    items: ['accessToken: string', 'user.sub: string', 'user.email: string', 'user.role: UserRole'],
  },
  {
    title: 'Formato do retorno de /auth/me',
    items: ['sub: string', 'email: string', 'role: UserRole'],
  },
  {
    title: 'Convenção de erro de autenticação',
    items: [
      '401 para credenciais inválidas, token inválido ou token expirado.',
      'Payload tratado pelo frontend via `message`, `error`, `statusCode`, `path` e `timestamp`.',
    ],
  },
  {
    title: 'Estratégia de token no frontend',
    items: [
      'Persistir em `localStorage` quando `rememberMe` estiver ativo.',
      'Persistir em `sessionStorage` quando a sessão for apenas da aba/janela.',
      'Revalidar o token em `/auth/me` ao iniciar a aplicação.',
    ],
  },
];

export default function AuthenticatedProfilePage() {
  const { session, status, bootstrapError } = useAuth();
  const rolePresentation = session ? getRolePresentation(session.user.role) : null;

  return (
    <AuthGuard>
      <PageSection
        eyebrow="Usuário autenticado"
        title="Perfil da sessão atual"
        description="Painel da sessão atual com dados do usuário autenticado, perfil de acesso e informações de autenticação."
      >
        <div className="metrics-grid">
          <InfoCard title="Payload atual" description="Dados utilizados para identificação da sessão autenticada.">
            <KeyValueList
              items={[
                { label: 'status', value: status },
                { label: 'sub', value: session?.user.sub ?? 'Não informado' },
                { label: 'email', value: session?.user.email ?? 'Não informado' },
                { label: 'role', value: session?.user.role ?? 'Não informado' },
                { label: 'rememberMe', value: session?.rememberMe ? 'true' : 'false' },
              ]}
            />
          </InfoCard>

          <InfoCard title="Perfil catalogado" description="Referência central para perfil, descrição institucional e rota inicial por papel.">
            <KeyValueList
              items={[
                { label: 'label', value: rolePresentation?.label ?? 'Não informado' },
                { label: 'atalho', value: rolePresentation?.shortLabel ?? 'Não informado' },
                { label: 'homePath', value: rolePresentation?.homePath ?? 'Não informado' },
                { label: 'descrição', value: rolePresentation?.description ?? 'Não informada' },
              ]}
            />
          </InfoCard>
        </div>

        <div className="metrics-grid">
          {integrationPoints.map((section) => (
            <InfoCard key={section.title} title={section.title}>
              <ul className="content-list">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </InfoCard>
          ))}
        </div>

        {bootstrapError ? (
          <FeedbackAlert title="Último aviso de autenticação" tone="warning" description={bootstrapError} />
        ) : null}
      </PageSection>
    </AuthGuard>
  );
}
