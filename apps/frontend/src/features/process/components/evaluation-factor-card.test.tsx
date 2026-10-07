import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { EvaluationFactorCard } from './evaluation-factor-card';
import type { EvaluationFactorDraft } from './supervisor-evaluation-types';

const INITIAL_FACTOR: EvaluationFactorDraft = {
  id: 'assiduidade',
  title: 'Assiduidade',
  items: [
    {
      id: '1.1',
      label: '1.1 Cumpre o horário integralmente',
      score: null,
    },
  ],
};

function TestHarness() {
  const [factor, setFactor] = useState(INITIAL_FACTOR);

  return (
    <EvaluationFactorCard
      factor={factor}
      isExpanded
      onToggle={() => undefined}
      onScoreChange={(itemId, score) =>
        setFactor((current) => ({
          ...current,
          items: current.items.map((item) => (item.id === itemId ? { ...item, score } : item)),
        }))
      }
    />
  );
}

describe('EvaluationFactorCard', () => {
  it('offers only legal percent values and distinguishes zero from empty', () => {
    render(<TestHarness />); const input = screen.getByRole('combobox') as HTMLSelectElement;
    expect(Array.from(input.options).map(option => option.value)).toEqual(['', '0', '10', '20', '30', '40', '50', '60', '70', '80', '90', '100']);
    expect(input.value).toBe(''); fireEvent.change(input, { target: { value: '0' } }); expect(input.value).toBe('0');
    fireEvent.change(input, { target: { value: '' } }); expect(input.value).toBe('');
  });
  it('offers only legacy ratings without converting historical data', () => {
    render(<EvaluationFactorCard factor={{ ...INITIAL_FACTOR, items: [{ ...INITIAL_FACTOR.items[0], score: 5 }] }} isExpanded scoreScale="LEGACY_1_5" onToggle={() => undefined} onScoreChange={() => undefined} />);
    const input = screen.getByRole('combobox') as HTMLSelectElement;
    expect(Array.from(input.options).map(option => option.value)).toEqual(['', '1', '2', '3', '4', '5']); expect(input.value).toBe('5');
  });
  it('shows four completed criteria and their contract average', () => {
    render(<EvaluationFactorCard factor={{ ...INITIAL_FACTOR, items: [30, 90, 90, 90].map((score,i) => ({ id: String(i), label: 'Criterion', score })) }} isExpanded={false} onToggle={() => undefined} onScoreChange={() => undefined} />);
    expect(screen.getByRole('button').textContent).toContain('4/4'); expect(screen.getByRole('button').textContent).toContain('75.0');
  });
});
