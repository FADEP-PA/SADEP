import type { CesadStageReadSnapshotRef } from '@sadep/contracts';

import {
  formatDateTime,
  formatProcessStatus,
  formatRole,
  formatStageInstructionStatus,
  getProcessStatusTone,
  getStageInstructionStatusTone,
} from '@/features/process/components/process-formatters';
import { KeyValueList } from '@/shared/ui/key-value-list';
import { StatusBadge } from '@/shared/ui/status-badge';

type ProcessHeaderCardProps = {
  snapshot: CesadStageReadSnapshotRef;
};

function getServerDisplayName(server: CesadStageReadSnapshotRef['server']) {
  return server.displayName ?? server.email;
}

export function ProcessHeaderCard({ snapshot }: ProcessHeaderCardProps) {
  const stageInstructionStatus = snapshot.documentationStatus.stageInstructionStatus;

  return (
    <div className="surface-card">
      <span className="section-chip">Modo somente leitura</span>
      <h3>Etapa {snapshot.stage.sequence} em leitura</h3>
      <p>
        Processo <code>{snapshot.process.id}</code> em {formatProcessStatus(snapshot.process.status)} com
        foco documental na etapa <strong>{snapshot.stage.stageCode}</strong>.
      </p>

      <div className="cesad-stage-read__badges">
        <StatusBadge
          label={formatProcessStatus(snapshot.process.status)}
          tone={getProcessStatusTone(snapshot.process.status)}
        />
        <StatusBadge
          label={formatStageInstructionStatus(stageInstructionStatus)}
          tone={getStageInstructionStatusTone(stageInstructionStatus)}
        />
      </div>

      <KeyValueList
        items={[
          { label: 'Servidor', value: getServerDisplayName(snapshot.server) },
          { label: 'Perfil do servidor', value: formatRole(snapshot.server.role) },
          {
            label: 'Etapa',
            value: `${snapshot.stage.sequence}/${snapshot.stage.totalStages} - ${snapshot.stage.stageCode}`,
          },
          { label: 'Criado em', value: formatDateTime(snapshot.process.createdAt) },
          { label: 'Atualizado em', value: formatDateTime(snapshot.process.updatedAt) },
        ]}
      />
    </div>
  );
}
