export const LEGACY_EVALUATION_SCORING_VERSION = 1 as const;
export const PERCENT_EVALUATION_SCORING_VERSION = 2 as const;
export type EvaluationScoringVersion =
  | typeof LEGACY_EVALUATION_SCORING_VERSION
  | typeof PERCENT_EVALUATION_SCORING_VERSION;

export type EvaluationScoreScale = 'LEGACY_1_5' | 'PERCENT_0_100';

export function getAdministrativeConcept(finalAverage: number): string {
  if (finalAverage < 50) return 'Insuficiente';
  if (finalAverage < 70) return 'Regular';
  if (finalAverage < 90) return 'Bom';
  return 'Excelente';
}

export function calculateEvaluationRatingsScore(
  ratings: number[],
  scale: EvaluationScoreScale = 'LEGACY_1_5',
) {
  const total = ratings.reduce((sum, rating) => sum + rating, 0);
  const average = ratings.length > 0 ? total / ratings.length : 0;
  const finalScore = scale === 'PERCENT_0_100' ? average : total;
  return {
    totalStageScore: finalScore.toFixed(1),
    stageAverage: average.toFixed(1),
    administrativeConcept: getAdministrativeConcept(finalScore),
  };
}
