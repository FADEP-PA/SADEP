'use client';

import { EmptyState } from '@/shared/ui/operational-states';

import type {
  PreviousEvaluationItem,
  SupervisorDashboardRow,
  SupervisorDashboardStatus,
} from './supervisor-evaluation-types';

const STATUS_FILTERS: Array<{ id: SupervisorDashboardStatus; label: string }> = [
  { id: 'EM_AVALIACAO', label: 'Em avaliação' },
  { id: 'AGUARDANDO_ASSINATURA', label: 'Aguardando assinatura' },
  { id: 'EM_ANALISE_CESAD', label: 'Em análise CESAD' },
  { id: 'CONCLUIDO', label: 'Concluídos' },
];

function getStatusLabel(status: SupervisorDashboardStatus) {
  if (status === 'EM_AVALIACAO') return 'Em avaliação';
  if (status === 'AGUARDANDO_ASSINATURA') return 'Aguardando assinatura';
  if (status === 'EM_ANALISE_CESAD') return 'Em análise CESAD';
  return 'Homologado';
}

function getStatusClassName(status: SupervisorDashboardStatus) {
  if (status === 'EM_AVALIACAO') {
    return 'supervisor-dashboard__pill supervisor-dashboard__pill--neutral';
  }
  if (status === 'AGUARDANDO_ASSINATURA') {
    return 'supervisor-dashboard__pill supervisor-dashboard__pill--warning';
  }
  if (status === 'EM_ANALISE_CESAD') {
    return 'supervisor-dashboard__pill supervisor-dashboard__pill--info';
  }
  return 'supervisor-dashboard__pill supervisor-dashboard__pill--success';
}

function getStageClassName(status: SupervisorDashboardStatus) {
  if (status === 'CONCLUIDO') {
    return 'supervisor-dashboard__stage-chip supervisor-dashboard__stage-chip--done';
  }
  return 'supervisor-dashboard__stage-chip';
}

type SupervisorDashboardTableProps = {
  filteredRows: SupervisorDashboardRow[];
  selectedFilters: SupervisorDashboardStatus[];
  isFilterPanelOpen: boolean;
  previousReviewRow: SupervisorDashboardRow | null;
  previousEvaluationHistory: PreviousEvaluationItem[];
  onToggleFilterPanel: () => void;
  onToggleFilter: (id: SupervisorDashboardStatus) => void;
  onOpenEvaluation: (row: SupervisorDashboardRow) => void;
  onOpenPreviousEvaluations: (row: SupervisorDashboardRow) => void;
  onClosePreviousEvaluations: () => void;
};

