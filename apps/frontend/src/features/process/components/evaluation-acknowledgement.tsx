import { AcknowledgementMode, type EvaluationAcknowledgementRef } from '@sadep/contracts';

import { WorkSection } from '@/shared/ui/work-patterns';

import { formatDateTime } from './process-formatters';

export function EvaluationAcknowledgement({ acknowledgement }: { acknowledgement: EvaluationAcknowledgementRef | null | undefined }) {
  if (!acknowledgement) return null;

  const withReservation = acknowledgement.modality === AcknowledgementMode.ACKNOWLEDGED_WITH_RESERVATION;
  const label = withReservation
    ? 'Ciente com ressalva'
    : acknowledgement.modality === AcknowledgementMode.ACKNOWLEDGED
      ? 'Ciente'
      : 'Ciência registrada — modalidade não informada (registro anterior)';

  return (
    <WorkSection title={withReservation ? '✓ Ciência registrada com ressalva' : '✓ Ciência registrada'}>
      <p><strong>{label}</strong></p>
      {acknowledgement.acknowledgedAt ? <p>Data/hora: {formatDateTime(acknowledgement.acknowledgedAt)}</p> : null}
      {withReservation ? <p>O servidor registrou ciência da avaliação com ressalva, indicando discordância quanto ao conteúdo.</p> : null}
    </WorkSection>
  );
}
