import { InfoCard } from '@/shared/ui/info-card';

import { formatProcessAction } from './process-formatters';

type ProcessActionsCardProps = {
  actions: string[];
};

export function ProcessActionsCard({ actions }: ProcessActionsCardProps) {
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
        <p className="muted-paragraph">Nenhuma ação disponível para o perfil autenticado neste momento.</p>
      )}
    </InfoCard>
  );
}
