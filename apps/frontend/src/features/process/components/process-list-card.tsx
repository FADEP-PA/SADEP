import { InfoCard } from '@/shared/ui/info-card';
import { EmptyState } from '@/shared/ui/operational-states';
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
      title="Processos carregados nesta sessão"
      description="Cada item destaca status macro do workflow, etapa atual e a principal ação disponível para orientar a próxima movimentação."
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
                    Etapa atual: {formatProcessStatus(item.currentStage)}. Próxima ação:{' '}
                    {formatProcessAction(item.primaryAction ?? undefined)}.
                  </p>
                </div>

                <StatusBadge
                  label={formatProcessStatus(item.status)}
                  tone={getProcessStatusTone(item.status)}
                />
              </div>

              <div className="process-list-card__facts">
                <span>{item.availableActionsCount} ações liberadas</span>
                <span>{item.historyCount} eventos auditáveis</span>
                <span>Última leitura {formatDateTime(item.lastViewedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nenhum processo carregado"
          description="Informe um identificador válido para iniciar a lista de processos consultados nesta sessão."
        />
      )}
    </InfoCard>
  );
}
