import { InfoCard } from '@/shared/ui/info-card';
import { TemporaryUnavailableState } from '@/shared/ui/operational-states';

import { formatProcessAction, formatProcessStatus } from './process-formatters';

type ProcessActionsCardProps = {
  actions: string[];
  status: string;
};

export function ProcessActionsCard({ actions, status }: ProcessActionsCardProps) {
  return (
    <InfoCard
      eyebrow="Ações disponíveis"
      title="Próximas operações permitidas"
      description="Lista calculada pelo backend conforme o estado atual do processo e o perfil autenticado."
    >
      {actions.length > 0 ? (
        <ul className="content-list">
          {actions.map((action) => (
            <li key={action}>{formatProcessAction(action)}</li>
          ))}
        </ul>
      ) : (
        <TemporaryUnavailableState
          title="Nenhuma ação liberada no momento"
          description={`O workflow não retornou ações para o perfil autenticado enquanto o processo está em ${formatProcessStatus(status)}.`}
        />
      )}
    </InfoCard>
  );
}
