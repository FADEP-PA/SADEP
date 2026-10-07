import { describe, expect, it } from 'vitest';
import { isValidEvaluationRating } from '@sadep/contracts';

import type { EvaluationFactorDraft } from './supervisor-evaluation-types';
import {
  calculateEvaluationScore,
  clampCriterionRating,
  getAdministrativeConcept,
} from './supervisor-evaluation-scoring';

function buildFactors(score: number | null): EvaluationFactorDraft[] {
  return Array.from({ length: 5 }, (_, factorIndex) => ({
    id: `factor-${factorIndex + 1}`,
    title: `Factor ${factorIndex + 1}`,
    items: Array.from({ length: 4 }, (_, itemIndex) => ({
      id: `${factorIndex + 1}.${itemIndex + 1}`,
      label: `Criterion ${factorIndex + 1}.${itemIndex + 1}`,
      score,
      hasRecordedScore: true,
    })),
  }));
}

describe('supervisor evaluation scoring', () => {
  it.each([
    { rating: 1, total: '20.0', average: '1.0', concept: 'Insuficiente' },
    { rating: 3, total: '60.0', average: '3.0', concept: 'Regular' },
    { rating: 4, total: '80.0', average: '4.0', concept: 'Bom' },
    { rating: 5, total: '100.0', average: '5.0', concept: 'Excelente' },
  ])('preserves the historical 1-to-5 calculation: $rating', ({ rating, total, average, concept }) => {
    expect(calculateEvaluationScore(buildFactors(rating), 'LEGACY_1_5')).toEqual({
      totalStageScore: total,
      stageAverage: average,
      administrativeConcept: concept,
    });
  });

  it('uses the 0-to-100 final average for the administrative concept bands', () => {
    expect(getAdministrativeConcept(49.9)).toBe('Insuficiente');
    expect(getAdministrativeConcept(50)).toBe('Regular');
    expect(getAdministrativeConcept(70)).toBe('Bom');
    expect(getAdministrativeConcept(90)).toBe('Excelente');
  });

  it('calculates new scores in the 0-to-100 scale and ignores empty criteria', () => {
    expect(calculateEvaluationScore(buildFactors(null), 'PERCENT_0_100')).toEqual({
      totalStageScore: '0.0',
      stageAverage: '0.0',
      administrativeConcept: 'Insuficiente',
    });
    expect(calculateEvaluationScore(buildFactors(50), 'PERCENT_0_100').stageAverage).toBe('50.0');
    expect(calculateEvaluationScore(buildFactors(100), 'PERCENT_0_100').administrativeConcept).toBe('Excelente');
  });

  it('uses the contracts rule for percent input without rounding invalid scores', () => {
    for (const rating of [0, 10, 50, 90, 100]) expect(isValidEvaluationRating(rating, 'PERCENT_0_100')).toBe(true);
    for (const rating of [1, 9, 11, 55, 99]) expect(isValidEvaluationRating(rating, 'PERCENT_0_100')).toBe(false);
  });

  it('preserves historical input normalization', () => {
    expect(clampCriterionRating(0, 'LEGACY_1_5')).toBe(1);
    expect(clampCriterionRating(3.4, 'LEGACY_1_5')).toBe(3);
    expect(clampCriterionRating(6, 'LEGACY_1_5')).toBe(5);
  });

  it('does not round the average of legal ratings to a step of ten', () => {
    const factors = buildFactors(50);
    factors[0]!.items[0]!.score = 0;
    expect(calculateEvaluationScore(factors, 'PERCENT_0_100').stageAverage).toBe('47.5');
  });
});
