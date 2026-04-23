'use client';

import Link from 'next/link';

import { useAuth } from '@/shared/auth/auth-context';
import { getRolePresentation } from '@/shared/rbac/role-catalog';
import { InfoCard } from '@/shared/ui/info-card';
import { KeyValueList } from '@/shared/ui/key-value-list';

const overviewCards = [
  {
    title: 'Consulta de processos',
    description: 'Painel tecnico e institucional para ler workflow, bloqueios, acoes e historico do processo.',
  },
  {
    title: 'Workspaces por perfil',
    description: 'Cada papel institucional opera em uma tela propria, com linguagem visual unificada.',
  },
  {
    title: 'Rastreabilidade processual',
    description: 'Cards, estados e alertas priorizam leitura clara sem deslocar regra de negocio para a interface.',
  },
];

const governanceHighlights = [
  'Contratos tipados e regras processuais vindas do backend.',
  'Separacao de navegacao, leitura e operacao por perfil.',
  'Base visual pronta para crescimento das etapas, pareceres e homologacao.',
];

export default function TechnicalHomePage() {
  const { session } = useAuth();
  const rolePresentation = session ? getRolePresentation(session.user.role) : null;

  return (
    <section className="portal-dashboard">
      <div className="portal-hero">
        <article className="portal-hero__copy">
          <span className="section-chip">Portal central</span>
          <h2>Uma entrada unica para navegar pelas areas do AEP-PA</h2>
          <p>
            O ambiente autenticado foi reorganizado como um portal institucional: mais leve,
            mais claro e com foco em leitura processual, servicos por perfil e continuidade do
            frontend.
          </p>

          <div className="portal-hero__actions">
            <Link href="/processos" className="secondary-button portal-link-button">
              Abrir processos
            </Link>
            <Link href={rolePresentation?.homePath ?? '/perfil'} className="ghost-button portal-link-button">
              Ir para minha area
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
            <strong>{session?.user.email ?? 'Nao informado'}</strong>
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
          <h2>Encontre sua proxima acao sem se perder no fluxo</h2>
          <p>
            O design agora usa blocos institucionais maiores, tipografia de destaque e agrupamento
            claro de operacoes para reduzir friccao entre consulta, execucao e acompanhamento.
          </p>

          <div className="portal-spotlight__actions">
            <Link href="/processos" className="secondary-button portal-link-button">
              Consultar processo
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
            <p>Pontos centrais da operacao diaria disponiveis no frontend atual.</p>
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
          <span className="section-chip">Governanca visual</span>
          <h2>Base pronta para as proximas evolucoes do frontend</h2>
          <p>
            O shell, os cards e os estados visuais foram preparados para sustentar a expansao das
            jornadas da CESAD, da homologacao e das leituras por etapa sem perder unidade.
          </p>
        </div>

        <div className="portal-callout__panel">
          <KeyValueList
            items={[
              { label: 'usuario', value: session?.user.email ?? 'Nao informado' },
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
