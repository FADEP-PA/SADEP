'use client';

import { calculateEvaluationRatingsScore, isValidEvaluationRating, type EvaluationScoreScale } from '@sadep/contracts';
import type { EvaluationFactorDraft } from './supervisor-evaluation-types';

function calculateFactorAverage(factor: EvaluationFactorDraft, scoreScale: EvaluationScoreScale): number | null {
  const scores = factor.items.flatMap((item) => item.score === null ? [] : [item.score]);
  return scores.length > 0 ? Number(calculateEvaluationRatingsScore(scores, scoreScale).stageAverage) : null;
}

export function EvaluationFactorCard({
  factor,
  isExpanded,
  onToggle,
  onScoreChange,
  scoreScale = 'PERCENT_0_100',
  provisional = false,
  disabled = false,
}: {
  factor: EvaluationFactorDraft;
  isExpanded: boolean;
  onToggle: () => void;
  onScoreChange: (itemId: string, score: number | null) => void;
  scoreScale?: EvaluationScoreScale;
  provisional?: boolean;
  disabled?: boolean;
}) {
  const completed = factor.items.filter(item => item.score !== null).length;
  const average = calculateFactorAverage(factor, scoreScale);

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

        <span className="factor-progress">{completed}/{factor.items.length}</span>
        <div className="evaluation-detail__factor-metric">
          <span>{provisional ? 'Média provisória' : 'Média'}</span>
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
                <select disabled={disabled} aria-label={`Nota: ${item.label}`} value={item.score ?? ''} aria-invalid={item.score !== null && !isValidEvaluationRating(item.score, scoreScale)} onChange={(event) => { const value = event.target.value === '' ? null : Number(event.target.value); if (value === null || isValidEvaluationRating(value, scoreScale)) onScoreChange(item.id, value); }}>
                  <option value="">—</option>
                  {(scoreScale === 'PERCENT_0_100' ? Array.from({ length: 11 }, (_, i) => i * 10) : [1, 2, 3, 4, 5]).map(value => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>
            </div>
          ))}


        </div>
      ) : null}
    </section>
  );
}
