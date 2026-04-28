import { ContentState } from '@/shared/ui/content-state';
import { InfoCard } from '@/shared/ui/info-card';
import { StatusBadge } from '@/shared/ui/status-badge';

import type { ProcessDashboardListItem } from '@/features/dashboard/types/process-dashboard-types';

import {
  formatDateTime,
  formatProcessAction,
  formatProcessStatus,
  getProcessStatusTone,
} from './process-formatters';

type ProcessListCardProps = {
  items: ProcessDashboardListItem[];
  activeProcessId: string | null;
};

export function ProcessListCard({ items, activeProcessId }: ProcessListCardProps) {
  return (
    <InfoCard
      eyebrow="Listagem de processos"
      title="Processos carregados nesta sessao"
      description="Cada item destaca status macro do workflow, etapa atual e a principal acao disponivel para orientar a proxima movimentacao."
    >
      {items.length > 0 ? (
        <div className="process-list-card">
          {items.map((item) => (
            <div key={item.id} className="process-list-card__item">
              <div className="process-list-card__heading">
                <div>
                  <strong>
                    {item.id}
                    {item.id === activeProcessId ? ' - em foco' : ''}
                  </strong>
                  <p>
                    Etapa atual: {formatProcessStatus(item.currentStage)}. Proxima acao:{' '}
                    {formatProcessAction(item.primaryAction ?? undefined)}.
                  </p>
                </div>

                <StatusBadge
                  label={formatProcessStatus(item.status)}
                  tone={getProcessStatusTone(item.status)}
                />
              </div>

              <div className="process-list-card__facts">
                <span>{item.availableActionsCount} acoes liberadas</span>
                <span>{item.historyCount} eventos auditaveis</span>
                <span>Ultima leitura {formatDateTime(item.lastViewedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ContentState
          title="Nenhum processo carregado"
          description="Informe um identificador valido para iniciar a lista de processos consultados nesta sessao."
          tone="info"
        />
      )}
    </InfoCard>
  );
}
