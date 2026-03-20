import { StatusBadge } from '@/shared/ui/status-badge';
import { InfoCard } from '@/shared/ui/info-card';
import { KeyValueList } from '@/shared/ui/key-value-list';

import type { ProcessDashboardSnapshot } from '@/features/dashboard/types/process-dashboard-types';

import { formatProcessStatus, getStatusTone } from './process-formatters';

type ProcessStatusCardProps = {
  snapshot: ProcessDashboardSnapshot;
};

export function ProcessStatusCard({ snapshot }: ProcessStatusCardProps) {
  return (
    <InfoCard
      eyebrow="Status do processo"
      title="Situação atual"
      description="Leitura do estado atual do workflow com base no backend autenticado."
    >
      <KeyValueList
        items={[
          { label: 'Processo', value: snapshot.workflow.id },
          {
            label: 'Status atual',
            value: (
              <StatusBadge
                label={formatProcessStatus(snapshot.workflow.status)}
                tone={getStatusTone(snapshot.workflow.status)}
              />
            ),
          },
          { label: 'Ações disponíveis', value: snapshot.workflow.availableActions.length },
          { label: 'Eventos registrados', value: snapshot.history.length },
        ]}
      />
    </InfoCard>
  );
}
