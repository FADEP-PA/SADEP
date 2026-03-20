import { InfoCard } from '@/shared/ui/info-card';
import { StatusBadge } from '@/shared/ui/status-badge';
import { ContentState } from '@/shared/ui/content-state';

import type { ProcessDashboardListItem } from '@/features/dashboard/types/process-dashboard-types';

import { formatDateTime, formatProcessStatus, getStatusTone } from './process-formatters';

type ProcessListCardProps = {
  items: ProcessDashboardListItem[];
  activeProcessId: string | null;
};

export function ProcessListCard({ items, activeProcessId }: ProcessListCardProps) {
  return (
    <InfoCard
      eyebrow="Listagem de processos"
      title="Estrutura inicial da listagem"
      description="A listagem agora mantém os últimos processos consultados nesta sessão para apoiar navegação e conferência rápida."
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
                  {item.availableActionsCount} ações liberadas · {item.historyCount} eventos auditáveis · última leitura{' '}
                  {formatDateTime(item.lastViewedAt)}.
                </p>
              </div>
              <StatusBadge label={formatProcessStatus(item.status)} tone={getStatusTone(item.status)} />
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
