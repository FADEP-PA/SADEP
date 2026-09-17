'use client';

import { FeedbackAlert } from '@/shared/ui/feedback-alert';
import { EmptyState } from '@/shared/ui/operational-states';

import { EvaluationFactorCard } from './evaluation-factor-card';
import type { EvaluationDraft, MonthlyObservation } from './supervisor-evaluation-types';

const MONTHLY_OBSERVATION_OPTIONS = [
  '1º mês',
  '2º mês',
  '3º mês',
  '4º mês',
  '5º mês',
  '6º mês',
  '7º mês',
  '8º mês',
  '9º mês',
  '10º mês',
  '11º mês',
  '12º mês',
] as const;

function getConceptByAverage(average: number) {
  if (average < 50) {
    return { label: 'Insuficiente', className: 'evaluation-detail__concept evaluation-detail__concept--bad' };
  }
  if (average < 70) {
    return { label: 'Regular', className: 'evaluation-detail__concept evaluation-detail__concept--regular' };
  }
  if (average < 90) {
    return { label: 'Bom', className: 'evaluation-detail__concept evaluation-detail__concept--good' };
  }
  return { label: 'Excelente', className: 'evaluation-detail__concept evaluation-detail__concept--great' };
}

function calculateTotalAndAverage(factors: EvaluationDraft['factors']) {
  if (factors.length === 0) {
    return { totalStageScore: '0.0', stageAverage: '0.0', administrativeConcept: 'Insuficiente' };
  }
  const total = factors.reduce((sum, factor) => {
    const factorAvg =
      factor.items.length > 0
        ? factor.items.reduce((itemSum, item) => itemSum + item.score, 0) / factor.items.length
        : 0;
    return sum + factorAvg;
  }, 0);
  const average = total / factors.length;
  const concept = getConceptByAverage(average);
  return {
    totalStageScore: total.toFixed(1),
    stageAverage: average.toFixed(1),
    administrativeConcept: concept.label,
  };
}

function formatValidationDate(date = new Date()) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

