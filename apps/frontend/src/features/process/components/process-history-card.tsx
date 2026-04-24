import { InfoCard } from '@/shared/ui/info-card';
import { KeyValueList } from '@/shared/ui/key-value-list';
import { InsufficientHistoryState } from '@/shared/ui/operational-states';

import type { WorkflowHistoryItem } from '@/features/dashboard/types/process-dashboard-types';

import { formatDateTime, formatProcessAction, formatRole, getLastHistoryEntry } from './process-formatters';

type ProcessHistoryCardProps = {
  history: WorkflowHistoryItem[];
};

export function ProcessHistoryCard({ history }: ProcessHistoryCardProps) {
  const lastEntry = getLastHistoryEntry(history);

  return (
    <InfoCard
      eyebrow="Historico resumido"
      title="Ultima movimentacao"
      description="Resumo da trilha auditavel retornada pelo processo consultado."
    >
      {lastEntry ? (
        <KeyValueList
          items={[
            { label: 'Acao', value: formatProcessAction(lastEntry.action) },
            { label: 'Perfil executor', value: formatRole(lastEntry.actorRole) },
            { label: 'Data e hora', value: formatDateTime(lastEntry.occurredAt) },
            { label: 'Comentario', value: lastEntry.comment ?? 'Sem comentario registrado' },
          ]}
        />
      ) : (
        <InsufficientHistoryState />
      )}
    </InfoCard>
  );
}
