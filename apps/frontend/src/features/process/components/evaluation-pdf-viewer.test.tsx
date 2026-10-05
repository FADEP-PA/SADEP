import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpError } from '@/shared/api/http-error';
import { EvaluationPdfViewer } from './evaluation-pdf-viewer';

const api = vi.hoisted(() => ({ getEvaluationDocumentPdf: vi.fn() }));
vi.mock('@/shared/api/services/processes-service', () => api);

const context = { documentId: 'document-1', hasArtifact: true };
const pdf = new Blob(['%PDF-test'], { type: 'application/pdf' });

describe('EvaluationPdfViewer', () => {
  beforeEach(() => {
    api.getEvaluationDocumentPdf.mockReset().mockResolvedValue(pdf);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:authorized-pdf');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it.each(['PDF da avaliação da Chefia', 'PDF da autoavaliação do Servidor'])('carrega %s pelo endpoint e permite baixar', async (title) => {
    const { unmount } = render(<EvaluationPdfViewer processId="process-1" documentContext={context} updatedAt="v1" title={title} />);
    expect(screen.getByText('Carregando PDF…')).toBeInTheDocument();
    expect(await screen.findByTitle(title)).toHaveAttribute('src', 'blob:authorized-pdf');
    expect(api.getEvaluationDocumentPdf).toHaveBeenCalledWith('process-1', 'document-1', expect.any(AbortSignal));
    expect(screen.getByRole('link', { name: 'Baixar PDF' })).toHaveAttribute('href', 'blob:authorized-pdf');
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:authorized-pdf');
  });

  it('mostra preparação sem requisitar artefato ausente e permite verificar', async () => {
    render(<EvaluationPdfViewer processId="process-1" documentContext={{ ...context, hasArtifact: false }} updatedAt="v1" title="Documento" />);
    expect(screen.getByText('PDF em preparação ou aguardando geração.')).toBeInTheDocument();
    expect(api.getEvaluationDocumentPdf).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Verificar PDF' }));
    expect(await screen.findByTitle('Documento')).toBeInTheDocument();
  });

  it.each([
    [403, 'Você não tem permissão para visualizar este PDF.'],
    [404, 'O PDF ainda não está disponível. Tente novamente mais tarde.'],
    [500, 'Não foi possível carregar o PDF. Tente novamente.'],
  ])('trata HTTP %s e permite nova tentativa', async (status, message) => {
    api.getEvaluationDocumentPdf.mockRejectedValueOnce(new HttpError(Number(status), 'Erro'));
    render(<EvaluationPdfViewer processId="process-1" documentContext={context} updatedAt="v1" title="Documento" />);
    expect(await screen.findByText(String(message))).toBeInTheDocument();
    expect(screen.queryByTitle('Documento')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByTitle('Documento')).toBeInTheDocument();
  });

  it('trata falha de conexão e ausência do documento lógico', async () => {
    const { rerender } = render(<EvaluationPdfViewer processId="process-1" documentContext={null} updatedAt="v1" title="Documento" />);
    expect(screen.getByText('Documento PDF indisponível.')).toBeInTheDocument();
    expect(api.getEvaluationDocumentPdf).not.toHaveBeenCalled();
    api.getEvaluationDocumentPdf.mockRejectedValueOnce(new Error('Network failure'));
    rerender(<EvaluationPdfViewer processId="process-1" documentContext={context} updatedAt="v1" title="Documento" />);
    expect(await screen.findByText('Não foi possível carregar o PDF. Tente novamente.')).toBeInTheDocument();
  });

  it('recarrega após assinatura/atualização e remove a URL antiga', async () => {
    const { rerender } = render(<EvaluationPdfViewer processId="process-1" documentContext={context} updatedAt="v1" title="Documento" />);
    await screen.findByTitle('Documento');
    rerender(<EvaluationPdfViewer processId="process-1" documentContext={context} updatedAt="v2" title="Documento" />);
    await screen.findByTitle('Documento');
    expect(api.getEvaluationDocumentPdf).toHaveBeenCalledTimes(2);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:authorized-pdf');
  });

  it('ignora resposta atrasada ao trocar processo e cancela a requisição', async () => {
    let resolve!: (value: Blob) => void;
    api.getEvaluationDocumentPdf.mockImplementationOnce(() => new Promise<Blob>((done) => { resolve = done; }));
    const { rerender } = render(<EvaluationPdfViewer processId="process-1" documentContext={context} updatedAt="v1" title="Documento" />);
    const signal = api.getEvaluationDocumentPdf.mock.calls[0]![2] as AbortSignal;
    rerender(<EvaluationPdfViewer processId="process-2" documentContext={null} updatedAt="v1" title="Documento" />);
    await act(async () => resolve(pdf));
    expect(signal.aborted).toBe(true);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText('Documento PDF indisponível.')).toBeInTheDocument());
  });
});
