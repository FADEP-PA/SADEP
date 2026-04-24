import { StatusBadge } from '@/shared/ui/status-badge';
import { InfoCard } from '@/shared/ui/info-card';
import { KeyValueList } from '@/shared/ui/key-value-list';

import type { ProcessDashboardSnapshot } from '@/features/dashboard/types/process-dashboard-types';

import { formatProcessStatus, getProcessStatusTone } from './process-formatters';

type ProcessStatusCardProps = {
  snapshot: ProcessDashboardSnapshot;
};

export function ProcessStatusCard({ snapshot }: ProcessStatusCardProps) {
  return (
    <InfoCard
      eyebrow="Status do processo"
      title="Situacao atual"
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
                tone={getProcessStatusTone(snapshot.workflow.status)}
              />
            ),
          },
          { label: 'Acoes disponiveis', value: snapshot.workflow.availableActions.length },
          { label: 'Eventos registrados', value: snapshot.history.length },
          {
            label: 'Modo da tela',
            value:
              snapshot.workflow.availableActions.length > 0
                ? 'Leitura com proximas acoes'
                : 'Leitura bloqueada para acoes',
          },
        ]}
      />
    </InfoCard>
  );
}
