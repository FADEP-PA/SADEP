'use client';

import Link from 'next/link';
import type { UserRole } from '@aep-pa/contracts';

import { AuthGuard } from '@/shared/auth/auth-guard';
import { useAuth } from '@/shared/auth/auth-context';
import { getRolePresentation } from '@/shared/rbac/role-catalog';
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
  const highlightDescriptions = [
    'Area preparada para cards, filtros e acompanhamentos operacionais sem perder a clareza institucional.',
    'Base pronta para receber leitura documental, status decisorio e trilha auditavel do modulo.',
    'Estrutura visual alinhada ao shell do portal para crescimento seguro das proximas entregas.',
  ];

  return (
    <AuthGuard allowedRoles={allowedRoles}>
      <section className="portal-dashboard">
        <PageSection eyebrow="Painel do perfil" title={title} description={description}>
          <div className="workspace-overview workspace-overview--accent">
            <div className="workspace-overview__copy">
              <span className="section-chip">Perfil autenticado</span>
              <h3>{rolePresentation?.label ?? 'Perfil nao identificado'}</h3>
              <p>
                Esta area ja entra no novo desenho institucional e fica pronta para receber os
                proximos blocos funcionais do frontend com a mesma linguagem visual do portal.
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
                  { label: 'email', value: session?.user.email ?? 'Nao informado' },
                  { label: 'perfil', value: rolePresentation?.label ?? 'Nao informado' },
                  { label: 'rota principal', value: rolePresentation?.homePath ?? 'Nao informada' },
                ]}
              />

              <div className="workspace-stat-grid">
                <div className="workspace-stat">
                  <span>modulos em foco</span>
                  <strong>{highlights.length}</strong>
                </div>
                <div className="workspace-stat">
                  <span>navegacao</span>
                  <strong>Portal unico</strong>
                </div>
                <div className="workspace-stat">
                  <span>status visual</span>
                  <strong>Pronto para evoluir</strong>
                </div>
              </div>
            </aside>
          </div>

          <div className="metrics-grid">
            {highlights.map((item, index) => (
              <InfoCard
                key={item}
                eyebrow="Modulo"
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
              <span className="section-chip">Pronto para continuidade</span>
              <h2>Estrutura visual alinhada ao restante do frontend</h2>
              <p>
                O layout deste perfil agora acompanha a mesma hierarquia, tipografia e ritmo do
                portal principal, deixando o modulo pronto para ganhar funcionalidade real sem
                precisar refazer a base visual.
              </p>
            </div>

            <div className="portal-callout__panel">
              <KeyValueList
                items={[
                  { label: 'perfil curto', value: rolePresentation?.shortLabel ?? 'Nao informado' },
                  { label: 'descricao', value: rolePresentation?.description ?? 'Nao informada' },
                  { label: 'area inicial', value: rolePresentation?.homePath ?? 'Nao informada' },
                ]}
              />
              <ul className="content-list">
                <li>Tipografia e proporcao visual alinhadas ao novo shell institucional.</li>
                <li>Cards preparados para indicadores, filas e alertas especificos do perfil.</li>
                <li>Espaco pronto para componentizacao sem perder coerencia entre as rotas.</li>
              </ul>
            </div>
          </div>
        </PageSection>
      </section>
    </AuthGuard>
  );
}
