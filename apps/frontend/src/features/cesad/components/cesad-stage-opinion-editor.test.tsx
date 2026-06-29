import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CesadStageOpinionEditor } from './cesad-stage-opinion-editor';
import type { CesadStageOpinionFormState } from './cesad-stage-opinion-editor';

const EMPTY_FORM: CesadStageOpinionFormState = {
  reportText: '',
  legalBasis: '',
  conclusion: '',
  stageConcept: '',
  stageResult: '',
};

const FILLED_FORM: CesadStageOpinionFormState = {
  reportText: 'Analise detalhada da etapa.',
  legalBasis: 'Art. 10 Decreto 1234',
  conclusion: 'Parecer favoravel.',
  stageConcept: 'Satisfatorio',
  stageResult: 'Aprovado',
};

describe('CesadStageOpinionEditor', () => {
  let onSaveDraft: ReturnType<typeof vi.fn>;
  let onComplete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSaveDraft = vi.fn().mockResolvedValue(undefined);
    onComplete = vi.fn().mockResolvedValue(undefined);
  });

  it('renderiza todos os campos do formulario', () => {
    render(
      <CesadStageOpinionEditor
        initialState={EMPTY_FORM}
        onSaveDraft={onSaveDraft}
        onComplete={onComplete}
      />,
    );

    expect(screen.getByLabelText(/Relatorio/i)).toBeTruthy();
    expect(screen.getByLabelText(/Fundamentacao legal/i)).toBeTruthy();
    expect(screen.getByLabelText(/Conclusao/i)).toBeTruthy();
    expect(screen.getByLabelText(/Conceito da etapa/i)).toBeTruthy();
    expect(screen.getByLabelText(/Resultado da etapa/i)).toBeTruthy();
  });

  it('renderiza os botoes de salvar rascunho e concluir parecer', () => {
    render(
      <CesadStageOpinionEditor
        initialState={EMPTY_FORM}
        onSaveDraft={onSaveDraft}
        onComplete={onComplete}
      />,
    );

    expect(screen.getByRole('button', { name: 'Salvar rascunho' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Concluir parecer' })).toBeTruthy();
  });

  it('chama onSaveDraft com o payload correto ao clicar em "Salvar rascunho"', async () => {
    render(
      <CesadStageOpinionEditor
        initialState={FILLED_FORM}
        onSaveDraft={onSaveDraft}
        onComplete={onComplete}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
    });

    expect(onSaveDraft).toHaveBeenCalledWith({
      reportText: 'Analise detalhada da etapa.',
      legalBasis: 'Art. 10 Decreto 1234',
      conclusion: 'Parecer favoravel.',
      stageConcept: 'Satisfatorio',
      stageResult: 'Aprovado',
    });
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('chama onComplete com o payload correto ao clicar em "Concluir parecer"', async () => {
    render(
      <CesadStageOpinionEditor
        initialState={FILLED_FORM}
        onSaveDraft={onSaveDraft}
        onComplete={onComplete}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Concluir parecer' }));
    });

    expect(onComplete).toHaveBeenCalledWith({
      reportText: 'Analise detalhada da etapa.',
      conclusion: 'Parecer favoravel.',
      legalBasis: 'Art. 10 Decreto 1234',
      stageConcept: 'Satisfatorio',
      stageResult: 'Aprovado',
    });
    expect(onSaveDraft).not.toHaveBeenCalled();
  });

  it('exibe mensagem de sucesso apos salvar rascunho', async () => {
    render(
      <CesadStageOpinionEditor
        initialState={FILLED_FORM}
        onSaveDraft={onSaveDraft}
        onComplete={onComplete}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
    });

    await waitFor(() => {
      expect(screen.getByText('Rascunho do parecer salvo.')).toBeTruthy();
    });
  });

  it('exibe mensagem de erro quando onSaveDraft rejeita', async () => {
    onSaveDraft.mockRejectedValueOnce(new Error('Erro de rede ao salvar.'));

    render(
      <CesadStageOpinionEditor
        initialState={FILLED_FORM}
        onSaveDraft={onSaveDraft}
        onComplete={onComplete}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
    });

    await waitFor(() => {
      expect(screen.getByText('Erro de rede ao salvar.')).toBeTruthy();
    });
  });

  it('exibe erro de validacao quando reportText esta vazio ao salvar', async () => {
    render(
      <CesadStageOpinionEditor
        initialState={{ ...FILLED_FORM, reportText: '' }}
        onSaveDraft={onSaveDraft}
        onComplete={onComplete}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
    });

    await waitFor(() => {
      expect(screen.getByText('Preencha o relatorio do parecer antes de salvar.')).toBeTruthy();
    });

    expect(onSaveDraft).not.toHaveBeenCalled();
  });

  it('exibe erro de validacao quando conclusion esta vazio ao concluir', async () => {
    render(
      <CesadStageOpinionEditor
        initialState={{ ...FILLED_FORM, conclusion: '' }}
        onSaveDraft={onSaveDraft}
        onComplete={onComplete}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Concluir parecer' }));
    });

    await waitFor(() => {
      expect(screen.getByText('Preencha a conclusao do parecer antes de salvar.')).toBeTruthy();
    });

    expect(onComplete).not.toHaveBeenCalled();
  });

  it('desabilita os botoes durante o salvamento', async () => {
    let resolveSave!: () => void;
    onSaveDraft.mockReturnValueOnce(new Promise<void>((res) => { resolveSave = res; }));

    render(
      <CesadStageOpinionEditor
        initialState={FILLED_FORM}
        onSaveDraft={onSaveDraft}
        onComplete={onComplete}
      />,
    );

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Salvando rascunho...' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Concluir parecer' })).toBeDisabled();
    });

    await act(async () => { resolveSave(); });
  });
});
