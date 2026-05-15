import { InfoCard } from '@/shared/ui/info-card';
import { ClearState } from '@/shared/ui/operational-states';

type ProcessBlockersCardProps = {
  blockers: string[];
};

export function ProcessBlockersCard({ blockers }: ProcessBlockersCardProps) {
  return (
    <InfoCard
      eyebrow="Bloqueios visuais"
      title="Leitura de impedimentos atuais"
      description="Sinalização operacional baseada apenas nos dados retornados pelo workflow, sem criar regras no frontend."
    >
      {blockers.length > 0 ? (
        <ul className="content-list content-list--stacked">
          {blockers.map((blocker) => (
            <li key={blocker}>{blocker}</li>
          ))}
        </ul>
      ) : (
        <ClearState
          title="Nenhum bloqueio visual identificado"
          description="O processo consultado retornou ações, histórico ou dados suficientes para a leitura inicial desta etapa."
        />
      )}
    </InfoCard>
  );
}
