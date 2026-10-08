'use client';

import { EVALUATION_TEXT_LIMIT_MESSAGE, EvaluationAttachmentOrigin, isEvaluationTextWithinLimit } from '@sadep/contracts';
import { EvaluationTextarea } from '@/shared/ui/evaluation-textarea';
import { useState } from 'react';

import { FeedbackAlert } from '@/shared/ui/feedback-alert';
import { DetailList, WorkPageHeader, WorkSection } from '@/shared/ui/work-patterns';

import { EvaluationAttachments } from './evaluation-attachments';
import { formatDateTime } from './process-formatters';

export type SelfEvaluationFormState = { selfReflection: string; additionalNotes: string; comment: string };

type Props = {
  form: SelfEvaluationFormState;
  processId: string;
  stageId: string;
  currentStageSequence: number;
  currentStagePeriod: string;
  canEdit: boolean;
  canSubmit: boolean;
  isSubmitted: boolean;
  isBusy: boolean;
  isSavingDraft: boolean;
  isSubmitting: boolean;
  submittedAt: string | null;
  formIssues: string[];
  onChange: (updater: (current: SelfEvaluationFormState) => SelfEvaluationFormState) => void;
  onBack: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
  beforeUpload?: () => Promise<void>;
};

export function SelfEvaluationFormView({
  form,
  processId,
  stageId,
  currentStageSequence,
  currentStagePeriod,
  canEdit,
  canSubmit,
  isSubmitted,
  isBusy,
  isSavingDraft,
  isSubmitting,
  submittedAt,
  formIssues,
  onChange,
  onBack,
  onSaveDraft,
  onSubmit,
  beforeUpload,
}: Props) {
  const [attachmentsBusy, setAttachmentsBusy] = useState(false);
  isBusy = isBusy || attachmentsBusy;
  const exceedsTextLimit = Object.values(form).some((value) => !isEvaluationTextWithinLimit(value));
  return (
    <div className="self-evaluation-workspace">
      <button type="button" className="ghost-button work-back" onClick={onBack}>← Voltar à avaliação</button>
      <WorkPageHeader
        title="Autoavaliação"
        description={`${currentStageSequence}ª etapa`}
        status={isSubmitted ? 'Enviada' : canEdit ? 'Em preenchimento' : 'Somente leitura'}
        statusTone={isSubmitted ? 'success' : canEdit ? 'info' : 'neutral'}
      />

      <WorkSection title="Identificação">
        <DetailList items={[{ label: 'Etapa', value: `${currentStageSequence}ª etapa` }, { label: 'Período', value: currentStagePeriod }]} />
      </WorkSection>

      <WorkSection title="Sua autoavaliação">
        {isSubmitted ? (
          <FeedbackAlert title="Autoavaliação enviada" tone="success" description={submittedAt ? `Enviada em ${formatDateTime(submittedAt)}. Aguarde a confirmação da chefia.` : 'Aguarde a confirmação da chefia.'} />
        ) : null}
        <div className="form-stack">
          <label className="field-group" htmlFor="self-evaluation-reflection">
            <span>Autoavaliação</span>
            <EvaluationTextarea aria-label="Autoavaliação" id="self-evaluation-reflection" rows={4} value={form.selfReflection} onChange={(event) => onChange((current) => ({ ...current, selfReflection: event.target.value }))} disabled={!canEdit || isBusy} />
          </label>
          <label className="field-group" htmlFor="self-evaluation-notes">
            <span>Observações adicionais</span>
            <EvaluationTextarea aria-label="Observações adicionais" id="self-evaluation-notes" rows={2} value={form.additionalNotes} onChange={(event) => onChange((current) => ({ ...current, additionalNotes: event.target.value }))} disabled={!canEdit || isBusy} />
          </label>
        </div>
        {canEdit && (exceedsTextLimit || formIssues.length > 0) ? <p className="field-error">{exceedsTextLimit ? EVALUATION_TEXT_LIMIT_MESSAGE : formIssues[0]}</p> : null}
      </WorkSection>

      <EvaluationAttachments
        processId={processId}
        stageId={stageId}
        origin={EvaluationAttachmentOrigin.SELF_EVALUATION}
        editable={canEdit}
        disabled={isBusy && !attachmentsBusy}
        beforeUpload={beforeUpload}
        onBusyChange={setAttachmentsBusy}
        title="Anexos da autoavaliação"
      />
      {!isSubmitted ? (
        <div className="form-actions">
          <button type="button" className="secondary-button" onClick={onSaveDraft} disabled={!canEdit || isBusy || exceedsTextLimit}>{isSavingDraft ? 'Salvando…' : 'Salvar rascunho'}</button>
          <button type="button" onClick={onSubmit} disabled={!canSubmit || isBusy || exceedsTextLimit || formIssues.length > 0}>{isSubmitting ? 'Enviando…' : 'Enviar autoavaliação'}</button>
        </div>
      ) : null}
    </div>
  );
}
