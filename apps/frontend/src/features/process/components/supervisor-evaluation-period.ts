const STAGE_MONTH_RANGES: Readonly<Record<number, readonly [number, number]>> = {
  1: [1, 6],
  2: [7, 12],
  3: [13, 24],
  4: [25, 32],
};

export function getStageObservationMonths(sequence: number): string[] {
  const range = STAGE_MONTH_RANGES[sequence];
  if (!range) return [];
  return Array.from({ length: range[1] - range[0] + 1 }, (_, index) => `${range[0] + index}º mês`);
}
