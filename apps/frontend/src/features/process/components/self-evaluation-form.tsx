'use client';

import { FeedbackAlert } from '@/shared/ui/feedback-alert';

import { formatDateTime } from './process-formatters';

export type SelfEvaluationFormState = {
  selfReflection: string;
  additionalNotes: string;
  comment: string;
};

type SelfEvaluationFormViewProps = {
  form: SelfEvaluationFormState;
  displayName: string;
  roleLabel: string;
  lotacao: string;
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
  displayName,
  roleLabel,
  lotacao,
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
}: SelfEvaluationFormViewProps) {
  return (
    <section className="operations-card intern-self-screen">
      <button
        type="button"
        className="ghost-button intern-self-screen__back"
        onClick={onBack}
      >
        ← Voltar
      </button>

      <div className="intern-self-screen__header">
        <h3>Autoavaliação - {currentStageSequence}ª etapa</h3>
        <p>Preenchimento de formulário oficial de desempenho.</p>
      </div>

      <section className="operations-card intern-self-screen__identity-card">
        <div className="intern-self-screen__section-label">
          Identificação do servidor (somente leitura)
        </div>

        <div className="intern-self-screen__identity-grid">
          <div>
            <span>Nome</span>
            <strong>{displayName}</strong>
          </div>
          <div>
            <span>Cargo</span>
            <strong>{roleLabel}</strong>
          </div>
          <div>
            <span>Lotação</span>
            <strong>{lotacao}</strong>
          </div>
          <div>
            <span>Período</span>
            <strong>{currentStagePeriod}</strong>
          </div>
        </div>
      </section>

      <section className="operations-card intern-self-screen__form-card">
        <div className="self-evaluation-form">
          {canEdit && formIssues.length > 0 ? (
            <FeedbackAlert
              title="Autoavaliação pendente"
              tone="warning"
              description="Complete o texto principal para liberar o envio da autoavaliação."
              details={formIssues}
            />
          ) : null}

          {isSubmitted ? (
            <FeedbackAlert
              title="Autoavaliação enviada para a Chefia"
              tone="success"
              description={
                submittedAt
                  ? `Enviada em ${formatDateTime(submittedAt)}. O conteúdo permanece somente para consulta enquanto aguarda a confirmação da Chefia.`
                  : 'O conteúdo foi submetido e permanece somente para consulta enquanto aguarda a confirmação da Chefia.'
              }
            />
          ) : null}

          <label className="field-group" htmlFor="self-evaluation-reflection">
            <span>Descreva sua autoavaliação conforme modelo oficial</span>
            <textarea
              id="self-evaluation-reflection"
              rows={10}
              value={form.selfReflection}
              onChange={(event) =>
                onChange((current) => ({ ...current, selfReflection: event.target.value }))
              }
              disabled={!canEdit || isBusy}
              placeholder="Digite aqui o texto da sua autoavaliação técnica e pedagógica..."
            />
          </label>

          <label className="field-group" htmlFor="self-evaluation-notes">
            <span>Outras observações</span>
            <textarea
              id="self-evaluation-notes"
              rows={5}
              value={form.additionalNotes}
              onChange={(event) =>
                onChange((current) => ({ ...current, additionalNotes: event.target.value }))
              }
              disabled={!canEdit || isBusy}
              placeholder="Informações adicionais relevantes para a Comissão..."
            />
          </label>

          <label
            className="field-group intern-self-screen__comment-field"
            htmlFor="self-evaluation-comment"
          >
            <span>Comentário da movimentação</span>
            <textarea
              id="self-evaluation-comment"
              rows={3}
              value={form.comment}
              onChange={(event) =>
                onChange((current) => ({ ...current, comment: event.target.value }))
              }
              disabled={!canEdit || isBusy}
              placeholder="Comentário opcional para o histórico auditável."
            />
          </label>

          {!isSubmitted ? (
            <div className="intern-self-screen__actions">
              <button
                type="button"
                onClick={onSubmit}
                disabled={!canSubmit || isBusy || formIssues.length > 0}
              >
                {isSubmitting ? 'Enviando...' : 'Enviar autoavaliação para a Chefia'}
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={onSaveDraft}
                disabled={!canEdit || isBusy}
              >
                {isSavingDraft ? 'Salvando...' : 'Salvar rascunho'}
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </section>
  );
}
