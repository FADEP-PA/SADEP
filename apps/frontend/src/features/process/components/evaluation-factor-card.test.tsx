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
  it('não apresenta a média de um critério vazio', () => {
    render(
      <EvaluationFactorCard
        factor={{ ...INITIAL_FACTOR, items: [{ ...INITIAL_FACTOR.items[0], score: null }] }}
        isExpanded={false}
        onToggle={() => undefined}
        onScoreChange={() => undefined}
      />,
    );

    expect(screen.getByRole('button', { name: /Assiduidade/ }).textContent).toContain('—');
  });

  it('mantém a nota vazia ao abrir o fator', () => {
    render(
      <EvaluationFactorCard
        factor={{ ...INITIAL_FACTOR, items: [{ ...INITIAL_FACTOR.items[0], score: null }] }}
        isExpanded
        onToggle={() => undefined}
        onScoreChange={() => undefined}
      />,
    );

    expect((screen.getByRole('spinbutton', { name: /Nota:/ }) as HTMLInputElement).value).toBe('');
    expect(screen.getByText('Soma bruta subfatores').parentElement?.textContent).toContain('—');
  });

  it('aceita uma nota digitada sem prefixar zero', () => {
    render(<TestHarness />);

    const input = screen.getByRole('spinbutton') as HTMLInputElement;

    expect(input.value).toBe('');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '1' } });
    expect(input.value).toBe('1');
    expect(input.value).not.toBe('01');
  });

  it('mantém vazio quando perde foco sem nova nota e preserva zero como valor válido', () => {
    render(<TestHarness />);

    const input = screen.getByRole('spinbutton') as HTMLInputElement;

    fireEvent.focus(input);
    fireEvent.blur(input);
    expect(input.value).toBe('');

    fireEvent.change(input, { target: { value: '0' } });
    expect(input.value).toBe('0');
  });
});
