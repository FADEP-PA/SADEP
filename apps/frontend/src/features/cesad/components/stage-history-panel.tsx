import type { CesadStageReadSnapshotRef } from '@sadep/contracts';

import {
  formatDateTime,
  formatProcessAction,
  formatRole,
} from '@/features/process/components/process-formatters';
import { InsufficientHistoryState } from '@/shared/ui/operational-states';
import { PageSection } from '@/shared/ui/page-section';

type StageHistoryPanelProps = {
  history: CesadStageReadSnapshotRef['history'];
};

function getHistoryDescription(item: CesadStageReadSnapshotRef['history'][number]) {
  if (item.action) {
    return formatProcessAction(item.action);
  }

  return item.eventType;
}

export function StageHistoryPanel({ history }: StageHistoryPanelProps) {
  return (
    <PageSection
      eyebrow="Histórico"
      title="Histórico resumido relevante"
      description="Eventos auditáveis que ajudam a CESAD a reconstituir a instrução da etapa, sem introduzir novas regras na interface."
    >
      {history.length > 0 ? (
        <div className="surface-card">
          <ul className="content-list cesad-stage-read__history">
            {history.map((item) => (
              <li key={item.id}>
                <strong>{getHistoryDescription(item)}</strong>
                <span>
                  {' '}
                  por {item.actorRole ? formatRole(item.actorRole) : 'Perfil não identificado'} em{' '}
                  {formatDateTime(item.occurredAt)}
                </span>
                {item.comment ? <div>{item.comment}</div> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <InsufficientHistoryState />
      )}
    </PageSection>
  );
}
