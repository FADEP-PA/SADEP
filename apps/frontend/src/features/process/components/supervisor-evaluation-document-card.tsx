'use client';

import { DocumentStatus, SignatureStatus, type SupervisorEvaluationWithDocumentContextRef } from '@aep-pa/contracts';

import { InfoCard } from '@/shared/ui/info-card';
import { KeyValueList } from '@/shared/ui/key-value-list';
import { StatusBadge } from '@/shared/ui/status-badge';

import { formatDateTime } from './process-formatters';

type SupervisorEvaluationDocumentCardProps = {
  evaluation: SupervisorEvaluationWithDocumentContextRef | null;
};

function getDocumentStatusLabel(status: DocumentStatus) {
  if (status === DocumentStatus.DRAFT) {
    return 'Rascunho';
  }

  if (status === DocumentStatus.CONSOLIDATED) {
    return 'Consolidado';
  }

  if (status === DocumentStatus.READY_FOR_SIGNATURE) {
    return 'Pronto para assinatura';
  }

  if (status === DocumentStatus.SIGNED) {
    return 'Assinado';
  }

  return 'Invalidado/Substituído';
}

function getDocumentStatusTone(status: DocumentStatus): 'neutral' | 'info' | 'warning' | 'success' {
  if (status === DocumentStatus.SIGNED) {
    return 'success';
  }

  if (status === DocumentStatus.READY_FOR_SIGNATURE) {
    return 'warning';
  }

  if (status === DocumentStatus.INVALIDATED_OR_SUPERSEDED) {
    return 'warning';
  }

  return 'info';
}

function getSignatureStatusLabel(status: SignatureStatus) {
  if (status === SignatureStatus.COMPLETED) {
    return 'Assinada';
  }

  if (status === SignatureStatus.PENDING) {
    return 'Pendente';
  }

  if (status === SignatureStatus.FAILED) {
    return 'Falhou';
  }

  return 'Cancelada';
}

function getSignatureTone(status: SignatureStatus): 'neutral' | 'info' | 'warning' | 'success' {
  if (status === SignatureStatus.COMPLETED) {
    return 'success';
  }

  if (status === SignatureStatus.PENDING) {
    return 'warning';
  }

  return 'warning';
}

export function SupervisorEvaluationDocumentCard({ evaluation }: SupervisorEvaluationDocumentCardProps) {
  if (!evaluation) {
    return (
      <InfoCard
        title="Avaliação da chefia"
        description="Ainda não há avaliação registrada para este processo."
      />
    );
  }

  if (!evaluation.documentContext) {
    return (
      <InfoCard
        title="Avaliação da chefia"
        description="A avaliação existe, mas ainda não foi formalizada em documento assinado."
      />
    );
  }

  return (
    <InfoCard
      title="Avaliação da chefia"
      description="Contexto documental consolidado para leitura do servidor, incluindo status e assinaturas."
    >
      <KeyValueList
        items={[
          { label: 'Documento', value: evaluation.documentContext.documentId },
          {
            label: 'Status documental',
            value: (
              <StatusBadge
                label={getDocumentStatusLabel(evaluation.documentContext.documentStatus)}
                tone={getDocumentStatusTone(evaluation.documentContext.documentStatus)}
              />
            ),
          },
          {
            label: 'Assinatura do servidor',
            value: evaluation.documentContext.internSignaturePending ? 'Pendente' : 'Concluída',
          },
        ]}
      />

      <ul className="timeline-list">
        {evaluation.documentContext.signatures.map((signature) => (
          <li key={signature.signatoryRole} className="timeline-list__item">
            <strong>{signature.signatoryRole}</strong>
            <StatusBadge
              label={getSignatureStatusLabel(signature.status)}
              tone={getSignatureTone(signature.status)}
            />
            <span>{formatDateTime(signature.signedAt)}</span>
          </li>
        ))}
      </ul>
    </InfoCard>
  );
}
