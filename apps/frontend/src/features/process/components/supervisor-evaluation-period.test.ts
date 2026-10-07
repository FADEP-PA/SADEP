import { describe, expect, it } from 'vitest';
import { getStageObservationMonths } from './supervisor-evaluation-period';

describe('stage observation months', () => {
  it.each([[1, 1, 6], [2, 7, 12], [3, 13, 24], [4, 25, 32]])(
    'returns the exact months for sequence %s', (sequence, first, last) => {
      expect(getStageObservationMonths(sequence)).toEqual(Array.from({ length: last - first + 1 }, (_, index) => `${first + index}º mês`));
    },
  );
  it('does not invent a period for an unknown sequence', () => {
    expect(getStageObservationMonths(0)).toEqual([]);
    expect(getStageObservationMonths(5)).toEqual([]);
  });
});
