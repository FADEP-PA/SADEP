import { calculateEvaluationRatingsScore } from '@sadep/contracts';
import type { EvaluationFactorDraft } from './supervisor-evaluation-types';

export { getAdministrativeConcept } from '@sadep/contracts';

export function clampCriterionRating(score: number): number {
  if (!Number.isFinite(score)) {
    return 1;
  }

  return Math.min(5, Math.max(1, Math.round(score)));
}

export function calculateEvaluationScore(factors: EvaluationFactorDraft[]) {
  return calculateEvaluationRatingsScore(factors.flatMap((factor) => factor.items.map((item) => item.score)));
}
