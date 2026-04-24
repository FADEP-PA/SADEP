import { InfoCard } from '@/shared/ui/info-card';
import { KeyValueList } from '@/shared/ui/key-value-list';

import type { ProcessDashboardSnapshot } from '@/features/dashboard/types/process-dashboard-types';

import { formatDateTime } from './process-formatters';

type ProcessTechnicalDetailsCardProps = {
  snapshot: ProcessDashboardSnapshot;
};

export function ProcessTechnicalDetailsCard({ snapshot }: ProcessTechnicalDetailsCardProps) {
  return (
    <InfoCard
      eyebrow="Dados operacionais"
      title="Informacoes complementares do processo"
      description="Resumo auxiliar para conferencia do processo consultado e da disponibilidade de dados para o perfil autenticado."
    >
      <KeyValueList
        items={[
          { label: 'Eventos no historico', value: snapshot.history.length },
          { label: 'Acoes recebidas', value: snapshot.workflow.availableActions.length },
          {
            label: 'Avaliacao da chefia',
            value: snapshot.supervisorEvaluation ? 'Disponivel para leitura' : 'Indisponivel para este perfil',
          },
          {
            label: 'Ultima atualizacao conhecida',
            value: snapshot.supervisorEvaluation
              ? formatDateTime(snapshot.supervisorEvaluation.updatedAt)
              : formatDateTime(snapshot.history[snapshot.history.length - 1]?.occurredAt),
          },
          {
            label: 'Restricao por perfil',
            value: snapshot.supervisorEvaluationWarning ? 'Sim' : 'Nao identificada',
          },
        ]}
      />
    </InfoCard>
  );
}
