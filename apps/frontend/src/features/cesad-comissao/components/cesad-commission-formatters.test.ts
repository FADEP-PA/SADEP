import { describe, expect, it } from 'vitest';

import { getCivilYear, toUtcTimestamp } from './cesad-commission-formatters';

describe('getCivilYear (ano civil independente de timezone)', () => {
  it('extrai o ano da data civil YYYY-MM-DD sem depender do fuso local', () => {
    expect(getCivilYear('2026-01-01')).toBe(2026);
    expect(getCivilYear('2025-12-31')).toBe(2025);
    expect(getCivilYear('2026-01-01')).toBe(2026);
  });

  it('também extrai o ano de timestamps completos retornados pela API', () => {
    expect(getCivilYear('2026-01-01T00:00:00.000Z')).toBe(2026);
    expect(getCivilYear('2025-12-31T00:00:00.000Z')).toBe(2025);
  });
});

describe('toUtcTimestamp (data civil preservada na serialização)', () => {
  it('serializa a data civil sem deslocar o dia', () => {
    expect(toUtcTimestamp('2026-01-01')).toBe('2026-01-01T00:00:00.000Z');
    expect(toUtcTimestamp('2025-12-31')).toBe('2025-12-31T00:00:00.000Z');
  });
});
