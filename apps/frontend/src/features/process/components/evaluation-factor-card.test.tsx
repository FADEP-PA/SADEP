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
      score: 0,
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
  it('remove o zero visual ao focar e substitui pelo número digitado', () => {
    render(<TestHarness />);

    const input = screen.getByRole('spinbutton') as HTMLInputElement;

    expect(input.value).toBe('0');

    fireEvent.focus(input);
    expect(input.value).toBe('');

    fireEvent.change(input, { target: { value: '1' } });
    expect(input.value).toBe('1');
    expect(input.value).not.toBe('01');
  });

  it('restaura zero se o campo perder foco sem nova nota', () => {
    render(<TestHarness />);

    const input = screen.getByRole('spinbutton') as HTMLInputElement;

    fireEvent.focus(input);
    expect(input.value).toBe('');

    fireEvent.blur(input);
    expect(input.value).toBe('0');
  });
});
