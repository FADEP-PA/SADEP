'use client';

import type { ReactNode } from 'react';

import { EVALUATION_TEXT_LIMIT_MESSAGE, isEvaluationTextWithinLimit, isValidEvaluationRating, isProvisionalStageResult, STAGE_4_PROVISIONAL_RESULT_NOTICE } from '@sadep/contracts';
import { EvaluationTextarea } from '@/shared/ui/evaluation-textarea';

import { FeedbackAlert } from '@/shared/ui/feedback-alert';
import { DetailList, WorkPageHeader, WorkSection } from '@/shared/ui/work-patterns';

import { EvaluationFactorCard } from './evaluation-factor-card';
import { calculateEvaluationScore, clampCriterionRating } from './supervisor-evaluation-scoring';
import type { EvaluationDraft, MonthlyObservation } from './supervisor-evaluation-types';
import { getStageObservationMonths } from './supervisor-evaluation-period';

type Props = {
  evaluation: EvaluationDraft;
  isSavingDraft: boolean;
  isSubmittingEvaluation: boolean;
  canSaveActiveDraft: boolean;
  canSubmitActiveEvaluation: boolean;
  submitButtonLabel: string;
  feedbackMessage: string | null;
  actionErrorMessage: string | null;
  leadingContent?: ReactNode;
  attachmentsContent?: ReactNode;
  isAttachmentsBusy?: boolean;
  onChange: (updater: (current: EvaluationDraft) => EvaluationDraft) => void;
  onBack: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
};

