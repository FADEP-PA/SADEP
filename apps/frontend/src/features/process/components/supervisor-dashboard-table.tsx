'use client';

import { EmptyState } from '@/shared/ui/operational-states';
import { StatusBadge, type StatusBadgeTone } from '@/shared/ui/status-badge';

import type {
  PreviousEvaluationItem,
  SupervisorDashboardRow,
  SupervisorDashboardStatus,
} from './supervisor-evaluation-types';

const STATUS_FILTERS: Array<{ id: SupervisorDashboardStatus; label: string }> = [
  { id: 'EM_AVALIACAO', label: 'Avaliação pendente' },
  { id: 'AGUARDANDO_ASSINATURA', label: 'Aguardando confirmação' },
  { id: 'EM_ANALISE_CESAD', label: 'Em análise pela CESAD' },
  { id: 'CONCLUIDO', label: 'Concluído' },
];

function getStatusPresentation(row: SupervisorDashboardRow): { label: string; tone: StatusBadgeTone } {
  if (row.status === 'EM_AVALIACAO') return { label: 'Avaliação pendente', tone: 'warning' };
  if (row.status === 'AGUARDANDO_ASSINATURA') {
    return row.actionLabel === 'Confirmar autoavaliação'
      ? { label: 'Confirmar autoavaliação', tone: 'warning' }
      : { label: 'Aguardando servidor', tone: 'info' };
  }
  if (row.status === 'EM_ANALISE_CESAD') return { label: 'Em análise pela CESAD', tone: 'info' };
  return { label: 'Concluído', tone: 'success' };
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
  onClosePreviousEvaluations,
}: SupervisorDashboardTableProps) {
  return (
    <div className="task-list">
      <div className="task-list__toolbar">
        <strong>Servidores</strong>
        <button type="button" className="ghost-button task-list__filter-button" aria-expanded={isFilterPanelOpen} aria-controls="supervisor-status-filters" onClick={onToggleFilterPanel}>
          Filtrar
        </button>
        {isFilterPanelOpen ? (
          <div id="supervisor-status-filters" className="task-list__filters">
            {STATUS_FILTERS.map((filter) => (
              <label key={filter.id}>
                <input type="checkbox" checked={selectedFilters.includes(filter.id)} onChange={() => onToggleFilter(filter.id)} />
                <span>{filter.label}</span>
              </label>
            ))}
          </div>
        ) : null}
      </div>

      {filteredRows.length > 0 ? (
        <div className="task-table" role="table" aria-label="Avaliações sob responsabilidade da chefia">
          <div className="task-table__header" role="row">
            <span role="columnheader">Servidor</span><span role="columnheader">Etapa</span><span role="columnheader">Situação</span><span role="columnheader">Ação</span>
          </div>
          {filteredRows.map((row) => {
            const status = getStatusPresentation(row);
            return (
              <div className="task-table__row" role="row" key={row.id}>
                <div role="cell" className="task-table__person"><strong>{row.serverName}</strong></div>
                <div role="cell" data-label="Etapa">{row.stageLabel}</div>
                <div role="cell" data-label="Situação"><StatusBadge label={status.label} tone={status.tone} /></div>
                <div role="cell" className="task-table__action">
                  <button type="button" className={row.actionDisabled ? 'secondary-button' : undefined} disabled={row.actionDisabled} onClick={() => onOpenEvaluation(row)}>{row.actionLabel}</button>
                </div>
              </div>
            );
          })}
        </div>
      ) : <EmptyState title="Nenhuma avaliação encontrada" description="Altere os filtros para ver outras situações." />}

      {previousReviewRow ? (
        <div className="previous-evaluations-modal" role="dialog" aria-modal="true" aria-label="Avaliações anteriores">
          <button className="previous-evaluations-modal__backdrop" onClick={onClosePreviousEvaluations} aria-label="Fechar" />
          <div className="previous-evaluations-modal__content">
            <div className="previous-evaluations-modal__header">
              <div><h3>Avaliações anteriores</h3><p>{previousReviewRow.serverName}</p></div>
              <button type="button" className="ghost-button" onClick={onClosePreviousEvaluations}>Fechar</button>
            </div>
            {previousEvaluationHistory.length > 0 ? (
              <ul className="plain-list">{previousEvaluationHistory.map((item) => <li key={item.stageLabel}><strong>{item.stageLabel}</strong><span>{item.statusLabel}</span></li>)}</ul>
            ) : <EmptyState title="Nenhuma avaliação anterior" description="Este servidor ainda não possui avaliações concluídas." />}
          </div>
        </div>
      ) : null}
    </div>
  );
}
