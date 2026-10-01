import type { EvaluationFactorDraft } from './supervisor-evaluation-types';

export function clampCriterionRating(score: number): number {
  if (!Number.isFinite(score)) {
    return 1;
  }

  return Math.min(5, Math.max(1, Math.round(score)));
}

export function getAdministrativeConcept(totalScore: number): string {
  if (totalScore < 50) return 'Insuficiente';
  if (totalScore < 70) return 'Regular';
  if (totalScore < 90) return 'Bom';
  return 'Excelente';
}

export function calculateEvaluationScore(factors: EvaluationFactorDraft[]) {
  const items = factors.flatMap((factor) => factor.items);
  const total = items.reduce((sum, item) => sum + item.score, 0);
  const average = items.length > 0 ? total / items.length : 0;

  return {
    totalStageScore: total.toFixed(1),
    stageAverage: average.toFixed(1),
    administrativeConcept: getAdministrativeConcept(total),
  };
}