export function EvaluationDetailView({
  evaluation,
  isSavingDraft,
  isSubmittingEvaluation,
  canSaveActiveDraft,
  canSubmitActiveEvaluation,
  submitButtonLabel,
  feedbackMessage,
  actionErrorMessage,
  leadingContent,
  attachmentsContent,
  isAttachmentsBusy = false,
  onChange,
  onBack,
  onSaveDraft,
  onSubmit,
}: Props) {
  const months = getStageObservationMonths(evaluation.row.currentStageSequence);
  const provisional = isProvisionalStageResult(evaluation.row.currentStageSequence);
  function toggleFactor(factorId: string) {
    onChange((current) => ({
      ...current,
      expandedFactorIds: current.expandedFactorIds.includes(factorId)
        ? current.expandedFactorIds.filter((id) => id !== factorId)
        : [factorId],
    }));
  }

  function updateFactorScore(factorId: string, itemId: string, score: number | null) {
    onChange((current) => {
      const factors = current.factors.map((factor) => factor.id === factorId ? {
        ...factor,
        items: factor.items.map((item) => item.id === itemId ? {
          ...item,
          score: score === null ? null : current.scoreScale === 'LEGACY_1_5' ? clampCriterionRating(score, current.scoreScale) : score,
          hasRecordedScore: score !== null,
        } : item),
      } : factor);
      return { ...current, factors, ...calculateEvaluationScore(factors, current.scoreScale) };
    });
  }

  function addObservation() {
    if (months.length === 0) return;
    onChange((current) => ({
      ...current,
      monthlyObservations: [...current.monthlyObservations, {
        id: `obs-${current.monthlyObservations.length + 1}`,
        monthLabel: months[current.monthlyObservations.length % months.length]!,
        description: '',
        attachmentName: '',
      }],
    }));
  }

  function updateObservation(id: string, patch: Partial<MonthlyObservation>) {
    onChange((current) => ({ ...current, monthlyObservations: current.monthlyObservations.map((item) => item.id === id ? { ...item, ...patch } : item) }));
  }

  const exceedsTextLimit = [evaluation.unitCompetencies, evaluation.serverAssignments, evaluation.generalComments, ...evaluation.monthlyObservations.map((item) => item.description)].some((value) => !isEvaluationTextWithinLimit(value));
  const hasInvalidScores = evaluation.factors.some((factor) => factor.items.some((item) => item.score !== null && !isValidEvaluationRating(item.score, evaluation.scoreScale)));
  const editable = canSaveActiveDraft || canSubmitActiveEvaluation;
  const missingScores = evaluation.factors.flatMap(factor => factor.items).filter(item => item.score === null).length;
  const requiredFieldsMissing = !evaluation.unitCompetencies.trim() && !evaluation.serverAssignments.trim();
  const hasCompleteScores = !hasInvalidScores && evaluation.factors.every((factor) => factor.items.every((item) => item.score !== null));

  return (
    <div className="work-page evaluation-workspace">
      <button type="button" className="ghost-button work-back" disabled={isAttachmentsBusy} onClick={onBack}>← Voltar às avaliações</button>
      <WorkPageHeader
        title="Avaliação de desempenho"
        description={`${evaluation.row.stageLabel} · ${evaluation.row.serverName}`}
        status={leadingContent ? 'Aguardando confirmação' : editable ? 'Em preenchimento' : 'Somente leitura'}
        statusTone={leadingContent ? 'warning' : editable ? 'info' : 'neutral'}
      />

      {leadingContent}

      <WorkSection title="Identificação" className="evaluation-workspace__identity">
        <DetailList items={[
          { label: 'Servidor', value: evaluation.row.serverName },
          { label: 'Etapa', value: evaluation.row.stageLabel },
          { label: 'Chefia imediata', value: evaluation.row.supervisorName || 'Não informado' },
        ]} />
      </WorkSection>

      <WorkSection title="Conteúdo da avaliação">
        {editable ? <div className="form-stack">
          <label className="field-group" htmlFor="unit-competencies">
            <span>Competências da unidade</span>
            <EvaluationTextarea aria-label="Competências da unidade" id="unit-competencies" rows={2} value={evaluation.unitCompetencies} disabled={!editable} onChange={(event) => onChange((current) => ({ ...current, unitCompetencies: event.target.value }))} />
          </label>
          <label className="field-group" htmlFor="server-assignments">
            <span>Atribuições no período</span>
            <EvaluationTextarea aria-label="Atribuições no período" id="server-assignments" rows={2} value={evaluation.serverAssignments} disabled={!editable} onChange={(event) => onChange((current) => ({ ...current, serverAssignments: event.target.value }))} />
            <small>Inclua apenas atividades realizadas nesta etapa.</small>
          </label>
          <label className="field-group" htmlFor="general-comments">
            <span>Comentários gerais</span>
            <EvaluationTextarea aria-label="Comentários gerais" id="general-comments" rows={2} value={evaluation.generalComments} disabled={!editable} onChange={(event) => onChange((current) => ({ ...current, generalComments: event.target.value }))} />
          </label>
        </div> : <DetailList items={[
          { label: 'Competências da unidade', value: evaluation.unitCompetencies || 'Não informado' },
          { label: 'Atribuições no período', value: evaluation.serverAssignments || 'Não informado' },
          { label: 'Comentários gerais', value: evaluation.generalComments || 'Não informado' },
        ]} />}
      </WorkSection>

      <WorkSection title="Fatores de desempenho" className="evaluation-workspace__factors">
        <p className="muted-copy">{evaluation.scoreScale === 'PERCENT_0_100' ? 'Notas de 0 a 100, em intervalos de 10 pontos.' : 'Notas de 1 a 5.'}</p>
        <div className="evaluation-detail__factor-stack">
          {evaluation.factors.map((factor) => (
            <EvaluationFactorCard key={factor.id} factor={factor} disabled={!editable || isSavingDraft || isSubmittingEvaluation} provisional={provisional} scoreScale={evaluation.scoreScale} isExpanded={evaluation.expandedFactorIds.includes(factor.id)} onToggle={() => toggleFactor(factor.id)} onScoreChange={(itemId, score) => updateFactorScore(factor.id, itemId, score)} />
          ))}
        </div>
        <details className="compact-disclosure">
          <summary>Consultar faixas de conceito</summary>
            <div className="concept-guide">
            {evaluation.scoreScale === 'PERCENT_0_100' ? <><span><strong>0–49,9</strong> Insuficiente</span><span><strong>50–69,9</strong> Regular</span><span><strong>70–89,9</strong> Bom</span><span><strong>90–100</strong> Excelente</span></> : <span><strong>Registro histórico 1–5</strong> Conceito preservado</span>}
          </div>
        </details>
      </WorkSection>

      {editable || evaluation.monthlyObservations.length > 0 ? <WorkSection title="Observações mensais" className="evaluation-workspace__observations" action={editable ? <button type="button" className="secondary-button" disabled={months.length === 0} onClick={addObservation}>Adicionar observação</button> : null}>
        {evaluation.monthlyObservations.length === 0 ? <p className="muted-copy">Não há observações registradas.</p> : (
          <div className="observation-list">{evaluation.monthlyObservations.map((observation) => (
            <div key={observation.id} className="observation-item">
              <label className="field-group"><span>Período</span><select value={observation.monthLabel} disabled={!editable} onChange={(event) => updateObservation(observation.id, { monthLabel: event.target.value })}>{!months.includes(observation.monthLabel) ? <option value={observation.monthLabel} disabled>{observation.monthLabel} (registro anterior)</option> : null}{months.map((month) => <option key={month}>{month}</option>)}</select></label>
              <label className="field-group"><span>Observação</span><EvaluationTextarea aria-label="Observação" rows={2} value={observation.description} disabled={!editable} onChange={(event) => updateObservation(observation.id, { description: event.target.value })} /></label>
            </div>
          ))}</div>
        )}
      </WorkSection> : null}

      {attachmentsContent}

      <WorkSection title={provisional ? 'Resumo provisório' : 'Resumo'} className="evaluation-workspace__summary">
        {provisional ? <p className="muted-copy">{STAGE_4_PROVISIONAL_RESULT_NOTICE}</p> : null}
        <p>{20 - missingScores}/20 critérios preenchidos</p>
        <div className="score-summary">
          <div><span>{provisional ? 'Média provisória' : 'Média da etapa'}</span><strong>{hasCompleteScores ? evaluation.stageAverage : '—'}</strong></div>
          <div><span>{provisional ? 'Conceito provisório' : 'Conceito'}</span><strong>{hasCompleteScores ? evaluation.administrativeConcept : '—'}</strong></div>
        </div>
        {editable && exceedsTextLimit ? <p className="field-error">{EVALUATION_TEXT_LIMIT_MESSAGE}</p> : null}
        {editable && hasInvalidScores ? <p className="field-error" role="alert">{evaluation.scoreScale === 'PERCENT_0_100' ? 'Informe notas de 0 a 100, em passos de 10.' : 'Informe notas inteiras de 1 a 5.'}</p> : null}
        {feedbackMessage ? <FeedbackAlert title="Avaliação atualizada" tone="success" description={feedbackMessage} /> : null}
        {actionErrorMessage ? <FeedbackAlert title="Não foi possível concluir" tone="error" description={actionErrorMessage} /> : null}
        {editable && (missingScores > 0 || requiredFieldsMissing || !canSubmitActiveEvaluation) ? <p className="field-error" role="status">{missingScores > 0 ? `Faltam ${missingScores} notas.` : requiredFieldsMissing ? 'Revise os campos obrigatórios: competências da unidade ou atribuições no período.' : 'O envio não está disponível no estado atual do processo.'}</p> : null}
        {editable ? (
          <div className="form-actions">
            <button type="button" className="secondary-button" disabled={isAttachmentsBusy || exceedsTextLimit || hasInvalidScores || isSavingDraft || isSubmittingEvaluation || !canSaveActiveDraft} onClick={onSaveDraft}>{isSavingDraft ? 'Salvando…' : 'Salvar rascunho'}</button>
            <button type="button" disabled={isAttachmentsBusy || exceedsTextLimit || hasInvalidScores || isSubmittingEvaluation || isSavingDraft || !canSubmitActiveEvaluation || !hasCompleteScores || requiredFieldsMissing} onClick={onSubmit}>{isSubmittingEvaluation ? 'Enviando…' : submitButtonLabel}</button>
          </div>
        ) : null}
      </WorkSection>
    </div>
  );
}
