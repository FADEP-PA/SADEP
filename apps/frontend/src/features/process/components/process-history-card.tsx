import { InfoCard } from '@/shared/ui/info-card';
import { InsufficientHistoryState } from '@/shared/ui/operational-states';

import type { WorkflowHistoryItem } from '@/features/dashboard/types/process-dashboard-types';

import { formatDateTime, formatProcessAction, formatRole } from './process-formatters';

type ProcessHistoryCardProps = {
  history: WorkflowHistoryItem[];
};

export function ProcessHistoryCard({ history }: ProcessHistoryCardProps) {
  const recentHistory = [...history].slice(-4).reverse();

  return (
    <InfoCard
      eyebrow="Historico resumido"
      title="Movimentacoes recentes"
      description="Ultimos eventos auditaveis retornados pelo processo consultado."
    >
      {recentHistory.length > 0 ? (
        <div className="history-list">
          {recentHistory.map((item) => (
            <article key={item.id} className="history-item">
              <div className="history-item__header">
                <strong>{formatProcessAction(item.action)}</strong>
                <span>{formatDateTime(item.occurredAt)}</span>
              </div>
              <p>{item.comment ?? 'Movimentacao registrada sem comentario adicional.'}</p>
              <div className="history-item__meta">
                <span>{formatRole(item.actorRole)}</span>
                <span>{item.eventType}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <InsufficientHistoryState />
      )}
    </InfoCard>
  );
}
