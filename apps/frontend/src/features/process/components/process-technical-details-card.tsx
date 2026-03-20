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
      eyebrow="Detalhes técnicos"
      title="Dados complementares do processo"
      description="Informações auxiliares para suporte operacional e conferência da integração front-back."
    >
      <KeyValueList
        items={[
          { label: 'Eventos no histórico', value: snapshot.history.length },
          { label: 'Ações recebidas', value: snapshot.workflow.availableActions.length },
          {
            label: 'Avaliação da chefia',
            value: snapshot.supervisorEvaluation ? 'Disponível para leitura' : 'Indisponível para este perfil',
          },
          {
            label: 'Última atualização conhecida',
            value: snapshot.supervisorEvaluation
              ? formatDateTime(snapshot.supervisorEvaluation.updatedAt)
              : formatDateTime(snapshot.history[snapshot.history.length - 1]?.occurredAt),
          },
          {
            label: 'Integração parcial',
            value: snapshot.supervisorEvaluationWarning ? 'Sim, com restrição por perfil' : 'Não identificada',
          },
        ]}
      />
    </InfoCard>
  );
}
