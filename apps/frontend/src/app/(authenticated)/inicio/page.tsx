'use client';

import Link from 'next/link';

import { useAuth } from '@/shared/auth/auth-context';
import { canAccessProcessWorkspace, getRolePresentation } from '@/shared/rbac/role-catalog';
import { InfoCard } from '@/shared/ui/info-card';
import { KeyValueList } from '@/shared/ui/key-value-list';

const overviewCards = [
  {
    title: 'Consulta de processos',
    description: 'Leitura centralizada do andamento, dos bloqueios e das proximas referencias do processo.',
  },
  {
    title: 'Areas por perfil',
    description: 'Cada papel institucional opera em um workspace proprio, com linguagem visual unificada.',
  },
  {
    title: 'Rastreabilidade processual',
    description: 'Cards, estados e alertas reforcam leitura clara sem deslocar regra de negocio para a interface.',
  },
];

const governanceHighlights = [
  'Leitura institucional organizada por papel e momento do processo.',
  'Navegacao clara para consulta, acompanhamento e operacao por perfil.',
  'Base visual pronta para crescer com etapas, pareceres e homologacao.',
];

export default function TechnicalHomePage() {
  const { session } = useAuth();
  const rolePresentation = session ? getRolePresentation(session.user.role) : null;
  const processWorkspaceAvailable = session
    ? canAccessProcessWorkspace(session.user.role)
    : false;
  const primaryLinkHref = processWorkspaceAvailable
    ? '/processos'
    : rolePresentation?.homePath ?? '/perfil';
  const primaryLinkLabel = processWorkspaceAvailable
    ? 'Abrir processos'
    : 'Ir para minha area';
  const secondaryLinkHref = processWorkspaceAvailable
    ? rolePresentation?.homePath ?? '/perfil'
    : '/perfil';
  const secondaryLinkLabel = processWorkspaceAvailable
    ? 'Ir para minha area'
    : 'Ver sessao';

  return (
    <section className="portal-dashboard">
      <div className="portal-hero">
        <article className="portal-hero__copy">
          <span className="section-chip">Portal central</span>
          <h2>Um ambiente unico para acompanhar o AEP-PA com clareza</h2>
          <p>
            O ambiente autenticado foi reorganizado como um portal institucional mais claro,
            com foco em leitura processual, servicos por perfil e continuidade segura do frontend.
          </p>

          <div className="portal-hero__actions">
            <Link href={primaryLinkHref} className="secondary-button portal-link-button">
              {primaryLinkLabel}
            </Link>
            <Link href={secondaryLinkHref} className="ghost-button portal-link-button">
              {secondaryLinkLabel}
            </Link>
          </div>
        </article>

        <aside className="portal-hero__visual">
          <div className="portal-stat-card">
            <span>Perfil ativo</span>
            <strong>{rolePresentation?.label ?? 'Nao identificado'}</strong>
          </div>
          <div className="portal-stat-card">
            <span>Usuario autenticado</span>
            <strong>{session?.user.name ?? 'Nao informado'}</strong>
          </div>
          <div className="portal-stat-card">
            <span>Area inicial</span>
            <strong>{rolePresentation?.homePath ?? '/inicio'}</strong>
          </div>
        </aside>
      </div>

      <section className="portal-spotlight">
        <div className="portal-spotlight__media">
          <div className="portal-spotlight__image portal-spotlight__image--workflow" />
        </div>

        <div className="portal-spotlight__content">
          <span className="section-chip">Leitura orientada</span>
          <h2>Encontre sua proxima referencia sem se perder no fluxo</h2>
          <p>
            O desenho prioriza blocos institucionais maiores, agrupamento claro de informacoes e
            uma hierarquia visual que reduz a friccao entre consulta, execucao e acompanhamento.
          </p>

          <div className="portal-spotlight__actions">
            <Link href={primaryLinkHref} className="secondary-button portal-link-button">
              {processWorkspaceAvailable ? 'Consultar processo' : primaryLinkLabel}
            </Link>
            <Link href="/perfil" className="ghost-button portal-link-button">
              Ver sessao
            </Link>
          </div>
        </div>
      </section>

      <section className="page-section">
        <header className="page-section__header">
          <span className="section-chip">Destaques</span>
          <div>
            <h2>Areas em destaque</h2>
            <p>Pontos centrais da operacao diaria que ja estao organizados no frontend atual.</p>
          </div>
        </header>

        <div className="metrics-grid">
          {overviewCards.map((card) => (
            <InfoCard key={card.title} eyebrow="Servico" title={card.title} description={card.description} />
          ))}
        </div>
      </section>

      <section className="portal-callout">
        <div className="portal-callout__copy">
          <span className="section-chip">Continuidade</span>
          <h2>Base pronta para as proximas evolucoes do frontend</h2>
          <p>
            O shell, os cards e os estados visuais foram preparados para sustentar a expansao das
            jornadas por perfil sem perder unidade, legibilidade e previsibilidade.
          </p>
        </div>

        <div className="portal-callout__panel">
          <KeyValueList
            items={[
              { label: 'usuario', value: session?.user.name ?? 'Nao informado' },
              { label: 'email', value: session?.user.email ?? 'Nao informado' },
              { label: 'perfil', value: rolePresentation?.label ?? 'Nao informado' },
              { label: 'home', value: rolePresentation?.homePath ?? 'Nao informada' },
            ]}
          />
          <ul className="content-list">
            {governanceHighlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>
    </section>
  );
}
