'use client';

import {
  ProcessStatus,
  EvaluationAttachmentOrigin,
  SelfEvaluationStatus,
  SignatureStatus,
  UserRole,
  type SelfEvaluationDocumentContextRef,
  type SelfEvaluationWithDocumentContextRef,
} from '@sadep/contracts';

import { StatusBadge } from '@/shared/ui/status-badge';
import { WorkSection } from '@/shared/ui/work-patterns';

import { EvaluationPdfViewer } from './evaluation-pdf-viewer';
import { EvaluationAttachments } from './evaluation-attachments';

import { formatDateTime } from './process-formatters';

type Props = {
  selfEvaluation: SelfEvaluationWithDocumentContextRef | null;
  documentContext: SelfEvaluationDocumentContextRef | null;
  userName: string;
  processStatus: ProcessStatus;
  isConfirming: boolean;
  onConfirm: () => void;
  stageSequence?: number;
};

export function SupervisorSelfEvaluationCard({
  selfEvaluation,
  documentContext,
  userName,
  processStatus,
  isConfirming,
  onConfirm,
  stageSequence,
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
      title="Autoavaliação do Servidor"
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
        <EvaluationPdfViewer hideTitle processId={selfEvaluation.processId} documentContext={documentContext} updatedAt={selfEvaluation.updatedAt} title="PDF da autoavaliação do Servidor" stageSequence={stageSequence} chronology={{ submittedAt: selfEvaluation.submittedAt, createdAt: selfEvaluation.createdAt }} metadata={<>
          {selfEvaluation.submittedAt ? <span>Enviada em {formatDateTime(selfEvaluation.submittedAt)}</span> : null}
          {isSigned ? <span>Confirmada por <strong>{userName}</strong>{signature?.signedAt ? ` em ${formatDateTime(signature.signedAt)}` : ''}.</span> : null}
        </>} />
      </div>
      <EvaluationAttachments compact processId={selfEvaluation.processId} stageId={selfEvaluation.processStageId} origin={EvaluationAttachmentOrigin.SELF_EVALUATION} title="Anexos" />
    </WorkSection>
  );
}
