'use client';

import {
  ProcessStatus,
  SelfEvaluationStatus,
  SignatureStatus,
  UserRole,
  type SelfEvaluationDocumentContextRef,
  type SelfEvaluationWithDocumentContextRef,
} from '@sadep/contracts';

import { StatusBadge } from '@/shared/ui/status-badge';
import { WorkSection } from '@/shared/ui/work-patterns';

import { formatDateTime } from './process-formatters';

type Props = {
  selfEvaluation: SelfEvaluationWithDocumentContextRef | null;
  documentContext: SelfEvaluationDocumentContextRef | null;
  userName: string;
  processStatus: ProcessStatus;
  isConfirming: boolean;
  onConfirm: () => void;
};

export function SupervisorSelfEvaluationCard({
  selfEvaluation,
  documentContext,
  userName,
  processStatus,
  isConfirming,
  onConfirm,
}: Props) {
  if (!selfEvaluation || selfEvaluation.status !== SelfEvaluationStatus.SUBMITTED) return null;

  const signature = documentContext?.signatures.find(
    (item) => item.signatoryRole === UserRole.IMMEDIATE_SUPERVISOR,
  );
  const isSigned = signature?.status === SignatureStatus.COMPLETED;
  const isPending = documentContext?.supervisorSignaturePending === true;
  const isUnderReview = processStatus === ProcessStatus.EM_ANALISE_CESAD;

  return (
    <WorkSection
      title="Autoavaliação recebida"
      action={
        isPending ? (
          <button type="button" disabled={isConfirming} onClick={onConfirm}>
            {isConfirming ? 'Confirmando…' : 'Confirmar recebimento'}
          </button>
        ) : (
          <StatusBadge
            label={isSigned ? 'Confirmada' : isUnderReview ? 'Em análise pela CESAD' : 'Recebida'}
            tone={isSigned ? 'success' : 'info'}
          />
        )
      }
    >
      <div className="evaluation-summary">
        <p>{selfEvaluation.selfReflection || 'Não informado'}</p>
        <details className="compact-disclosure">
          <summary>Ver autoavaliação completa</summary>
          {selfEvaluation.additionalNotes ? <p>{selfEvaluation.additionalNotes}</p> : null}
          {selfEvaluation.submittedAt ? <small>Enviada em {formatDateTime(selfEvaluation.submittedAt)}</small> : null}
        </details>
        {isSigned ? (
          <p className="success-copy">
            Confirmada por <strong>{userName}</strong>{signature?.signedAt ? ` em ${formatDateTime(signature.signedAt)}` : ''}.
          </p>
        ) : null}
      </div>
    </WorkSection>
  );
}
