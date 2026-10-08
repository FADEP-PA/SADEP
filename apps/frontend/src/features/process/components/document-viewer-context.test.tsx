import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DocumentViewerProvider } from './document-viewer-context';
import { EvaluationPdfViewer } from './evaluation-pdf-viewer';
import { OfficialDocumentList } from './official-document-list';
const api = vi.hoisted(() => ({ getEvaluationDocumentPdf: vi.fn() }));
vi.mock('@/shared/api/services/processes-service', () => api);

describe('Document viewers in one process workspace', () => {
  beforeEach(() => {
    api.getEvaluationDocumentPdf.mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' }));
    URL.createObjectURL = vi.fn(() => 'blob:document'); URL.revokeObjectURL = vi.fn();
  });
  it('opens the current document, then replaces it with either history document', async () => {
    render(<DocumentViewerProvider>
      <EvaluationPdfViewer defaultOpen processId="process" documentContext={{ documentId: 'current', hasArtifact: true }} title="Atual" updatedAt="v1" />
      <OfficialDocumentList processId="process" documents={['Anterior', 'Atual no histórico'].map((title, index) => ({ documentId: index ? 'current' : 'previous', title, hasArtifact: true, updatedAt: 'v1', status: 'Assinado' }))} />
    </DocumentViewerProvider>);
    expect(await screen.findByTitle('Atual')).toBeInTheDocument();
    expect(document.querySelectorAll('iframe')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Visualizar PDF — Anterior' }));
    expect(await screen.findByTitle('PDF — Anterior')).toBeInTheDocument();
    expect(screen.queryByTitle('Atual')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Visualizar PDF — Atual no histórico' }));
    expect(await screen.findByTitle('PDF — Atual no histórico')).toBeInTheDocument();
    expect(screen.queryByTitle('PDF — Anterior')).not.toBeInTheDocument();
    expect(document.querySelectorAll('iframe')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar visualização — Atual no histórico' }));
    expect(document.querySelectorAll('iframe')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Visualizar PDF — Atual' }));
    expect(screen.getByTitle('Atual')).toBeInTheDocument();
    expect(document.querySelectorAll('iframe')).toHaveLength(1);
  });
  it('does not open analysis documents automatically', () => {
    render(<DocumentViewerProvider><OfficialDocumentList processId="process" documents={['Chefia', 'Servidor'].map(title => ({ documentId: title, title, hasArtifact: true, updatedAt: 'v1', status: 'Assinado' }))} /></DocumentViewerProvider>);
    expect(document.querySelectorAll('iframe')).toHaveLength(0);
    expect(screen.getAllByRole('button', { name: /Visualizar PDF/ })).toHaveLength(2);
  });
});
