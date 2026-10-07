'use client';

import { isValidEvaluationRating, type EvaluationScoreScale } from '@sadep/contracts';
import type { EvaluationFactorDraft } from './supervisor-evaluation-types';

function calculateFactorAverage(factor: EvaluationFactorDraft): number | null {
  const scores = factor.items.flatMap((item) => item.score === null ? [] : [item.score]);
  return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
}

export function EvaluationFactorCard({
  factor,
  isExpanded,
  onToggle,
  onScoreChange,
  scoreScale = 'PERCENT_0_100',
}: {
  factor: EvaluationFactorDraft;
  isExpanded: boolean;
  onToggle: () => void;
  onScoreChange: (itemId: string, score: number | null) => void;
  scoreScale?: EvaluationScoreScale;
}) {
  const subtotal = factor.items.reduce((sum, item) => sum + (item.score ?? 0), 0);
  const average = calculateFactorAverage(factor);

  return (
    <section className="evaluation-detail__factor-card">
      <button
        type="button"
        className="evaluation-detail__factor-header"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={`factor-${factor.id}`}
      >
        <div className="evaluation-detail__factor-title">
          <strong>{factor.title}</strong>
        </div>

        <div className="evaluation-detail__factor-metric">
          <span>Média</span>
          <strong>{average === null ? '—' : average.toFixed(1)}</strong>
        </div>
        <svg className="evaluation-detail__factor-chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="m5.5 3.5 4.5 4.5-4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isExpanded ? (
        <div className="evaluation-detail__factor-body" id={`factor-${factor.id}`}>
          {factor.items.map((item) => (
            <div key={item.id} className="evaluation-detail__score-row">
              <p>{item.label}</p>

              <div className="evaluation-detail__score-input-wrap">
                <input
                  aria-label={`Nota: ${item.label}`}
                  type="number"
                  min={scoreScale === 'PERCENT_0_100' ? 0 : 1}
                  max={scoreScale === 'PERCENT_0_100' ? 100 : 5}
                  step={scoreScale === 'PERCENT_0_100' ? 10 : 1}
                  aria-invalid={item.score !== null && !isValidEvaluationRating(item.score, scoreScale)}
                  aria-describedby={`score-help-${factor.id}-${item.id}`}
                  value={
                    item.score === null ? '' : item.score
                  }
                  onChange={(event) => onScoreChange(item.id, event.target.value === '' ? null : Number(event.target.value))}
                />
                <span>Nota</span>
                <small id={`score-help-${factor.id}-${item.id}`}>
                  {scoreScale === 'PERCENT_0_100' ? 'Informe uma nota de 0 a 100, em passos de 10.' : 'Informe uma nota inteira de 1 a 5.'}
                </small>
              </div>
            </div>
          ))}

          <div className="evaluation-detail__factor-footer">
            <div>
              <span>Soma bruta subfatores</span>
              <strong>{average === null ? '—' : subtotal.toFixed(1)}</strong>
            </div>
            <div>
              <span>Pontuação final do fator (média)</span>
              <strong>{average === null ? '—' : average.toFixed(1)}</strong>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
