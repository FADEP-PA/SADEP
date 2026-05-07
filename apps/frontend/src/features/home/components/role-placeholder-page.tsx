'use client';

import Link from 'next/link';
import type { UserRole } from '@sadep/contracts';

import { AuthGuard } from '@/shared/auth/auth-guard';
import { useAuth } from '@/shared/auth/auth-context';
import { canAccessProcessWorkspace, getRolePresentation } from '@/shared/rbac/role-catalog';
import { InfoCard } from '@/shared/ui/info-card';
import { KeyValueList } from '@/shared/ui/key-value-list';
import { PageSection } from '@/shared/ui/page-section';

type RolePlaceholderPageProps = {
  allowedRoles: UserRole[];
  title: string;
  description: string;
  highlights: string[];
};

export function RolePlaceholderPage({
  allowedRoles,
  title,
  description,
  highlights,
}: RolePlaceholderPageProps) {
  const { session } = useAuth();
  const activeRole = session?.user.role;
  const rolePresentation = activeRole ? getRolePresentation(activeRole) : null;
  const processWorkspaceAvailable = activeRole
    ? canAccessProcessWorkspace(activeRole)
    : false;
  const highlightDescriptions = [
    'Área preparada para cards, filtros e acompanhamentos operacionais sem perder a clareza institucional.',
    'Base pronta para receber leitura documental, status decisório e trilha auditável do módulo.',
    'Estrutura visual alinhada ao shell do portal para crescimento seguro das próximas entregas.',
  ];

  return (
    <AuthGuard allowedRoles={allowedRoles}>
      <section className="portal-dashboard">
        <PageSection eyebrow="Área do perfil" title={title} description={description}>
          <div className="workspace-overview workspace-overview--accent">
            <div className="workspace-overview__copy">
              <span className="section-chip">Área em consolidação</span>
              <h3>{rolePresentation?.label ?? 'Perfil não identificado'}</h3>
              <p>
                Esta área já segue a linguagem visual do portal e fica pronta para receber os
                próximos fluxos funcionais sem perder consistência com o restante do frontend.
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
                  { label: 'usuário', value: session?.user.name ?? 'Não informado' },
                  { label: 'email', value: session?.user.email ?? 'Não informado' },
                  { label: 'perfil', value: rolePresentation?.label ?? 'Não informado' },
                  { label: 'rota principal', value: rolePresentation?.homePath ?? 'Não informada' },
                ]}
              />

              <div className="workspace-stat-grid">
                <div className="workspace-stat">
                  <span>frentes em foco</span>
                  <strong>{highlights.length}</strong>
                </div>
                <div className="workspace-stat">
                  <span>navegação</span>
                  <strong>Portal integrado</strong>
                </div>
                <div className="workspace-stat">
                  <span>status visual</span>
                  <strong>Base consolidada</strong>
                </div>
              </div>
            </aside>
          </div>

          <div className="metrics-grid">
            {highlights.map((item, index) => (
              <InfoCard
                key={item}
                eyebrow="Módulo"
                title={item}
                description={
                  highlightDescriptions[index] ??
                  'Bloco visual preparado para consulta, leitura e acompanhamento operacional.'
                }
              />
            ))}
          </div>

          <div className="portal-callout">
            <div className="portal-callout__copy">
              <span className="section-chip">Próxima etapa</span>
              <h2>Estrutura pronta para crescimento funcional</h2>
              <p>
                O layout deste perfil acompanha a mesma hierarquia, tipografia e ritmo do portal,
                deixando o módulo pronto para ganhar funcionalidade real sem precisar refazer a base visual.
              </p>
            </div>

            <div className="portal-callout__panel">
              <KeyValueList
                items={[
                  { label: 'perfil curto', value: rolePresentation?.shortLabel ?? 'Não informado' },
                  { label: 'descrição', value: rolePresentation?.description ?? 'Não informada' },
                  { label: 'área inicial', value: rolePresentation?.homePath ?? 'Não informada' },
                ]}
              />
              <ul className="content-list">
                <li>Tipografia e hierarquia alinhadas ao shell institucional.</li>
                <li>Cards preparados para indicadores, filas e alertas do perfil.</li>
                <li>Espaço pronto para evoluir sem quebrar a coerência entre rotas.</li>
              </ul>
            </div>
          </div>
        </PageSection>
      </section>
    </AuthGuard>
  );
}
