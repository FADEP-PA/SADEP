import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DocumentViewerProvider, useDocumentViewer } from './document-viewer-context';
import { EvaluationPdfViewer } from './evaluation-pdf-viewer';
import { OfficialDocumentList, type OfficialDocumentItem } from './official-document-list';
import { HttpError } from '@/shared/api/http-error';
const api = vi.hoisted(() => ({ getEvaluationDocumentPdf: vi.fn() }));
vi.mock('@/shared/api/services/processes-service', () => api);
const makeDocument = (title: string, date: string, stageSequence = 1): OfficialDocumentItem => ({ documentId: title, title, hasArtifact: true, createdAt: date, stageSequence, updatedAt: date, status: 'Assinado' });
const chefia = makeDocument('Chefia', '2026-10-08T10:34:00Z');
const self = makeDocument('Autoavaliação', '2026-10-08T11:10:00Z');
const opinion = makeDocument('Parecer', '2026-10-08T12:00:00Z');
function Workspace({ documents, notice = '' }: { documents: OfficialDocumentItem[]; notice?: string }) {
  return <DocumentViewerProvider><p>{notice}</p><OfficialDocumentList processId="process" documents={documents} /></DocumentViewerProvider>;
}

describe('One official PDF per process workspace', () => {
  beforeEach(() => {
    api.getEvaluationDocumentPdf.mockReset().mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' }));
    URL.createObjectURL = vi.fn(() => 'blob:document'); URL.revokeObjectURL = vi.fn();
  });
  it('opens the latest analysis PDF without a profile-specific rule', async () => {
    render(<Workspace documents={[self, chefia]} />);
    expect(await screen.findByTitle('PDF — Autoavaliação')).toBeInTheDocument();
    expect(screen.queryByTitle('PDF — Chefia')).not.toBeInTheDocument();
    expect(document.querySelectorAll('iframe')).toHaveLength(1);
  });
  it('preserves hide and manual selection across unrelated rerenders', async () => {
    const { rerender } = render(<Workspace documents={[chefia, self]} />);
    await screen.findByTitle('PDF — Autoavaliação');
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar visualização — Autoavaliação' }));
    rerender(<Workspace documents={[{ ...self }, { ...chefia }]} notice="Rascunho salvo" />);
    expect(document.querySelectorAll('iframe')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Visualizar PDF — Chefia' }));
    await screen.findByTitle('PDF — Chefia');
    rerender(<Workspace documents={[chefia, self]} notice="Outro estado local" />);
    expect(screen.getByTitle('PDF — Chefia')).toBeInTheDocument();
    expect(document.querySelectorAll('iframe')).toHaveLength(1);
  });
  it('opens a genuinely new later document after the previous one was hidden', async () => {
    const { rerender } = render(<Workspace documents={[chefia, self]} />);
    await screen.findByTitle('PDF — Autoavaliação');
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar visualização — Autoavaliação' }));
    rerender(<Workspace documents={[opinion, chefia, self]} />);
    await screen.findByTitle('PDF — Parecer');
    expect(document.querySelectorAll('iframe')).toHaveLength(1);
  });
  it('ignores missing artifacts and unauthorized PDFs', async () => {
    render(<Workspace documents={[chefia, { ...self, hasArtifact: false }, { ...opinion, authorized: false }]} />);
    await screen.findByTitle('PDF — Chefia');
    expect(document.querySelectorAll('iframe')).toHaveLength(1);
  });
  it('falls back when the endpoint rejects the latest PDF', async () => {
    api.getEvaluationDocumentPdf.mockImplementation((_process: string, id: string) => id === opinion.documentId ? Promise.reject(new HttpError(403, 'Forbidden')) : Promise.resolve(new Blob(['%PDF'], { type: 'application/pdf' })));
    render(<Workspace documents={[chefia, opinion]} />);
    await screen.findByTitle('PDF — Chefia');
    expect(screen.queryByTitle('PDF — Parecer')).not.toBeInTheDocument();
  });
  it('closes the viewer when no available PDF is authorized', async () => {
    api.getEvaluationDocumentPdf.mockRejectedValue(new HttpError(403, 'Forbidden'));
    render(<Workspace documents={[opinion]} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Visualizar PDF — Parecer' })).toHaveAttribute('aria-expanded', 'false'));
    expect(document.querySelectorAll('iframe')).toHaveLength(0);
  });
  it('opens the latest PDF when switching stages and returning to an earlier stage', async () => {
    function StageDocuments() {
      const [stage, setStage] = useState(1);
      const viewer = useDocumentViewer();
      return <><select aria-label="Etapa" value={stage} onChange={event => { const next = Number(event.target.value); viewer.selectStage?.(next); setStage(next); }}><option value={1}>1ª etapa</option><option value={2}>2ª etapa</option></select><OfficialDocumentList processId="process" documents={stage === 1 ? [chefia, self] : [makeDocument('Etapa 2', '2026-10-08T13:00:00Z', 2)]} /></>;
    }
    render(<DocumentViewerProvider><StageDocuments /></DocumentViewerProvider>);
    await screen.findByTitle('PDF — Autoavaliação');
    fireEvent.change(screen.getByLabelText('Etapa'), { target: { value: '2' } });
    await screen.findByTitle('PDF — Etapa 2');
    fireEvent.change(screen.getByLabelText('Etapa'), { target: { value: '1' } });
    await screen.findByTitle('PDF — Autoavaliação');
    expect(document.querySelectorAll('iframe')).toHaveLength(1);
  });
  it('does not duplicate a PDF in history or reopen it for a signature refresh', async () => {
    function Current({ signedAt }: { signedAt: string }) {
      return <DocumentViewerProvider><EvaluationPdfViewer processId="process" documentContext={{ ...self, signatures: [{ status: 'COMPLETED', signedAt }] }} chronology={{ createdAt: self.createdAt }} title="Atual" updatedAt={signedAt} /><OfficialDocumentList processId="process" documents={[self, chefia]} /></DocumentViewerProvider>;
    }
    const { rerender } = render(<Current signedAt="2026-10-08T11:10:00Z" />);
    await screen.findByTitle('Atual');
    expect(document.querySelectorAll('iframe')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar visualização — Atual' }));
    rerender(<Current signedAt="2026-10-08T11:15:00Z" />);
    await waitFor(() => expect(document.querySelectorAll('iframe')).toHaveLength(0));
  });
});
