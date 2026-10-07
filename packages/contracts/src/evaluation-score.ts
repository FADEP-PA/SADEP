export const LEGACY_EVALUATION_SCORING_VERSION = 1 as const;
export const PERCENT_EVALUATION_SCORING_VERSION = 2 as const;
export type EvaluationScoringVersion =
  | typeof LEGACY_EVALUATION_SCORING_VERSION
  | typeof PERCENT_EVALUATION_SCORING_VERSION;

export type EvaluationScoreScale = 'LEGACY_1_5' | 'PERCENT_0_100';

export const STAGE_4_PROVISIONAL_RESULT_NOTICE =
  'Resultado provisório da 4ª etapa, sujeito à confirmação ou revisão no período do 33º ao 36º mês.';

export function isProvisionalStageResult(sequence: number | undefined): boolean {
  return sequence === 4;
}

export function isValidEvaluationRating(
  value: unknown,
  scale: EvaluationScoreScale,
): value is number {
  if (typeof value !== 'number' || !Number.isInteger(value)) return false;
  if (scale === 'PERCENT_0_100') return value >= 0 && value <= 100 && value % 10 === 0;
  return scale === 'LEGACY_1_5' && value >= 1 && value <= 5;
}

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
