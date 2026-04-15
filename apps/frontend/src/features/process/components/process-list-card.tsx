import { InfoCard } from '@/shared/ui/info-card';
import { StatusBadge } from '@/shared/ui/status-badge';
import { ContentState } from '@/shared/ui/content-state';

import type { ProcessDashboardListItem } from '@/features/dashboard/types/process-dashboard-types';

import { formatDateTime, formatProcessAction, formatProcessStatus, getProcessStatusTone } from './process-formatters';

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
              <div>
                <strong>
                  {item.id}
                  {item.id === activeProcessId ? ' · em foco' : ''}
                </strong>
                <p>
                  Etapa atual: {formatProcessStatus(item.currentStage)} · Próxima ação: {formatProcessAction(item.primaryAction ?? undefined)}.
                </p>
                <p>
                  {item.availableActionsCount} ações liberadas · {item.historyCount} eventos auditáveis · última leitura {formatDateTime(item.lastViewedAt)}.
                </p>
              </div>
              <StatusBadge
                label={formatProcessStatus(item.status)}
                tone={getProcessStatusTone(item.status)}
              />
            </div>
          ))}
        </div>
      ) : (
        <ContentState
          title="Nenhum processo carregado"
          description="Informe um identificador válido para popular a listagem inicial da Sprint 3B."
          tone="info"
        />
      )}
    </InfoCard>
  );
}
