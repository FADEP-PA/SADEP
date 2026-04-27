'use client';

import Link from 'next/link';
import { UserRole } from '@aep-pa/contracts';

import { AuthGuard } from '@/shared/auth/auth-guard';
import { useAuth } from '@/shared/auth/auth-context';
import { InfoCard } from '@/shared/ui/info-card';
import { KeyValueList } from '@/shared/ui/key-value-list';
import { PageSection } from '@/shared/ui/page-section';

const ADMIN_FOCUS_ITEMS = [
  {
    title: 'Acompanhamento operacional',
    description:
      'Consulta de processos e verificacao rapida dos fluxos ja disponiveis para perfis operacionais.',
  },
  {
    title: 'Perfis e acessos',
    description:
      'Referencia visual para acompanhar papeis institucionais enquanto o modulo administrativo dedicado nao e exposto pela API.',
  },
  {
    title: 'Saude da plataforma',
    description:
      'Atalhos para validar sessao, consultar areas funcionais e apoiar o suporte local durante o uso assistido.',
  },
];

export default function AdminPage() {
  const { session } = useAuth();

  return (
    <AuthGuard allowedRoles={[UserRole.ADMIN]}>
      <section className="portal-dashboard">
        <PageSection
          eyebrow="Administracao"
          title="Painel administrativo"
          description="Visao de apoio para administradores acompanharem rotas funcionais, sessao ativa e pontos de suporte do portal."
        >
          <div className="workspace-overview workspace-overview--accent">
            <div className="workspace-overview__copy">
              <span className="section-chip">Suporte institucional</span>
              <h3>Operacao administrativa do portal</h3>
              <p>
                Este painel concentra atalhos seguros para as areas ja disponiveis e organiza a
                leitura basica da sessao administrativa sem depender de inferencias no cliente.
              </p>

              <div className="portal-hero__actions">
                <Link href="/processos" className="secondary-button portal-link-button">
                  Consultar processos
                </Link>
                <Link href="/perfil" className="ghost-button portal-link-button">
                  Ver sessao
                </Link>
              </div>
            </div>

            <aside className="workspace-overview__panel">
              <KeyValueList
                items={[
                  { label: 'administrador', value: session?.user.name ?? 'Nao informado' },
                  { label: 'email', value: session?.user.email ?? 'Nao informado' },
                  { label: 'perfil ativo', value: 'Administrador' },
                  { label: 'area inicial', value: '/admin' },
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
              <InfoCard key={item.title} eyebrow="Administracao" title={item.title} description={item.description} />
            ))}
          </div>

          <div className="portal-callout">
            <div className="portal-callout__copy">
              <span className="section-chip">Proximas entregas</span>
              <h2>Base administrativa pronta para evoluir</h2>
              <p>
                A tela ja separa a experiencia administrativa do placeholder generico e preserva
                espaco para futuras filas, auditoria e gestao de usuarios quando os contratos de API
                estiverem definidos.
              </p>
            </div>

            <div className="portal-callout__panel">
              <KeyValueList
                items={[
                  { label: 'processos', value: 'consulta operacional existente' },
                  { label: 'sessao', value: 'dados autenticados do usuario' },
                  { label: 'gestao dedicada', value: 'aguardando API especifica' },
                ]}
              />
              <ul className="content-list">
                <li>Administradores acessam o resumo sem depender da tela generica de perfil.</li>
                <li>Atalhos apontam apenas para rotas ja existentes no frontend.</li>
                <li>O modulo permanece preparado para receber funcionalidades administrativas reais.</li>
              </ul>
            </div>
          </div>
        </PageSection>
      </section>
    </AuthGuard>
  );
}
