import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActionFeedback } from './action-feedback';

describe('Transient action result', () => {
  afterEach(() => vi.useRealTimers());
  it('expires without presenting the process as concluded', () => {
    vi.useFakeTimers();
    render(<ActionFeedback message="Autoavaliação enviada com sucesso." />);
    expect(screen.getByRole('status')).toHaveTextContent('Autoavaliação enviada com sucesso.');
    expect(screen.queryByText('Concluído')).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
  it('allows immediate dismissal', () => {
    render(<ActionFeedback message="Rascunho salvo." />);
    fireEvent.click(screen.getByRole('button', { name: 'Dispensar mensagem' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
