import { describe, expect, it } from 'vitest';

import type { EvaluationFactorDraft } from './supervisor-evaluation-types';
import {
  calculateEvaluationScore,
  clampCriterionRating,
  getAdministrativeConcept,
} from './supervisor-evaluation-scoring';

function buildFactors(score: number): EvaluationFactorDraft[] {
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
  ])('calculates 20 criterion ratings on the backend 1-to-5 scale: $rating', ({ rating, total, average, concept }) => {
    expect(calculateEvaluationScore(buildFactors(rating))).toEqual({
      totalStageScore: total,
      stageAverage: average,
      administrativeConcept: concept,
    });
  });

  it('uses the 0-to-100 total score for the administrative concept bands', () => {
    expect(getAdministrativeConcept(49.9)).toBe('Insuficiente');
    expect(getAdministrativeConcept(50)).toBe('Regular');
    expect(getAdministrativeConcept(70)).toBe('Bom');
    expect(getAdministrativeConcept(90)).toBe('Excelente');
  });

  it('normalizes criterion input to an integer between 1 and 5 without percentage rescaling', () => {
    expect(clampCriterionRating(0)).toBe(1);
    expect(clampCriterionRating(1)).toBe(1);
    expect(clampCriterionRating(3.4)).toBe(3);
    expect(clampCriterionRating(4.6)).toBe(5);
    expect(clampCriterionRating(100)).toBe(5);
  });
});
