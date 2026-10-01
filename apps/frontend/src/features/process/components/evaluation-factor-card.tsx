'use client';

import { useState } from 'react';

import type { EvaluationFactorDraft } from './supervisor-evaluation-types';

function calculateFactorAverage(factor: EvaluationFactorDraft): number {
  const total = factor.items.reduce((sum, item) => sum + item.score, 0);
  return total / factor.items.length;
}

export function EvaluationFactorCard({
  factor,
  isExpanded,
  onToggle,
  onScoreChange,
}: {
  factor: EvaluationFactorDraft;
  isExpanded: boolean;
  onToggle: () => void;
  onScoreChange: (itemId: string, score: number) => void;
}) {
  const [focusedScoreId, setFocusedScoreId] = useState<string | null>(null);
  const subtotal = factor.items.reduce((sum, item) => sum + item.score, 0);
  const average = calculateFactorAverage(factor);
  const hasCompleteScores = factor.items.every((item) => item.hasRecordedScore !== false);

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
          <strong>{hasCompleteScores ? average.toFixed(1) : '—'}</strong>
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
                  min={1}
                  max={5}
                  step={1}
                  value={
                    item.hasRecordedScore === false
                      ? ''
                      : focusedScoreId === item.id && item.score === 0
                        ? ''
                        : item.score
                  }
                  onFocus={() => setFocusedScoreId(item.id)}
                  onBlur={() =>
                    setFocusedScoreId((current) => (current === item.id ? null : current))
                  }
                  onChange={(event) => onScoreChange(item.id, Number(event.target.value || 0))}
                />
                <span>Nota</span>
              </div>
            </div>
          ))}

          <div className="evaluation-detail__factor-footer">
            <div>
              <span>Soma bruta subfatores</span>
              <strong>{hasCompleteScores ? subtotal.toFixed(1) : '—'}</strong>
            </div>
            <div>
              <span>Pontuação final do fator (média)</span>
              <strong>{hasCompleteScores ? average.toFixed(1) : '—'}</strong>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
