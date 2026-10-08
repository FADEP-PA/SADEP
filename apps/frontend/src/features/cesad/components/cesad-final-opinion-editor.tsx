'use client';

import { type CesadFinalOpinionInput } from '@sadep/contracts';
import { useState } from 'react';

import { getRequestErrorMessage, HttpError } from '@/shared/api/http-error';
import { FeedbackAlert } from '@/shared/ui/feedback-alert';
import { ActionFeedback } from '@/shared/ui/action-feedback';

type FormState = CesadFinalOpinionInput;
type Props = { initialState: FormState; onSaveDraft: (input: CesadFinalOpinionInput) => Promise<void>; onComplete: (input: CesadFinalOpinionInput) => Promise<void> };

function toInput(form: FormState): CesadFinalOpinionInput {
  const reportText = form.reportText.trim();
  const finalConclusion = form.finalConclusion.trim();
  if (!reportText) throw new Error('Preencha o relatório do parecer antes de salvar.');
  if (!finalConclusion) throw new Error('Preencha a conclusão final antes de salvar.');
  return {
    reportText,
    finalConclusion,
    ...(form.legalBasis?.trim() ? { legalBasis: form.legalBasis.trim() } : {}),
    ...(form.finalResult?.trim() ? { finalResult: form.finalResult.trim() } : {}),
    ...(form.finalConcept?.trim() ? { finalConcept: form.finalConcept.trim() } : {}),
    ...(form.recommendation?.trim() ? { recommendation: form.recommendation.trim() } : {}),
  };
}

export function CesadFinalOpinionEditor({ initialState, onSaveDraft, onComplete }: Props) {
  const [form, setForm] = useState<FormState>(initialState);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = saving || completing;
  const update = (field: keyof FormState, value: string) => { setForm((current) => ({ ...current, [field]: value })); setFeedback(null); setError(null); };

  async function save() {
    setSaving(true); setFeedback(null); setError(null);
    try { await onSaveDraft(toInput(form)); setFeedback('Rascunho do parecer conclusivo salvo.'); }
    catch (requestError) { setError(getFinalOpinionError(requestError, 'Não foi possível salvar o rascunho.')); }
    finally { setSaving(false); }
  }
  async function complete() {
    setCompleting(true); setFeedback(null); setError(null);
    try { await onComplete(toInput(form)); setFeedback('Parecer conclusivo final concluído.'); }
    catch (requestError) { setError(getFinalOpinionError(requestError, 'Não foi possível concluir o parecer conclusivo.')); }
    finally { setCompleting(false); }
  }
  const field = (name: keyof FormState, label: string, rows = 3, required = false) => (
    <label className="field-group" htmlFor={`cesad-final-${name}`}>
      <span>{label} {required ? <abbr title="obrigatório">*</abbr> : null}</span>
      {rows > 0 ? <textarea id={`cesad-final-${name}`} rows={rows} value={form[name] ?? ''} disabled={busy} onChange={(event) => update(name, event.target.value)} /> : <input id={`cesad-final-${name}`} value={form[name] ?? ''} disabled={busy} onChange={(event) => update(name, event.target.value)} />}
    </label>
  );
  return <section className="cesad-opinion-editor" aria-label="Editor do parecer conclusivo final">
    <div className="cesad-opinion-editor__header"><h3>Parecer conclusivo final</h3></div>
    <div className="cesad-opinion-editor__form">{field('reportText', 'Relatório consolidado', 6, true)}{field('legalBasis', 'Fundamentação legal')}{field('finalConclusion', 'Conclusão final', 3, true)}{field('finalResult', 'Resultado final', 0)}{field('finalConcept', 'Conceito final', 0)}{field('recommendation', 'Recomendação para homologação')}</div>
    {feedback ? <ActionFeedback message={feedback} /> : null}
    {error ? <FeedbackAlert title="Falha no parecer conclusivo" tone="error" description={error} /> : null}
    <div className="cesad-opinion-editor__actions"><button type="button" className="secondary-button" disabled={busy} onClick={() => void save()}>{saving ? 'Salvando…' : 'Salvar rascunho'}</button><button type="button" disabled={busy} onClick={() => void complete()}>{completing ? 'Concluindo…' : 'Concluir parecer'}</button></div>
  </section>;
}

function getFinalOpinionError(error: unknown, fallback: string) {
  if (error instanceof HttpError) {
    if (error.status === 403) return 'Você não possui permissão para editar este parecer.';
    if (error.status === 409) return 'O parecer foi alterado por outro usuário. Recarregue o processo antes de tentar novamente.';
    if (error.status === 422) return getRequestErrorMessage(error, 'Os dados do parecer não atendem às validações do processo.');
  }
  return getRequestErrorMessage(error, fallback);
}
