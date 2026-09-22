'use client';

import { FeedbackAlert } from '@/shared/ui/feedback-alert';
import { DetailList, WorkPageHeader, WorkSection } from '@/shared/ui/work-patterns';

import { formatDateTime } from './process-formatters';

export type SelfEvaluationFormState = { selfReflection: string; additionalNotes: string; comment: string };

type Props = {
  form: SelfEvaluationFormState;
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
};

export function SelfEvaluationFormView({
  form,
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
}: Props) {
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
            <textarea id="self-evaluation-reflection" rows={6} value={form.selfReflection} onChange={(event) => onChange((current) => ({ ...current, selfReflection: event.target.value }))} disabled={!canEdit || isBusy} />
          </label>
          <label className="field-group" htmlFor="self-evaluation-notes">
            <span>Observações adicionais</span>
            <textarea id="self-evaluation-notes" rows={3} value={form.additionalNotes} onChange={(event) => onChange((current) => ({ ...current, additionalNotes: event.target.value }))} disabled={!canEdit || isBusy} />
          </label>
        </div>
        {canEdit && formIssues.length > 0 ? <p className="field-error">{formIssues[0]}</p> : null}
        {!isSubmitted ? (
          <div className="form-actions">
            <button type="button" className="secondary-button" onClick={onSaveDraft} disabled={!canEdit || isBusy}>{isSavingDraft ? 'Salvando…' : 'Salvar rascunho'}</button>
            <button type="button" onClick={onSubmit} disabled={!canSubmit || isBusy || formIssues.length > 0}>{isSubmitting ? 'Enviando…' : 'Enviar autoavaliação'}</button>
          </div>
        ) : null}
      </WorkSection>
    </div>
  );
}
