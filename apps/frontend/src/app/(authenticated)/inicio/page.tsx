'use client';

import { ProcessWorkspace } from '@/features/process/components/process-workspace';
import { useAuth } from '@/shared/auth/auth-context';
import { getRolePresentation } from '@/shared/rbac/role-catalog';
import { InfoCard } from '@/shared/ui/info-card';
import { KeyValueList } from '@/shared/ui/key-value-list';

const overviewCards = [
  {
    title: 'Leitura do estado processual',
    description: 'Consulta do status corrente, com apoio ao acompanhamento formal de cada etapa do fluxo.',
  },
  {
    title: 'Ações autorizadas',
    description: 'Exibição das operações permitidas ao perfil autenticado conforme o workflow vigente.',
  },
  {
    title: 'Rastreabilidade auditável',
    description: 'Visualização resumida das movimentações registradas para suporte operacional e validação.',
  },
];

const governanceHighlights = [
  'Regras de negócio centralizadas no backend.',
  'Consultas autenticadas com segregação por perfil.',
  'Base preparada para evolução das telas por etapa do processo.',
];

export default function TechnicalHomePage() {
  const { session } = useAuth();
  const rolePresentation = session ? getRolePresentation(session.user.role) : null;

  return (
    <section className="technical-home">
      <div className="technical-home__hero technical-home__hero--institutional">
        <article className="technical-home__hero-panel">
          <span className="technical-home__badge">Painel central</span>
          <h2>Central institucional de acompanhamento processual</h2>
          <p>
            O ambiente pós-login concentra a navegação interna do AEP-PA com uma apresentação mais
            formal, adequada ao contexto administrativo e preparada para expandir as etapas do fluxo.
          </p>

          <div className="technical-home__hero-highlights" aria-label="Pilares do ambiente autenticado">
            {governanceHighlights.map((item) => (
              <div key={item}>
                <strong>{item}</strong>
              </div>
            ))}
          </div>
        </article>

        <aside className="technical-home__panel technical-home__panel--institutional">
          <span className="technical-home__section-label">Sessão autenticada</span>
          <KeyValueList
            items={[
              { label: 'Usuário', value: session?.user.email ?? 'Não informado' },
              { label: 'Perfil', value: rolePresentation?.label ?? session?.user.role ?? 'Não informado' },
              { label: 'Área inicial', value: rolePresentation?.homePath ?? 'Não informada' },
            ]}
          />
          <p className="technical-home__paragraph">
            O ambiente respeita autenticação, RBAC inicial e integração direta com os endpoints do
            backend já disponíveis nesta etapa.
          </p>
        </aside>
      </div>

      <div className="metrics-grid">
        {overviewCards.map((card) => (
          <InfoCard key={card.title} eyebrow="Capacidade disponível" title={card.title} description={card.description} />
        ))}
      </div>

      <div className="technical-home__institutional-grid">
        <InfoCard
          eyebrow="Perfil em operação"
          title={rolePresentation?.label ?? 'Perfil não identificado'}
          description={rolePresentation?.description ?? 'A sessão atual não retornou um catálogo de perfil válido.'}
        >
          <p className="muted-paragraph">
            Esta home funciona como ponto de entrada do ambiente autenticado e organiza o acesso às
            telas por papel institucional.
          </p>
        </InfoCard>

        <InfoCard
          eyebrow="Escopo atual"
          title="Consultas e primeiras operações do processo"
          description="A interface já está preparada para leitura de estado, ações disponíveis, histórico resumido e evolução das áreas por perfil."
        >
          <ul className="content-list">
            <li>Workflow consultado em tempo real no backend.</li>
            <li>Histórico resumido para apoio à análise operacional.</li>
            <li>Base pronta para telas funcionais específicas por etapa.</li>
          </ul>
        </InfoCard>
      </div>

      <ProcessWorkspace />
    </section>
  );
}
