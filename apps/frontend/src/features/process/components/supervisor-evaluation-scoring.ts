import { calculateEvaluationRatingsScore, type EvaluationScoreScale } from '@sadep/contracts';
import type { EvaluationFactorDraft } from './supervisor-evaluation-types';

export { getAdministrativeConcept } from '@sadep/contracts';

export function clampCriterionRating(score: number, scale: EvaluationScoreScale = 'PERCENT_0_100'): number {
  if (!Number.isFinite(score)) {
    return 0;
  }

  const minimum = scale === 'PERCENT_0_100' ? 0 : 1;
  const maximum = scale === 'PERCENT_0_100' ? 100 : 5;
  return Math.min(maximum, Math.max(minimum, Math.round(score)));
}

export function calculateEvaluationScore(
  factors: EvaluationFactorDraft[],
  scale: EvaluationScoreScale = 'LEGACY_1_5',
) {
  return calculateEvaluationRatingsScore(
    factors.flatMap((factor) => factor.items.flatMap((item) => item.score === null ? [] : [item.score])),
    scale,
  );
}
