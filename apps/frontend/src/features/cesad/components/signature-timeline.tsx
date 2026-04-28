import type { CesadStageReadSnapshotRef } from '@aep-pa/contracts';

import {
  formatDateTime,
  formatRole,
  formatSignatureStatus,
  getSignatureStatusTone,
} from '@/features/process/components/process-formatters';
import { ContentState } from '@/shared/ui/content-state';
import { StatusBadge } from '@/shared/ui/status-badge';

type SignatureTimelineProps = {
  signatures: CesadStageReadSnapshotRef['documents'][number]['signatures'];
};

export function SignatureTimeline({ signatures }: SignatureTimelineProps) {
  if (signatures.length === 0) {
    return (
      <ContentState
        title="Sem trilha de assinatura"
        description="O documento existe, mas ainda não há registros de assinatura associados."
        tone="warning"
      />
    );
  }

  return (
    <div>
      <strong>Assinaturas</strong>
      <ul className="content-list cesad-stage-read__signatures">
        {signatures.map((signature) => (
          <li key={signature.signatureId}>
            <strong>{formatRole(signature.signatoryRole)}</strong>{' '}
            <StatusBadge
              label={formatSignatureStatus(signature.status)}
              tone={getSignatureStatusTone(signature.status)}
            />
            {signature.signedAt ? ` em ${formatDateTime(signature.signedAt)}` : ' sem data de conclusão'}
          </li>
        ))}
      </ul>
    </div>
  );
}
