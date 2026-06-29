'use client';

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
  const subtotal = factor.items.reduce((sum, item) => sum + item.score, 0);
  const average = calculateFactorAverage(factor);

  return (
    <section className="evaluation-detail__factor-card">
      <button
        type="button"
        className="evaluation-detail__factor-header"
        onClick={onToggle}
      >
        <div className="evaluation-detail__factor-title">
          <span>{isExpanded ? '▼' : '▶'}</span>
          <strong>{factor.title}</strong>
        </div>

        <div className="evaluation-detail__factor-metric">
          <span>Média do fator</span>
          <strong>{average.toFixed(1)}</strong>
        </div>
      </button>

      {isExpanded ? (
        <div className="evaluation-detail__factor-body">
          {factor.items.map((item) => (
            <div key={item.id} className="evaluation-detail__score-row">
              <p>{item.label}</p>

              <div className="evaluation-detail__score-input-wrap">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={item.score}
                  onChange={(event) => onScoreChange(item.id, Number(event.target.value || 0))}
                />
                <span>Nota</span>
              </div>
            </div>
          ))}

          <div className="evaluation-detail__factor-footer">
            <div>
              <span>Soma bruta subfatores</span>
              <strong>{subtotal.toFixed(1)}</strong>
            </div>
            <div>
              <span>Pontuação final do fator (média)</span>
              <strong>{average.toFixed(1)}</strong>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
