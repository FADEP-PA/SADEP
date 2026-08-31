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
  processLabel?: string;
};

function getOpinionStateLabel(opinion?: CesadStageReadSnapshotRef['cesadStageOpinion'] | null) {
  if (!opinion) {
    return 'Parecer ausente';
  }

  if (opinion.status === CesadStageOpinionStatus.COMPLETED) {
    return 'Parecer pronto/consolidado';
  }

  return 'Parecer em elaboracao';
}

export function ReadOnlyOpinionShell({
  opinion,
  stageLabel = 'Etapa nao carregada',
  processLabel = 'Processo nao carregado',
}: ReadOnlyOpinionShellProps) {
  return (
    <section className="cesad-opinion-shell" aria-labelledby="cesad-stage-opinion-shell-title">
      <div className="cesad-opinion-shell__header">
        <div>
          <span className="section-chip">Leitura do parecer</span>
          <h3 id="cesad-stage-opinion-shell-title">Parecer CESAD da etapa</h3>
          <p>
            Estrutura visual do parecer de etapa, com leitura dos campos
            retornados pela integracao.
          </p>
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
            <span>{processLabel}</span>
          </div>

          <KeyValueList
            items={[
              { label: 'Relatorio', value: opinion.reportText },
              { label: 'Fundamentacao', value: opinion.legalBasis ?? 'Nao informada' },
              { label: 'Conclusao', value: opinion.conclusion },
              { label: 'Conceito da etapa', value: opinion.stageConcept ?? 'Nao informado' },
              { label: 'Resultado da etapa', value: opinion.stageResult ?? 'Nao informado' },
              { label: 'Concluido em', value: formatDateTime(opinion.completedAt) },
            ]}
          />
        </div>
      ) : (
        <ContentState
          title="Parecer da etapa ausente"
          description="A etapa carregada ainda nao possui parecer CESAD retornado pela integracao."
          tone="warning"
        />
      )}
    </section>
  );
}