export function SupervisorDashboardTable({
  filteredRows,
  selectedFilters,
  isFilterPanelOpen,
  previousReviewRow,
  previousEvaluationHistory,
  onToggleFilterPanel,
  onToggleFilter,
  onOpenEvaluation,
  onOpenPreviousEvaluations,
  onClosePreviousEvaluations,
}: SupervisorDashboardTableProps) {
  return (
    <div className="supervisor-dashboard">
      <section className="supervisor-dashboard__table-card">
        <div className="supervisor-dashboard__filters">
          <div className="supervisor-dashboard__filters-title">
            <button
              type="button"
              className="supervisor-dashboard__filters-trigger"
              aria-label="Abrir filtros por status"
              aria-expanded={isFilterPanelOpen}
              aria-controls="supervisor-status-filters"
              onClick={onToggleFilterPanel}
            >
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M4.5 6.5h15l-6 6.7v3.9l-3 1.7v-5.6l-6-6.7Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <span>Filtrar por status</span>
          </div>

          {isFilterPanelOpen ? (
            <div
              id="supervisor-status-filters"
              className="supervisor-dashboard__filter-popover"
              role="dialog"
              aria-label="Filtros por status da avaliação"
            >
              <div className="supervisor-dashboard__filter-popover-header">
                <strong>Status exibidos</strong>
                <span>
                  {selectedFilters.length} de {STATUS_FILTERS.length} ativos
                </span>
              </div>

              <div className="supervisor-dashboard__filter-options">
                {STATUS_FILTERS.map((filter) => (
                  <label key={filter.id} className="supervisor-dashboard__filter-option">
                    <input
                      type="checkbox"
                      checked={selectedFilters.includes(filter.id)}
                      onChange={() => onToggleFilter(filter.id)}
                    />
                    <span>{filter.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="supervisor-dashboard__table-header">
          <div>Servidor</div>
          <div>Matrícula</div>
          <div>Cargo</div>
          <div>Exercício</div>
          <div>Status</div>
          <div>Etapa atual</div>
          <div>Prazo limite</div>
          <div>Avaliações anteriores</div>
          <div>Ação</div>
        </div>

        <div className="supervisor-dashboard__rows">
          {filteredRows.length > 0 ? (
            filteredRows.map((row) => (
              <article
                key={row.id}
                className={
                  row.source === 'real'
                    ? 'supervisor-dashboard__row supervisor-dashboard__row--real'
                    : 'supervisor-dashboard__row'
                }
              >
                <div className="supervisor-dashboard__server" data-label="Servidor">
                  <strong>{row.serverName}</strong>
                  {row.source === 'real' ? <span>processo informado carregado</span> : null}
                </div>

                <div
                  className="supervisor-dashboard__cell supervisor-dashboard__registration"
                  data-label="Matrícula"
                >
                  {row.registration}
                </div>
                <div className="supervisor-dashboard__cell" data-label="Cargo">
                  {row.role}
                </div>
                <div className="supervisor-dashboard__cell" data-label="Exercício">
                  {row.exerciseStart}
                </div>
                <div className="supervisor-dashboard__cell" data-label="Status">
                  <span className={getStatusClassName(row.status)}>{getStatusLabel(row.status)}</span>
                </div>
                <div className="supervisor-dashboard__cell" data-label="Etapa atual">
                  <span className={getStageClassName(row.status)}>{row.stageLabel}</span>
                </div>
                <div className="supervisor-dashboard__cell" data-label="Prazo limite">
                  {row.deadline}
                </div>
                <div
                  className="supervisor-dashboard__cell supervisor-dashboard__cell--center"
                  data-label="Avaliações anteriores"
                >
                  {row.canReviewPrevious ? (
                    <button
                      type="button"
                      className="secondary-button supervisor-dashboard__ghost-action"
                      onClick={() => onOpenPreviousEvaluations(row)}
                    >
                      Visualizar
                    </button>
                  ) : (
                    <span className="supervisor-dashboard__empty-value">Nao aplicavel</span>
                  )}
                </div>
                <div
                  className="supervisor-dashboard__cell supervisor-dashboard__cell--end"
                  data-label="Ação"
                >
                  <button
                    type="button"
                    className={
                      row.actionDisabled
                        ? 'secondary-button supervisor-dashboard__primary-action supervisor-dashboard__primary-action--disabled'
                        : 'supervisor-dashboard__primary-action'
                    }
                    disabled={row.actionDisabled}
                    onClick={() => onOpenEvaluation(row)}
                  >
                    {row.actionLabel}
                  </button>
                </div>
              </article>
            ))
          ) : (
            <EmptyState
              title="Nenhum servidor encontrado nos filtros"
              description="Ajuste os filtros de status para voltar a exibir os registros disponiveis."
            />
          )}
        </div>
      </section>

      {previousReviewRow ? (
        <div className="previous-evaluations-modal">
          <div
            className="previous-evaluations-modal__backdrop"
            onClick={onClosePreviousEvaluations}
          />
          <div className="previous-evaluations-modal__content">
            <header className="previous-evaluations-modal__header">
              <h2>AVALIAÇÕES ANTERIORES DO SERVIDOR</h2>
              <p>
                {previousReviewRow.serverName} • Matrícula: {previousReviewRow.registration}
              </p>
            </header>

            <div className="previous-evaluations-modal__table">
              <div className="previous-evaluations-modal__row previous-evaluations-modal__row--header">
                <span>Etapa</span>
                <span>Data de conclusão</span>
                <span>Ação</span>
              </div>
              {previousEvaluationHistory.length > 0 ? (
                previousEvaluationHistory.map((historyItem) => (
                  <div key={historyItem.stageLabel} className="previous-evaluations-modal__row">
                    <div>
                      <strong>{historyItem.stageLabel}</strong>
                      <span>{historyItem.statusLabel.toLowerCase()}</span>
                    </div>
                    <span>{historyItem.conclusionDate}</span>
                    <button type="button" className="supervisor-dashboard__primary-action">
                      {historyItem.actionLabel}
                    </button>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="Nenhuma avaliacao anterior localizada"
                  description="Este registro nao possui historico anterior para exibicao no momento."
                />
              )}
            </div>

            <div className="previous-evaluations-modal__footer">
              <button
                type="button"
                className="supervisor-dashboard__primary-action"
                onClick={onClosePreviousEvaluations}
              >
                Fechar visualização
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
