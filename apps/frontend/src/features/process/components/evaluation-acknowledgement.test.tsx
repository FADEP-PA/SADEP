import { render, screen } from '@testing-library/react';
import { AcknowledgementMode, DocumentType, type EvaluationAcknowledgementRef } from '@sadep/contracts';
import { describe, expect, it } from 'vitest';

import { EvaluationAcknowledgement } from './evaluation-acknowledgement';
import { formatDateTime } from './process-formatters';

describe('EvaluationAcknowledgement', () => {
  const acknowledgement: EvaluationAcknowledgementRef = {
    processId: 'process', processStageId: 'stage', documentId: 'document',
    documentType: DocumentType.SUPERVISOR_EVALUATION, actorUserId: 'server',
    modality: AcknowledgementMode.ACKNOWLEDGED, acknowledgedAt: '2026-10-06T12:00:00.000Z',
  };

  it.each([AcknowledgementMode.ACKNOWLEDGED, AcknowledgementMode.ACKNOWLEDGED_WITH_RESERVATION, null])('apresenta %s somente leitura', (modality) => {
    const { rerender } = render(<EvaluationAcknowledgement acknowledgement={{ ...acknowledgement, modality }} />);
    const label = modality === null ? 'Ciência registrada — modalidade não informada (registro anterior)' : modality === AcknowledgementMode.ACKNOWLEDGED ? 'Ciente' : 'Ciente com ressalva';
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText(/Data\/hora:/)).toHaveTextContent(formatDateTime(acknowledgement.acknowledgedAt));
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    if (modality === AcknowledgementMode.ACKNOWLEDGED_WITH_RESERVATION) {
      expect(screen.getByText('O servidor registrou ciência da avaliação com ressalva, indicando discordância quanto ao conteúdo.')).toBeInTheDocument();
    }
    rerender(<EvaluationAcknowledgement acknowledgement={{ ...acknowledgement, modality, acknowledgedAt: '' }} />);
    expect(screen.queryByText(/Data\/hora:/)).not.toBeInTheDocument();
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('não apresenta ciência quando o read model não contém manifestação', () => {
    const { container } = render(<EvaluationAcknowledgement acknowledgement={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
