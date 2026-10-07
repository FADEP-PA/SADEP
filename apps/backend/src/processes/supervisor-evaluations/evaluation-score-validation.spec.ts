import 'reflect-metadata';
import { isValidEvaluationRating, calculateEvaluationRatingsScore } from '@sadep/contracts';
import { isSupervisorEvaluationContentDto } from './dto/supervisor-evaluation.dto';

describe('Evaluation rating contracts', () => {
  it.each([0, 10, 50, 90, 100])('accepts legal percent rating %s', (rating) => {
    expect(isValidEvaluationRating(rating, 'PERCENT_0_100')).toBe(true);
    expect(isSupervisorEvaluationContentDto({
      scoreScale: 'PERCENT_0_100', scoringVersion: 2,
      criteria: [{ code: '1.1', label: 'Criterion', rating }],
    })).toBe(true);
  });

  it.each([1, 9, 11, 55, 99, -10, 110, 1.5, NaN, Infinity, '10', null])(
    'rejects invalid percent rating %s', (rating) => {
      expect(isValidEvaluationRating(rating, 'PERCENT_0_100')).toBe(false);
      expect(isSupervisorEvaluationContentDto({
        scoreScale: 'PERCENT_0_100', scoringVersion: 2,
        criteria: [{ code: '1.1', label: 'Criterion', rating }],
      })).toBe(false);
    },
  );

  it.each([1, 2, 3, 4, 5])('keeps legacy rating %s readable with explicit or omitted scale', (rating) => {
    const criteria = [{ code: '1.1', label: 'Criterion', rating }];
    expect(isSupervisorEvaluationContentDto({ criteria })).toBe(true);
    expect(isSupervisorEvaluationContentDto({ criteria, scoreScale: 'LEGACY_1_5', scoringVersion: 1 })).toBe(true);
  });

  it('preserves calculated averages that are not multiples of ten', () => {
    expect(calculateEvaluationRatingsScore([0, ...Array<number>(19).fill(50)], 'PERCENT_0_100').stageAverage).toBe('47.5');
  });
});
