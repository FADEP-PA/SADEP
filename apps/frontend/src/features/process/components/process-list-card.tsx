import { InfoCard } from '@/shared/ui/info-card';
import { StatusBadge } from '@/shared/ui/status-badge';

import type { ProcessDashboardSnapshot } from '@/features/dashboard/types/process-dashboard-types';

import { formatProcessStatus, getStatusTone } from './process-formatters';

type ProcessListCardProps = {
  snapshot: ProcessDashboardSnapshot | null;
};

export function ProcessListCard({ snapshot }: ProcessListCardProps) {
  return (
    <InfoCard
      eyebrow="Listagem de processos"
      title="Estrutura inicial da listagem"
      description="A listagem já está preparada para consolidar cards reais de processos conforme os endpoints evoluírem."
    >
      {snapshot ? (
        <div className="process-list-card__item">
          <div>
            <strong>{snapshot.workflow.id}</strong>
            <p>
              Processo consultado na sessão atual com leitura de estado, ações e histórico resumido.
            </p>
          </div>
          <StatusBadge
            label={formatProcessStatus(snapshot.workflow.status)}
            tone={getStatusTone(snapshot.workflow.status)}
          />
        </div>
      ) : (
        <div className="empty-state">
          <strong>Nenhum processo carregado.</strong>
          <p>Informe um identificador válido para popular a listagem inicial da Sprint 3B.</p>
        </div>
      )}
    </InfoCard>
  );
}
