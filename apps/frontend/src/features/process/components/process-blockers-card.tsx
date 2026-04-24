import { InfoCard } from '@/shared/ui/info-card';
import { ContentState } from '@/shared/ui/content-state';

type ProcessBlockersCardProps = {
  blockers: string[];
};

export function ProcessBlockersCard({ blockers }: ProcessBlockersCardProps) {
  return (
    <InfoCard
      eyebrow="Bloqueios visuais"
      title="Leitura de impedimentos atuais"
      description="Sinalizacao operacional baseada apenas nos dados retornados pelo workflow, sem criar regras no frontend."
    >
      {blockers.length > 0 ? (
        <ul className="content-list content-list--stacked">
          {blockers.map((blocker) => (
            <li key={blocker}>{blocker}</li>
          ))}
        </ul>
      ) : (
        <ContentState
          title="Nenhum bloqueio visual identificado"
          description="O processo consultado retornou acoes, historico ou dados suficientes para a leitura inicial desta etapa."
          tone="success"
        />
      )}
    </InfoCard>
  );
}
