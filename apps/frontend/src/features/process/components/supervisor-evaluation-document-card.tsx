'use client';

import type { SupervisorEvaluationWithDocumentContextRef } from '@sadep/contracts';

import { InfoCard } from '@/shared/ui/info-card';
import { KeyValueList } from '@/shared/ui/key-value-list';
import {
  MissingDocumentState,
  ReadNotReleasedState,
} from '@/shared/ui/operational-states';
import { StatusBadge } from '@/shared/ui/status-badge';

import {
  formatDateTime,
  formatDocumentStatus,
  formatRole,
  formatSignatureStatus,
  getDocumentStatusTone,
  getSignatureStatusTone,
} from './process-formatters';

type SupervisorEvaluationDocumentCardProps = {
  evaluation: SupervisorEvaluationWithDocumentContextRef | null;
};

export function SupervisorEvaluationDocumentCard({ evaluation }: SupervisorEvaluationDocumentCardProps) {
  if (!evaluation) {
    return (
      <InfoCard title="Avaliacao da chefia" description="Contexto documental exibido ao servidor estagiario.">
        <MissingDocumentState
          title="Avaliacao da chefia ausente"
          description="Ainda nao ha avaliacao registrada para este processo."
        />
      </InfoCard>
    );
  }

  if (!evaluation.documentContext) {
    return (
      <InfoCard title="Avaliacao da chefia" description="Contexto documental exibido ao servidor estagiario.">
        <ReadNotReleasedState
          title="Leitura documental ainda nao liberada"
          description="A avaliacao existe, mas ainda nao foi formalizada em documento assinado."
        />
      </InfoCard>
    );
  }

  return (
    <InfoCard
      title="Avaliacao da chefia"
      description="Contexto documental consolidado para leitura do servidor, incluindo status e assinaturas."
    >
      <KeyValueList
        items={[
          { label: 'Documento', value: evaluation.documentContext.documentId },
          {
            label: 'Status documental',
            value: (
              <StatusBadge
                label={formatDocumentStatus(evaluation.documentContext.documentStatus)}
                tone={getDocumentStatusTone(evaluation.documentContext.documentStatus)}
              />
            ),
          },
          {
            label: 'Assinatura do servidor',
            value: evaluation.documentContext.internSignaturePending ? 'Pendente' : 'Concluida',
          },
        ]}
      />

      <ul className="timeline-list">
        {evaluation.documentContext.signatures.map((signature) => (
          <li key={signature.signatoryRole} className="timeline-list__item">
            <strong>{formatRole(signature.signatoryRole)}</strong>
            <StatusBadge
              label={formatSignatureStatus(signature.status)}
              tone={getSignatureStatusTone(signature.status)}
            />
            <span>{formatDateTime(signature.signedAt)}</span>
          </li>
        ))}
      </ul>
    </InfoCard>
  );
}
