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
      title="Situação atual"
      description="Leitura do estado atual do processo para o perfil autenticado."
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
          { label: 'Ações disponíveis', value: snapshot.workflow.availableActions.length },
          { label: 'Eventos registrados', value: snapshot.history.length },
          {
            label: 'Modo da tela',
            value:
              snapshot.workflow.availableActions.length > 0
                ? 'Leitura com próximas ações'
                : 'Leitura bloqueada para ações',
          },
        ]}
      />
    </InfoCard>
  );
}
