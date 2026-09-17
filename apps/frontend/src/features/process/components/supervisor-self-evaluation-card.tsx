'use client';

import {
  ProcessStatus,
  SelfEvaluationStatus,
  SignatureStatus,
  UserRole,
  type SelfEvaluationWithDocumentContextRef,
  type SelfEvaluationDocumentContextRef,
} from '@sadep/contracts';

import { formatDateTime } from './process-formatters';

type SupervisorSelfEvaluationCardProps = {
  selfEvaluation: SelfEvaluationWithDocumentContextRef | null;
  documentContext: SelfEvaluationDocumentContextRef | null;
  userName: string;
  processStatus: ProcessStatus;
  isConfirming: boolean;
  onConfirm: () => void;
};

function getSupervisorSignature(documentContext: SelfEvaluationDocumentContextRef | null) {
  if (!documentContext) return null;
  return documentContext.signatures.find(
    (s) => s.signatoryRole === UserRole.IMMEDIATE_SUPERVISOR,
  ) ?? null;
}

export function SupervisorSelfEvaluationCard({
  selfEvaluation,
  documentContext,
  userName,
  processStatus,
  isConfirming,
  onConfirm,
}: SupervisorSelfEvaluationCardProps) {
  if (!selfEvaluation || selfEvaluation.status !== SelfEvaluationStatus.SUBMITTED) {
    return null;
  }

  const supervisorSignature = getSupervisorSignature(documentContext);
  const isSigned = supervisorSignature?.status === SignatureStatus.COMPLETED;
  const isPendingSignature = documentContext?.supervisorSignaturePending === true;
  const isEmAnalise = processStatus === ProcessStatus.EM_ANALISE_CESAD;

  return (
    <section className="operations-card supervisor-self-eval-card">
      <div className="supervisor-self-eval-card__header">
        <h3>Autoavaliação do servidor</h3>
        <span className="supervisor-self-eval-card__status">
          {isSigned
            ? 'Confirmada pela chefia'
            : isEmAnalise
              ? 'Em análise pela CESAD'
              : 'Aguardando confirmação da chefia'}
        </span>
      </div>

      <div className="supervisor-self-eval-card__content">
        <div className="supervisor-self-eval-card__field">
          <strong>Reflexão do servidor</strong>
          <p>{selfEvaluation.selfReflection || 'Não informado'}</p>
        </div>

        {selfEvaluation.additionalNotes ? (
          <div className="supervisor-self-eval-card__field">
            <strong>Observações adicionais</strong>
            <p>{selfEvaluation.additionalNotes}</p>
          </div>
        ) : null}

        <div className="supervisor-self-eval-card__meta">
          <span>
            Submetida em: {selfEvaluation.submittedAt ? formatDateTime(selfEvaluation.submittedAt) : '—'}
          </span>
        </div>
      </div>

      {isSigned && supervisorSignature ? (
        <div className="supervisor-self-eval-card__confirmed">
          <span className="supervisor-self-eval-card__confirmed-icon">✓</span>
          <span>
            Confirmada por <strong>{userName}</strong>
            {supervisorSignature.signedAt ? ` em ${formatDateTime(supervisorSignature.signedAt)}` : ''}
          </span>
        </div>
      ) : isPendingSignature ? (
        <div className="supervisor-self-eval-card__actions">
          <button
            type="button"
            className="supervisor-self-eval-card__confirm-btn"
            disabled={isConfirming}
            onClick={onConfirm}
          >
            {isConfirming ? 'Confirmando...' : 'Confirmar recebimento / Dar OK'}
          </button>
        </div>
      ) : null}
    </section>
  );
}
