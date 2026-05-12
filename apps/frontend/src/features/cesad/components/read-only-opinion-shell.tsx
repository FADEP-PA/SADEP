import { CesadStageOpinionStatus, type CesadStageReadSnapshotRef } from '@sadep/contracts';

import {
  formatCesadStageOpinionStatus,
  formatDateTime,
  getCesadStageOpinionStatusTone,
} from '@/features/process/components/process-formatters';
import { ContentState } from '@/shared/ui/content-state';
import { KeyValueList } from '@/shared/ui/key-value-list';
import { StatusBadge, type StatusBadgeTone } from '@/shared/ui/status-badge';

import {
  DEMO_CESAD_STAGE_OPINIONS,
  type DemoCesadStageOpinion,
} from '../data/cesad-stage-opinion-demo';

type ReadOnlyOpinionShellProps = {
  opinion?: CesadStageReadSnapshotRef['cesadStageOpinion'] | null;
  stageLabel?: string;
  processLabel?: string;
  isDemo?: boolean;
};

function getDemoTone(state: DemoCesadStageOpinion['state']): StatusBadgeTone {
  if (state === 'CONSOLIDATED') {
    return 'success';
  }

  if (state === 'DRAFT') {
    return 'info';
  }

  return 'warning';
}

function getOpinionStateLabel(opinion?: CesadStageReadSnapshotRef['cesadStageOpinion'] | null) {
  if (!opinion) {
    return 'Parecer ausente';
  }

  if (opinion.status === CesadStageOpinionStatus.COMPLETED) {
    return 'Parecer pronto/consolidado';
  }

  return 'Parecer em elaboracao';
}

function DemoOpinionCard({ opinion }: { opinion: DemoCesadStageOpinion }) {
  return (
    <article className="cesad-opinion-shell__state-card">
      <div className="cesad-opinion-shell__state-header">
        <div>
          <span>{opinion.stageLabel}</span>
          <strong>{opinion.title}</strong>
        </div>
        <StatusBadge label={opinion.statusLabel} tone={getDemoTone(opinion.state)} />
      </div>

      <KeyValueList
        items={[
          { label: 'Processo', value: opinion.processLabel },
          { label: 'Relato previsto', value: opinion.summary },
          { label: 'Fundamentacao', value: opinion.legalBasis },
          { label: 'Conclusao', value: opinion.conclusion },
        ]}
      />

      <div className="cesad-opinion-shell__pending">
        <strong>Dependencias futuras</strong>
        <ul className="content-list">
          {opinion.pendingItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export function ReadOnlyOpinionShell({
  opinion,
  stageLabel = 'Etapa nao carregada',
  processLabel = 'Processo nao carregado',
  isDemo = false,
}: ReadOnlyOpinionShellProps) {
  return (
    <section className="cesad-opinion-shell" aria-labelledby="cesad-stage-opinion-shell-title">
      <div className="cesad-opinion-shell__header">
        <div>
          <span className="section-chip">
            {isDemo ? 'Modo demonstrativo' : 'Layout base do parecer'}
          </span>
          <h3 id="cesad-stage-opinion-shell-title">Parecer CESAD da etapa</h3>
          <p>
            Estrutura visual preparada para o parecer de etapa, sem emissao,
            assinatura, homologacao ou persistencia enquanto a API nao
            expuser contrato proprio.
          </p>
        </div>
        <StatusBadge
          label={isDemo ? 'Dados ficticios' : getOpinionStateLabel(opinion)}
          tone={isDemo ? 'info' : getCesadStageOpinionStatusTone(opinion?.status)}
        />
      </div>

      {isDemo ? (
        <div className="cesad-opinion-shell__demo-grid">
          {DEMO_CESAD_STAGE_OPINIONS.map((demoOpinion) => (
            <DemoOpinionCard key={demoOpinion.id} opinion={demoOpinion} />
          ))}
        </div>
      ) : opinion ? (
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

          <ContentState
            title="Acoes formais indisponiveis nesta tela"
            description="A interface exibe apenas a estrutura de leitura. Emissao, assinatura e conclusao dependem de contrato e capacidades da integracao."
            tone="info"
          />
        </div>
      ) : (
        <ContentState
          title="Parecer da etapa ausente"
          description="A etapa carregada ainda nao possui parecer CESAD retornado pela integracao. O espaco permanece reservado para a integracao futura."
          tone="warning"
        />
      )}
    </section>
  );
}
