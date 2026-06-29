'use client';

import { useState } from 'react';

import type { CesadStageOpinionInput } from '@sadep/contracts';

import { getRequestErrorMessage } from '@/shared/api/http-error';
import { FeedbackAlert } from '@/shared/ui/feedback-alert';

export type CesadStageOpinionFormState = {
  reportText: string;
  legalBasis: string;
  conclusion: string;
  stageConcept: string;
  stageResult: string;
};

type CesadStageOpinionEditorProps = {
  initialState: CesadStageOpinionFormState;
  onSaveDraft: (input: CesadStageOpinionInput) => Promise<void>;
  onComplete: (input: CesadStageOpinionInput) => Promise<void>;
};

function toOpinionInput(form: CesadStageOpinionFormState): CesadStageOpinionInput {
  const reportText = form.reportText.trim();
  const conclusion = form.conclusion.trim();

  if (!reportText) throw new Error('Preencha o relatorio do parecer antes de salvar.');
  if (!conclusion) throw new Error('Preencha a conclusao do parecer antes de salvar.');

  return {
    reportText,
    conclusion,
    ...(form.legalBasis.trim() ? { legalBasis: form.legalBasis.trim() } : {}),
    ...(form.stageConcept.trim() ? { stageConcept: form.stageConcept.trim() } : {}),
    ...(form.stageResult.trim() ? { stageResult: form.stageResult.trim() } : {}),
  };
}

export function CesadStageOpinionEditor({
  initialState,
  onSaveDraft,
  onComplete,
}: CesadStageOpinionEditorProps) {
  const [form, setForm] = useState<CesadStageOpinionFormState>(initialState);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isBusy = isSaving || isCompleting;

  function update(field: keyof CesadStageOpinionFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setFeedbackMessage(null);
    setErrorMessage(null);
  }

  async function handleSaveDraft() {
    setIsSaving(true);
    setFeedbackMessage(null);
    setErrorMessage(null);

    try {
      await onSaveDraft(toOpinionInput(form));
      setFeedbackMessage('Rascunho do parecer salvo.');
    } catch (error) {
      setErrorMessage(getRequestErrorMessage(error, 'Nao foi possivel salvar o rascunho do parecer.'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleComplete() {
    setIsCompleting(true);
    setFeedbackMessage(null);
    setErrorMessage(null);

    try {
      await onComplete(toOpinionInput(form));
      setFeedbackMessage('Parecer concluido e registrado. Prossiga para a assinatura na leitura consolidada.');
    } catch (error) {
      setErrorMessage(getRequestErrorMessage(error, 'Nao foi possivel concluir o parecer.'));
    } finally {
      setIsCompleting(false);
    }
  }

  return (
    <section className="cesad-opinion-editor" aria-label="Editor do parecer CESAD">
      <div className="cesad-opinion-editor__header">
        <span className="section-chip">Elaboracao do parecer</span>
        <h3>Parecer CESAD da etapa</h3>
        <p>Preencha o relatorio, a fundamentacao e a conclusao. Salve como rascunho para continuar depois ou conclua quando estiver pronto.</p>
      </div>

      <div className="cesad-opinion-editor__form">
        <label className="field-group" htmlFor="cesad-opinion-report">
          <span>Relatorio <abbr title="obrigatorio">*</abbr></span>
          <textarea
            id="cesad-opinion-report"
            rows={6}
            value={form.reportText}
            disabled={isBusy}
            onChange={(e) => update('reportText', e.target.value)}
            placeholder="Descreva a analise da etapa, as condicoes observadas e os fundamentos do parecer."
          />
        </label>

        <label className="field-group" htmlFor="cesad-opinion-legal">
          <span>Fundamentacao legal</span>
          <textarea
            id="cesad-opinion-legal"
            rows={3}
            value={form.legalBasis}
            disabled={isBusy}
            onChange={(e) => update('legalBasis', e.target.value)}
            placeholder="Artigos, decretos ou normas aplicaveis (opcional)."
          />
        </label>

        <label className="field-group" htmlFor="cesad-opinion-conclusion">
          <span>Conclusao <abbr title="obrigatorio">*</abbr></span>
          <textarea
            id="cesad-opinion-conclusion"
            rows={3}
            value={form.conclusion}
            disabled={isBusy}
            onChange={(e) => update('conclusion', e.target.value)}
            placeholder="Parecer favoravel, desfavoravel ou condicional — com justificativa objetiva."
          />
        </label>

        <div className="cesad-opinion-editor__row">
          <label className="field-group" htmlFor="cesad-opinion-concept">
            <span>Conceito da etapa</span>
            <input
              id="cesad-opinion-concept"
              type="text"
              value={form.stageConcept}
              disabled={isBusy}
              onChange={(e) => update('stageConcept', e.target.value)}
              placeholder="Ex: Satisfatorio (opcional)"
            />
          </label>

          <label className="field-group" htmlFor="cesad-opinion-result">
            <span>Resultado da etapa</span>
            <input
              id="cesad-opinion-result"
              type="text"
              value={form.stageResult}
              disabled={isBusy}
              onChange={(e) => update('stageResult', e.target.value)}
              placeholder="Ex: Aprovado (opcional)"
            />
          </label>
        </div>
      </div>

      {feedbackMessage ? (
        <FeedbackAlert title="Operacao concluida" tone="success" description={feedbackMessage} />
      ) : null}

      {errorMessage ? (
        <FeedbackAlert title="Falha ao salvar parecer" tone="error" description={errorMessage} />
      ) : null}

      <div className="cesad-opinion-editor__actions">
        <button
          type="button"
          disabled={isBusy}
          onClick={() => void handleSaveDraft()}
        >
          {isSaving ? 'Salvando rascunho...' : 'Salvar rascunho'}
        </button>

        <button
          type="button"
          disabled={isBusy}
          onClick={() => void handleComplete()}
        >
          {isCompleting ? 'Concluindo parecer...' : 'Concluir parecer'}
        </button>
      </div>
    </section>
  );
}
