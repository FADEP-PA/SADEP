import { isValidEvaluationRating, type EvaluationScoreScale } from '@sadep/contracts';

export interface EvaluationFactorScores {
  factorScores: number[];
  scoreScale: EvaluationScoreScale;
  stageAverage: number;
}

/** Derive only factors whose four original subfactors are actually identifiable. */
export function evaluationFactorScores(value: unknown): EvaluationFactorScores | null {
  if (!value || typeof value !== 'object') return null;
  const content = value as { scoreScale?: unknown; criteria?: unknown };
  if (!Array.isArray(content.criteria) || content.criteria.length !== 20) return null;
  const scale: EvaluationScoreScale = content.scoreScale === 'PERCENT_0_100' ? 'PERCENT_0_100' : 'LEGACY_1_5';
  const factors: number[] = [];
  for (let factor = 1; factor <= 5; factor++) {
    const ratings: number[] = [];
    for (let subfactor = 1; subfactor <= 4; subfactor++) {
      const matches = content.criteria.filter((item: unknown) => item && typeof item === 'object' &&
        (item as { code?: unknown }).code === `${factor}.${subfactor}`);
      if (matches.length !== 1) return null;
      const rating = (matches[0] as { rating?: unknown }).rating;
      if (!isValidEvaluationRating(rating, scale)) return null;
      ratings.push(rating);
    }
    factors.push(ratings.reduce((sum, rating) => sum + rating, 0) / 4);
  }
  return { factorScores: factors, scoreScale: scale, stageAverage: factors.reduce((sum, score) => sum + score, 0) / 5 };
}
