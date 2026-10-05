/** Existing score calculation, shared to render trusted system text without changing the scale. */
export function getAdministrativeConcept(totalScore: number): string {
  if (totalScore < 50) return 'Insuficiente';
  if (totalScore < 70) return 'Regular';
  if (totalScore < 90) return 'Bom';
  return 'Excelente';
}

export function calculateEvaluationRatingsScore(ratings: number[]) {
  const total = ratings.reduce((sum, rating) => sum + rating, 0);
  const average = ratings.length > 0 ? total / ratings.length : 0;
  return {
    totalStageScore: total.toFixed(1),
    stageAverage: average.toFixed(1),
    administrativeConcept: getAdministrativeConcept(total),
  };
}
