import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OfficialDocumentList } from './official-document-list';

const api = vi.hoisted(() => ({ getEvaluationDocumentPdf: vi.fn() }));
vi.mock('@/shared/api/services/processes-service', () => api);
const documents = ['Avaliação da chefia', 'Autoavaliação'].map((title, index) => ({ documentId: `doc-${index}`, title, hasArtifact: true, updatedAt: '2026-10-08T12:00:00Z', status: 'Assinado' }));

describe('OfficialDocumentList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getEvaluationDocumentPdf.mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' }));
    URL.createObjectURL = vi.fn().mockReturnValue('blob:official-document');
    URL.revokeObjectURL = vi.fn();
  });
  it('carrega sob demanda e mantém apenas um PDF aberto', async () => {
    render(<OfficialDocumentList processId="process" documents={documents} />);
    expect(api.getEvaluationDocumentPdf).not.toHaveBeenCalled();
    expect(screen.queryByTitle(/PDF —/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Visualizar PDF — Avaliação da chefia' }));
    const viewer = await screen.findByTitle('PDF — Avaliação da chefia');
    const hide = screen.getByRole('button', { name: 'Ocultar visualização — Avaliação da chefia' });
    const download = screen.getByRole('button', { name: 'Baixar PDF — Avaliação da chefia' });
    expect(hide.parentElement).toHaveClass('pdf-document-card__actions');
    expect(hide.nextElementSibling).toBe(download);
    expect(viewer.closest('.pdf-document-card__content')?.previousElementSibling).toHaveClass('pdf-document-card__header');
    expect(screen.queryByRole('link', { name: 'Baixar PDF' })).not.toBeInTheDocument();
    fireEvent.click(hide);
    expect(screen.queryByTitle('PDF — Avaliação da chefia')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Visualizar PDF — Avaliação da chefia' }));
    await screen.findByTitle('PDF — Avaliação da chefia');
    expect(api.getEvaluationDocumentPdf).toHaveBeenCalledWith('process', 'doc-0', expect.any(AbortSignal));
    fireEvent.click(screen.getByRole('button', { name: 'Visualizar PDF — Autoavaliação' }));
    expect(await screen.findByTitle('PDF — Autoavaliação')).toBeInTheDocument();
    expect(screen.queryByTitle('PDF — Avaliação da chefia')).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });
  it('baixa o documento sem abrir o viewer', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<OfficialDocumentList processId="process" documents={documents} />);
    fireEvent.click(screen.getByRole('button', { name: 'Baixar PDF — Autoavaliação' }));
    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(api.getEvaluationDocumentPdf).toHaveBeenCalledWith('process', 'doc-1');
    expect(screen.queryByTitle(/PDF —/)).not.toBeInTheDocument();
    click.mockRestore();
  });
});
