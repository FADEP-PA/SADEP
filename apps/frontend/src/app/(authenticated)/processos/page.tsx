'use client';

import { useAuth } from '@/shared/auth/auth-context';
import type { ApiListResponse, PlaceholderProcessModel } from '@/shared/api/api-contracts';
import { DashboardCard } from '@/shared/ui/dashboard-card';

const exampleListResponse: ApiListResponse<PlaceholderProcessModel> = {
  items: [
    {
      id: 'PROC-0001',
      title: 'Estágio probatório — servidor exemplo',
      status: 'EM_AVALIACAO',
      ownerName: 'Servidor Exemplo',
      currentStep: 'Aguardando preenchimento da etapa vigente',
    },
    {
      id: 'PROC-0002',
      title: 'Estágio probatório — fluxo técnico',
      status: 'EM_ANALISE_CESAD',
      ownerName: 'Outro Servidor',
      currentStep: 'Análise colegiada técnica',
    },
  ],
  meta: {
    total: 2,
    page: 1,
    pageSize: 10,
  },
};

const apiConventions = [
  'Listagem: `{ items: T[], meta: { total, page, pageSize } }`.',
  'Detalhe mínimo: `{ id, title, status, ownerName, currentStep }`.',
  'Erros: `{ message, error, statusCode }`.',
];

export default function ProcessesPlaceholderPage() {
  const { session } = useAuth();

  return (
    <section className="technical-home" aria-labelledby="processes-placeholder-title">
      <div className="technical-home__hero">
        <div>
          <span className="technical-home__badge">Pré-workflow</span>
          <h2 id="processes-placeholder-title">Processos técnicos iniciais</h2>
          <p>
            Esta página define os placeholders e os modelos mínimos que a UI exibirá antes da
            entrada do workflow real.
          </p>
        </div>

        <div className="technical-home__panel">
          <strong>Contexto da sessão</strong>
          <ul>
            <li>Usuário: {session?.user.email}</li>
            <li>Role: {session?.user.role}</li>
            <li>Lista exemplo baseada em contrato técnico de API.</li>
          </ul>
        </div>
      </div>

      <div className="technical-home__grid">
        <DashboardCard
          title="Modelo mínimo de listagem"
          description="Estrutura base esperada para coleções técnicas carregadas da API."
        >
          <ul className="technical-home__list">
            {apiConventions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </DashboardCard>

        <DashboardCard
          title="Labels e identificadores"
          description="A UI usa `id` como identificador técnico e `title` como label principal."
        >
          <ul className="technical-home__list">
            <li>Identificador primário: `id`.</li>
            <li>Label principal: `title`.</li>
            <li>Status visível: `status`.</li>
            <li>Responsável visível: `ownerName`.</li>
          </ul>
        </DashboardCard>

        <DashboardCard
          title="Placeholders antes do workflow real"
          description="As telas iniciais exibem lista técnica, status e próximos passos do processo."
        >
          <ul className="technical-home__list">
            <li>Listagem técnica de processos.</li>
            <li>Resumo do status atual.</li>
            <li>Passo corrente do fluxo.</li>
            <li>Área pronta para acoplamento do workflow depois.</li>
          </ul>
        </DashboardCard>
      </div>

      <section className="technical-home__checklist" aria-labelledby="process-sample-title">
        <div>
          <span className="technical-home__section-label">Exemplo renderizado</span>
          <h3 id="process-sample-title">Resposta exemplo de listagem</h3>
        </div>

        <div className="technical-home__table">
          {exampleListResponse.items.map((item) => (
            <article key={item.id} className="technical-home__table-row">
              <strong>{item.title}</strong>
              <span>{item.id}</span>
              <span>{item.status}</span>
              <span>{item.ownerName}</span>
              <small>{item.currentStep}</small>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