type EvaluationDetailViewProps = {
  evaluation: EvaluationDraft;
  isSavingDraft: boolean;
  isSubmittingEvaluation: boolean;
  canSaveActiveDraft: boolean;
  canSubmitActiveEvaluation: boolean;
  submitButtonLabel: string;
  feedbackMessage: string | null;
  actionErrorMessage: string | null;
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
  onChange,
  onBack,
  onSaveDraft,
  onSubmit,
}: EvaluationDetailViewProps) {
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
      const nextFactors = current.factors.map((factor) =>
        factor.id === factorId
          ? {
              ...factor,
              items: factor.items.map((item) =>
                item.id === itemId ? { ...item, score: Math.min(100, Math.max(0, score)) } : item,
              ),
            }
          : factor,
      );
      const { totalStageScore, stageAverage, administrativeConcept } =
        calculateTotalAndAverage(nextFactors);
      return { ...current, factors: nextFactors, totalStageScore, stageAverage, administrativeConcept };
    });
  }

  function updateFinalResult(
    field: 'totalStageScore' | 'stageAverage' | 'administrativeConcept',
    value: string,
  ) {
    onChange((current) => {
      if (field === 'stageAverage') {
        const numValue = Number(value || 0);
        const concept = getConceptByAverage(numValue);
        return { ...current, stageAverage: value, administrativeConcept: concept.label };
      }
      return { ...current, [field]: value };
    });
  }

  function clearDefaultFinalScore(field: 'totalStageScore' | 'stageAverage') {
    onChange((current) => (current[field] === '0.0' ? { ...current, [field]: '' } : current));
  }

  function addMonthlyObservation() {
    onChange((current) => {
      const nextIndex = current.monthlyObservations.length + 1;
      const selectedMonths = new Set(current.monthlyObservations.map((obs) => obs.monthLabel));
      const nextMonth =
        MONTHLY_OBSERVATION_OPTIONS.find((month) => !selectedMonths.has(month)) ??
        MONTHLY_OBSERVATION_OPTIONS[Math.min(nextIndex - 1, MONTHLY_OBSERVATION_OPTIONS.length - 1)];
      return {
        ...current,
        monthlyObservations: [
          ...current.monthlyObservations,
          { id: `obs-${nextIndex}`, monthLabel: nextMonth, description: '', attachmentName: '' },
        ],
      };
    });
  }

  function updateObservation(id: string, patch: Partial<MonthlyObservation>) {
    onChange((current) => ({
      ...current,
      monthlyObservations: current.monthlyObservations.map((obs) =>
        obs.id === id ? { ...obs, ...patch } : obs,
      ),
    }));
  }

  function removeMonthlyObservation(id: string) {
    onChange((current) => ({
      ...current,
      monthlyObservations: current.monthlyObservations.filter((obs) => obs.id !== id),
    }));
  }

  return (
    <div className="evaluation-detail">
      <button
        type="button"
        className="ghost-button evaluation-detail__back"
        onClick={onBack}
      >
        ← Voltar
      </button>

      <div className="evaluation-detail__heading">
        <h3>Avaliação de desempenho - {evaluation.row.stageLabel}</h3>
        <p>Relatório Técnico Individual de Estágio Probatório</p>
      </div>

      <section className="evaluation-detail__card">
        <div className="evaluation-detail__section-title">
          I. Identificação do servidor e chefia (somente leitura)
        </div>

        <div className="evaluation-detail__identity-grid">
          <div>
            <span>Nome do servidor</span>
            <strong>{evaluation.row.serverName}</strong>
          </div>
          <div>
            <span>Cargo / matrícula</span>
            <strong>
              {evaluation.row.role} / {evaluation.row.registration}
            </strong>
          </div>
          <div>
            <span>Data exercício</span>
            <strong>{evaluation.row.exerciseStart}</strong>
          </div>
          <div>
            <span>Período de acompanhamento</span>
            <strong>{evaluation.row.trackingPeriod}</strong>
          </div>
          <div>
            <span>Unidade de lotação</span>
            <strong>Escola Estadual X</strong>
          </div>
          <div>
            <span>Chefia imediata</span>
            <strong>{evaluation.row.supervisorName}</strong>
          </div>
          <div>
            <span>Cargo da chefia</span>
            <strong>{evaluation.row.supervisorRole}</strong>
          </div>
        </div>
      </section>

      <section className="evaluation-detail__card">
        <div className="evaluation-detail__section-title">II. Competência da unidade</div>
        <label className="field-group">
          <textarea
            value={evaluation.unitCompetencies}
            onChange={(event) =>
              onChange((current) => ({ ...current, unitCompetencies: event.target.value }))
            }
            rows={5}
            placeholder="Descreva as competências e objetivos da unidade escolar..."
          />
          <small>{evaluation.unitCompetencies.length} / 450 caracteres</small>
        </label>
      </section>

      <section className="evaluation-detail__card">
        <div className="evaluation-detail__section-title">
          III. Atribuições do servidor-estagiário no período
        </div>
        <label className="field-group">
          <textarea
            value={evaluation.serverAssignments}
            onChange={(event) =>
              onChange((current) => ({ ...current, serverAssignments: event.target.value }))
            }
            rows={5}
            placeholder="Descreva as tarefas e responsabilidades específicas do servidor..."
          />
          <small>{evaluation.serverAssignments.length} / 450 caracteres</small>
        </label>
      </section>

      <section className="evaluation-detail__card">
        <div className="evaluation-detail__section-header">
          <div className="evaluation-detail__section-title">
            IV. Considerações sobre o período (mensal)
          </div>

          <button
            type="button"
            className="evaluation-detail__compact-button"
            onClick={addMonthlyObservation}
          >
            + Inserir observação
          </button>
        </div>

        {evaluation.monthlyObservations.length > 0 ? (
          <div className="evaluation-detail__observation-list">
            {evaluation.monthlyObservations.map((observation) => (
              <article key={observation.id} className="evaluation-detail__observation-item">
                <div className="evaluation-detail__observation-row">
                  <label className="evaluation-detail__month-select">
                    <span>Mês da observação</span>
                    <select
                      value={observation.monthLabel}
                      onChange={(event) =>
                        updateObservation(observation.id, { monthLabel: event.target.value })
                      }
                    >
                      {MONTHLY_OBSERVATION_OPTIONS.map((month) => (
                        <option key={month} value={month}>
                          {month}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => removeMonthlyObservation(observation.id)}
                  >
                    Remover
                  </button>
                </div>
                <textarea
                  value={observation.description}
                  onChange={(event) =>
                    updateObservation(observation.id, { description: event.target.value })
                  }
                  rows={4}
                  placeholder="Relate fatos e evidências do desempenho observado..."
                />

                <div className="evaluation-detail__observation-attachment">
                  <label>
                    <input
                      type="file"
                      onChange={(event) =>
                        updateObservation(observation.id, {
                          attachmentName: event.target.files?.[0]?.name ?? '',
                        })
                      }
                    />
                    <span>Anexar arquivo</span>
                  </label>

                  <small>
                    {observation.attachmentName || 'Nenhum arquivo anexado para este mês.'}
                  </small>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nenhuma observacao mensal registrada"
            description="Inclua uma observacao para documentar fatos relevantes deste periodo."
          />
        )}
      </section>

      <section className="evaluation-detail__card">
        <div className="evaluation-detail__section-title">
          V. Instruções para avaliação técnica (conceitos oficiais)
        </div>

        <div className="evaluation-detail__concept-table">
          <div className="evaluation-detail__concept-header">
            <div>Faixa de pontos</div>
            <div>Conceito</div>
            <div>Descrição técnica</div>
          </div>
          <div className="evaluation-detail__concept-row">
            <div>0 a 49,9</div>
            <div className="evaluation-detail__concept evaluation-detail__concept--bad">Insuficiente</div>
            <div>"O servidor não atendeu as expectativas de desempenho definidas previamente."</div>
          </div>
          <div className="evaluation-detail__concept-row">
            <div>50 a 69,9</div>
            <div className="evaluation-detail__concept evaluation-detail__concept--regular">Regular</div>
            <div>"O servidor atendeu parcialmente as expectativas de desempenho definidas previamente, necessitando melhorar a atuação."</div>
          </div>
          <div className="evaluation-detail__concept-row">
            <div>70 a 89,9</div>
            <div className="evaluation-detail__concept evaluation-detail__concept--good">Bom</div>
            <div>"O servidor atendeu as expectativas de desempenho definidas previamente, porém ainda apresentou aspectos passíveis de melhora."</div>
          </div>
          <div className="evaluation-detail__concept-row">
            <div>90 a 100</div>
            <div className="evaluation-detail__concept evaluation-detail__concept--great">Excelente</div>
            <div>"O servidor apresentou desempenho plenamente satisfatório quanto ao aspecto avaliado, superando as expectativas."</div>
          </div>
        </div>
      </section>

      <div className="evaluation-detail__factors-title">VI. Pontuação dos fatores</div>

      <div className="evaluation-detail__factor-stack">
        {evaluation.factors.map((factor) => (
          <EvaluationFactorCard
            key={factor.id}
            factor={factor}
            isExpanded={evaluation.expandedFactorIds.includes(factor.id)}
            onToggle={() => toggleFactor(factor.id)}
            onScoreChange={(itemId, score) => updateFactorScore(factor.id, itemId, score)}
          />
        ))}
      </div>

      <section className="evaluation-detail__card evaluation-detail__summary-card">
        <div className="evaluation-detail__final-score-panel">
          <label>
            <span>Pontuação total da etapa (soma das médias)</span>
            <input
              type="number"
              min="0"
              step="0.1"
              value={evaluation.totalStageScore ?? '0.0'}
              onFocus={() => clearDefaultFinalScore('totalStageScore')}
              onChange={(event) => updateFinalResult('totalStageScore', event.target.value)}
            />
          </label>

          <label>
            <span>Média da etapa</span>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={evaluation.stageAverage ?? '0.0'}
              onFocus={() => clearDefaultFinalScore('stageAverage')}
              onChange={(event) => updateFinalResult('stageAverage', event.target.value)}
            />
          </label>

          <label>
            <span>Conceito administrativo</span>
            <div className="evaluation-detail__concept-tag-wrap" aria-label="Conceito administrativo">
              <div className={getConceptByAverage(Number(evaluation.stageAverage || 0)).className}>
                {evaluation.administrativeConcept}
              </div>
            </div>
          </label>
        </div>

        <p className="evaluation-detail__final-note">
          "A média da 4ª etapa será provisória, devendo ser confirmada conforme normas específicas."
        </p>

        <div className="evaluation-detail__signature-card">
          <div className="evaluation-detail__signature-title">
            Validação do Relatório Individual de Estágio Probatório
          </div>

          <div className="evaluation-detail__signature-grid">
            <div className="evaluation-detail__signature-box">
              <div>Aguardando conclusão do preenchimento</div>
              <strong>{evaluation.row.serverName}</strong>
              <span>Assinatura do servidor-estagiário</span>
            </div>

            <div className="evaluation-detail__signature-box">
              <div>Aguardando conclusão do preenchimento</div>
              <strong>{evaluation.row.supervisorName}</strong>
              <span>Assinatura da chefia imediata ({evaluation.row.supervisorRole})</span>
            </div>
          </div>

          <div className="evaluation-detail__signature-place-date">
            Belém, Pará - {formatValidationDate()}
          </div>
        </div>

        {feedbackMessage ? (
          <div className="evaluation-detail__feedback">{feedbackMessage}</div>
        ) : null}

        {actionErrorMessage ? (
          <FeedbackAlert
            title="Operação não concluída"
            tone="error"
            description={actionErrorMessage}
          />
        ) : null}

        <div className="evaluation-detail__actions">
          <button
            type="button"
            className="secondary-button"
            disabled={isSavingDraft || isSubmittingEvaluation || !canSaveActiveDraft}
            onClick={onSaveDraft}
          >
            {isSavingDraft ? 'Salvando...' : 'Salvar rascunho'}
          </button>
          <button
            type="button"
            className="warning-button"
            disabled={isSubmittingEvaluation || isSavingDraft || !canSubmitActiveEvaluation}
            onClick={onSubmit}
          >
            {isSubmittingEvaluation ? 'Submetendo...' : submitButtonLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
