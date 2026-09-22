import { CesadStageOpinionStatus, type CesadStageReadSnapshotRef } from '@sadep/contracts';

import {
  formatCesadStageOpinionStatus,
  formatDateTime,
  getCesadStageOpinionStatusTone,
} from '@/features/process/components/process-formatters';
import { ContentState } from '@/shared/ui/content-state';
import { KeyValueList } from '@/shared/ui/key-value-list';
import { StatusBadge } from '@/shared/ui/status-badge';

type ReadOnlyOpinionShellProps = {
  opinion?: CesadStageReadSnapshotRef['cesadStageOpinion'] | null;
  stageLabel?: string;
};

function getOpinionStateLabel(opinion?: CesadStageReadSnapshotRef['cesadStageOpinion'] | null) {
  if (!opinion) {
    return 'Aguardando parecer';
  }

  if (opinion.status === CesadStageOpinionStatus.COMPLETED) {
    return 'Parecer concluído';
  }

  return 'Parecer em elaboração';
}

export function ReadOnlyOpinionShell({
  opinion,
  stageLabel = 'Etapa não informada',
}: ReadOnlyOpinionShellProps) {
  return (
    <section className="cesad-opinion-shell" aria-labelledby="cesad-stage-opinion-shell-title">
      <div className="cesad-opinion-shell__header">
        <div>
          <h3 id="cesad-stage-opinion-shell-title">Parecer CESAD da etapa</h3>
        </div>
        <StatusBadge
          label={getOpinionStateLabel(opinion)}
          tone={getCesadStageOpinionStatusTone(opinion?.status)}
        />
      </div>

      {opinion ? (
        <div className="cesad-opinion-shell__document">
          <div className="cesad-opinion-shell__document-status">
            <StatusBadge
              label={formatCesadStageOpinionStatus(opinion.status)}
              tone={getCesadStageOpinionStatusTone(opinion.status)}
            />
            <span>{stageLabel}</span>
          </div>

          <KeyValueList
            items={[
              { label: 'Relatório', value: opinion.reportText },
              { label: 'Fundamentação', value: opinion.legalBasis ?? 'Não informada' },
              { label: 'Conclusão', value: opinion.conclusion },
              { label: 'Conceito da etapa', value: opinion.stageConcept ?? 'Não informado' },
              { label: 'Resultado da etapa', value: opinion.stageResult ?? 'Não informado' },
              { label: 'Concluído em', value: formatDateTime(opinion.completedAt) },
            ]}
          />
        </div>
      ) : (
        <ContentState
          title="Parecer da etapa ausente"
          description="O parecer ainda não foi elaborado."
          tone="warning"
        />
      )}
    </section>
  );
}
