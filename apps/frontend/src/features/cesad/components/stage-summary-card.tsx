import type { CesadStageReadSnapshotRef } from '@aep-pa/contracts';

import {
  formatDateTime,
  formatDocumentType,
  formatStageInstructionStatus,
  getStageInstructionStatusTone,
} from '@/features/process/components/process-formatters';
import { KeyValueList } from '@/shared/ui/key-value-list';
import { StatusBadge } from '@/shared/ui/status-badge';

type StageSummaryCardProps = {
  snapshot: CesadStageReadSnapshotRef;
};

function formatDocumentTypes(documentTypes: CesadStageReadSnapshotRef['documentationStatus']['requiredDocumentTypes']) {
  if (documentTypes.length === 0) {
    return 'Nenhum documento obrigatório informado';
  }

  return documentTypes
    .map((documentType) =>
      formatDocumentType({
        documentType,
        opinionScope: 'STAGE',
      }),
    )
    .join(', ');
}

export function StageSummaryCard({ snapshot }: StageSummaryCardProps) {
  const documentationStatus = snapshot.documentationStatus;
  const stageInstructionStatus = documentationStatus.stageInstructionStatus;

  return (
    <div className="surface-card">
      <h3>Status da etapa</h3>
      <div className="cesad-stage-read__badges">
        <StatusBadge
          label={formatStageInstructionStatus(stageInstructionStatus)}
          tone={getStageInstructionStatusTone(stageInstructionStatus)}
        />
      </div>

      <KeyValueList
        items={[
          {
            label: 'Etapa',
            value: `${snapshot.stage.sequence}/${snapshot.stage.totalStages} - ${snapshot.stage.stageCode}`,
          },
          {
            label: 'Situação documental',
            value: formatStageInstructionStatus(stageInstructionStatus),
          },
          {
            label: 'Documentos obrigatórios',
            value: formatDocumentTypes(documentationStatus.requiredDocumentTypes),
          },
          {
            label: 'Pendências',
            value:
              documentationStatus.missingRequiredDocumentTypes.length > 0
                ? formatDocumentTypes(documentationStatus.missingRequiredDocumentTypes)
                : 'Nenhuma pendência obrigatória',
          },
          {
            label: 'Assinaturas pendentes',
            value:
              documentationStatus.pendingSignatureDocumentTypes.length > 0
                ? formatDocumentTypes(documentationStatus.pendingSignatureDocumentTypes)
                : 'Nenhuma assinatura pendente',
          },
          { label: 'Início da etapa', value: formatDateTime(snapshot.stage.startedAt) },
          { label: 'Fim da etapa', value: formatDateTime(snapshot.stage.endedAt) },
        ]}
      />
    </div>
  );
}
