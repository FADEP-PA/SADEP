'use client';

import Link from 'next/link';
import { UserRole } from '@sadep/contracts';

import { AuthGuard } from '@/shared/auth/auth-guard';
import { useAuth } from '@/shared/auth/auth-context';
import { canAccessProcessWorkspace } from '@/shared/rbac/role-catalog';
import { InfoCard } from '@/shared/ui/info-card';
import { KeyValueList } from '@/shared/ui/key-value-list';
import { PageSection } from '@/shared/ui/page-section';

const ADMIN_FOCUS_ITEMS = [
  {
    title: 'Acompanhamento operacional',
    description:
      'Consulta de processos e verificação rápida dos fluxos já disponíveis para perfis operacionais.',
  },
  {
    title: 'Perfis e acessos',
    description:
      'Referência visual para acompanhar papéis institucionais enquanto o módulo administrativo dedicado não é exposto pela API.',
  },
  {
    title: 'Saúde da plataforma',
    description:
      'Atalhos para validar sessão, consultar áreas funcionais e apoiar o suporte local durante o uso assistido.',
  },
];

export default function AdminPage() {
  const { session } = useAuth();
  const processWorkspaceAvailable = session
    ? canAccessProcessWorkspace(session.user.role)
    : false;

  return (
    <AuthGuard allowedRoles={[UserRole.ADMIN]}>
      <section className="portal-dashboard">
        <PageSection
          eyebrow="Administração"
          title="Painel administrativo"
          description="Visão de apoio para administradores acompanharem rotas funcionais, sessão ativa e pontos de suporte do portal."
        >
          <div className="workspace-overview workspace-overview--accent">
            <div className="workspace-overview__copy">
              <span className="section-chip">Suporte institucional</span>
              <h3>Operação administrativa do portal</h3>
              <p>
                Este painel concentra atalhos seguros para as áreas já disponíveis e organiza a
                leitura básica da sessão administrativa sem depender de inferências no cliente.
              </p>

              <div className="portal-hero__actions">
                {processWorkspaceAvailable ? (
                  <Link href="/processos" className="secondary-button portal-link-button">
                    Consultar processos
                  </Link>
                ) : null}
                <Link href="/perfil" className="ghost-button portal-link-button">
                  Ver sessão
                </Link>
              </div>
            </div>

            <aside className="workspace-overview__panel">
              <KeyValueList
                items={[
                  { label: 'administrador', value: session?.user.name ?? 'Não informado' },
                  { label: 'email', value: session?.user.email ?? 'Não informado' },
                  { label: 'perfil ativo', value: 'Administrador' },
                  { label: 'área inicial', value: '/admin' },
                ]}
              />

              <div className="workspace-stat-grid">
                <div className="workspace-stat">
                  <span>rotas de apoio</span>
                  <strong>3</strong>
                </div>
                <div className="workspace-stat">
                  <span>escopo</span>
                  <strong>Leitura</strong>
                </div>
                <div className="workspace-stat">
                  <span>status</span>
                  <strong>Operacional</strong>
                </div>
              </div>
            </aside>
          </div>

          <div className="metrics-grid">
            {ADMIN_FOCUS_ITEMS.map((item) => (
              <InfoCard key={item.title} eyebrow="Administração" title={item.title} description={item.description} />
            ))}
          </div>

          <div className="portal-callout">
            <div className="portal-callout__copy">
              <span className="section-chip">Próximas entregas</span>
              <h2>Base administrativa pronta para evoluir</h2>
              <p>
                A tela ja separa a experiencia administrativa em um painel institucional e preserva
                espaço para futuras filas, auditoria e gestão de usuários quando os contratos de API
                estiverem definidos.
              </p>
            </div>

            <div className="portal-callout__panel">
              <KeyValueList
                items={[
                  { label: 'processos', value: 'consulta operacional existente' },
                  { label: 'sessão', value: 'dados autenticados do usuário' },
                  { label: 'gestão dedicada', value: 'aguardando API específica' },
                ]}
              />
              <ul className="content-list">
                <li>Administradores acessam o resumo sem depender da tela genérica de perfil.</li>
                <li>Atalhos apontam apenas para rotas já existentes no frontend.</li>
                <li>O módulo permanece preparado para receber funcionalidades administrativas reais.</li>
              </ul>
            </div>
          </div>
        </PageSection>
      </section>
    </AuthGuard>
  );
}
