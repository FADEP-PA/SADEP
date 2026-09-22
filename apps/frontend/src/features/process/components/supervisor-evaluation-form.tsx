'use client';

import type { ReactNode } from 'react';

import { FeedbackAlert } from '@/shared/ui/feedback-alert';
import { DetailList, WorkPageHeader, WorkSection } from '@/shared/ui/work-patterns';

import { EvaluationFactorCard } from './evaluation-factor-card';
import type { EvaluationDraft, MonthlyObservation } from './supervisor-evaluation-types';

const MONTHS = ['1º mês', '2º mês', '3º mês', '4º mês', '5º mês', '6º mês', '7º mês', '8º mês', '9º mês', '10º mês', '11º mês', '12º mês'];

function getConcept(average: number) {
  if (average < 50) return 'Insuficiente';
  if (average < 70) return 'Regular';
  if (average < 90) return 'Bom';
  return 'Excelente';
}

function calculate(factors: EvaluationDraft['factors']) {
  const total = factors.reduce((sum, factor) => sum + factor.items.reduce((part, item) => part + item.score, 0) / factor.items.length, 0);
  const average = factors.length > 0 ? total / factors.length : 0;
  return { totalStageScore: total.toFixed(1), stageAverage: average.toFixed(1), administrativeConcept: getConcept(average) };
}

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
  onChange,
  onBack,
  onSaveDraft,
  onSubmit,
}: Props) {
  function toggleFactor(factorId: string) {
    onChange((current) => ({
      ...current,
      expandedFactorIds: current.expandedFactorIds.includes(factorId)
        ? current.expandedFactorIds.filter((id) => id !== factorId)
        : [...current.expandedFactorIds, factorId],
    }));
  }

  function updateFactorScore(factorId: string, itemId: string, score: number) {
    onChange((current) => {
      const factors = current.factors.map((factor) => factor.id === factorId ? {
        ...factor,
        items: factor.items.map((item) => item.id === itemId ? { ...item, score: Math.min(100, Math.max(0, score)) } : item),
      } : factor);
      return { ...current, factors, ...calculate(factors) };
    });
  }

  function addObservation() {
    onChange((current) => ({
      ...current,
      monthlyObservations: [...current.monthlyObservations, {
        id: `obs-${current.monthlyObservations.length + 1}`,
        monthLabel: MONTHS[current.monthlyObservations.length] ?? 'Período',
        description: '',
        attachmentName: '',
      }],
    }));
  }

  function updateObservation(id: string, patch: Partial<MonthlyObservation>) {
    onChange((current) => ({ ...current, monthlyObservations: current.monthlyObservations.map((item) => item.id === id ? { ...item, ...patch } : item) }));
  }

  const editable = canSaveActiveDraft || canSubmitActiveEvaluation;

  return (
    <div className="work-page evaluation-workspace">
      <button type="button" className="ghost-button work-back" onClick={onBack}>← Voltar às avaliações</button>
      <WorkPageHeader
        title="Avaliação de desempenho"
        description={`${evaluation.row.stageLabel} · ${evaluation.row.serverName}`}
        status={leadingContent ? 'Aguardando confirmação' : editable ? 'Em preenchimento' : 'Somente leitura'}
        statusTone={leadingContent ? 'warning' : editable ? 'info' : 'neutral'}
      />

      {leadingContent}

      <WorkSection title="Identificação">
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
            <textarea id="unit-competencies" rows={3} value={evaluation.unitCompetencies} disabled={!editable} onChange={(event) => onChange((current) => ({ ...current, unitCompetencies: event.target.value }))} />
          </label>
          <label className="field-group" htmlFor="server-assignments">
            <span>Atribuições no período</span>
            <textarea id="server-assignments" rows={3} value={evaluation.serverAssignments} disabled={!editable} onChange={(event) => onChange((current) => ({ ...current, serverAssignments: event.target.value }))} />
            <small>Inclua apenas atividades realizadas nesta etapa.</small>
          </label>
          <label className="field-group" htmlFor="general-comments">
            <span>Comentários gerais</span>
            <textarea id="general-comments" rows={3} value={evaluation.generalComments} disabled={!editable} onChange={(event) => onChange((current) => ({ ...current, generalComments: event.target.value }))} />
          </label>
        </div> : <DetailList items={[
          { label: 'Competências da unidade', value: evaluation.unitCompetencies || 'Não informado' },
          { label: 'Atribuições no período', value: evaluation.serverAssignments || 'Não informado' },
          { label: 'Comentários gerais', value: evaluation.generalComments || 'Não informado' },
        ]} />}
      </WorkSection>

      <WorkSection title="Fatores de desempenho">
        <div className="evaluation-detail__factor-stack">
          {evaluation.factors.map((factor) => (
            <EvaluationFactorCard key={factor.id} factor={factor} isExpanded={evaluation.expandedFactorIds.includes(factor.id)} onToggle={() => toggleFactor(factor.id)} onScoreChange={(itemId, score) => updateFactorScore(factor.id, itemId, score)} />
          ))}
        </div>
        <details className="compact-disclosure">
          <summary>Consultar faixas de conceito</summary>
          <div className="concept-guide">
            <span><strong>0–49,9</strong> Insuficiente</span><span><strong>50–69,9</strong> Regular</span><span><strong>70–89,9</strong> Bom</span><span><strong>90–100</strong> Excelente</span>
          </div>
        </details>
      </WorkSection>

      {editable || evaluation.monthlyObservations.length > 0 ? <WorkSection title="Observações mensais" action={editable ? <button type="button" className="secondary-button" onClick={addObservation}>Adicionar observação</button> : null}>
        {evaluation.monthlyObservations.length === 0 ? <p className="muted-copy">Nenhuma observação registrada.</p> : (
          <div className="observation-list">{evaluation.monthlyObservations.map((observation) => (
            <div key={observation.id} className="observation-item">
              <label className="field-group"><span>Período</span><select value={observation.monthLabel} disabled={!editable} onChange={(event) => updateObservation(observation.id, { monthLabel: event.target.value })}>{MONTHS.map((month) => <option key={month}>{month}</option>)}</select></label>
              <label className="field-group"><span>Observação</span><textarea rows={2} value={observation.description} disabled={!editable} onChange={(event) => updateObservation(observation.id, { description: event.target.value })} /></label>
            </div>
          ))}</div>
        )}
      </WorkSection> : null}

      <WorkSection title="Resumo">
        <div className="score-summary">
          <div><span>Pontuação</span><strong>{evaluation.totalStageScore}</strong></div>
          <div><span>Média</span><strong>{evaluation.stageAverage}</strong></div>
          <div><span>Conceito</span><strong>{evaluation.administrativeConcept}</strong></div>
        </div>
        {feedbackMessage ? <FeedbackAlert title="Avaliação atualizada" tone="success" description={feedbackMessage} /> : null}
        {actionErrorMessage ? <FeedbackAlert title="Não foi possível concluir" tone="error" description={actionErrorMessage} /> : null}
        {editable ? (
          <div className="form-actions">
            <button type="button" className="secondary-button" disabled={isSavingDraft || isSubmittingEvaluation || !canSaveActiveDraft} onClick={onSaveDraft}>{isSavingDraft ? 'Salvando…' : 'Salvar rascunho'}</button>
            <button type="button" disabled={isSubmittingEvaluation || isSavingDraft || !canSubmitActiveEvaluation} onClick={onSubmit}>{isSubmittingEvaluation ? 'Enviando…' : submitButtonLabel}</button>
          </div>
        ) : null}
      </WorkSection>
    </div>
  );
}
