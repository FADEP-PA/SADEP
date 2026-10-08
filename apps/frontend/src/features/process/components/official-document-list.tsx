'use client';

import { useState } from 'react';
import { getEvaluationDocumentPdf } from '@/shared/api/services/processes-service';
import { getRequestErrorMessage } from '@/shared/api/http-error';
import { EvaluationPdfViewer } from './evaluation-pdf-viewer';
import { formatDateTime } from './process-formatters';
import { PdfDocumentCard } from './pdf-document-card';

export type OfficialDocumentItem = {
  documentId: string;
  title: string;
  hasArtifact: boolean;
  updatedAt: string;
  status: string;
};

export function OfficialDocumentList({ processId, documents }: { processId: string; documents: OfficialDocumentItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(document: OfficialDocumentItem) {
    setDownloadingId(document.documentId);
    setError(null);
    try {
      const pdf = await getEvaluationDocumentPdf(processId, document.documentId);
      const url = URL.createObjectURL(pdf);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = `${document.title}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, 'Não foi possível baixar o PDF.'));
    } finally { setDownloadingId(null); }
  }

  return <div className="form-stack">
    {error ? <p role="alert">{error}</p> : null}
    {documents.length === 0 ? <p className="muted-copy">Nenhum documento emitido nesta etapa.</p> : null}
    {documents.map(document => <PdfDocumentCard key={document.documentId} title={document.title} metadata={<span>{document.status} · {formatDateTime(document.updatedAt)}</span>} actions={<>
      <button type="button" className="secondary-button" aria-label={`${activeId === document.documentId ? 'Ocultar visualização' : 'Visualizar PDF'} — ${document.title}`} aria-expanded={activeId === document.documentId} onClick={() => setActiveId(current => current === document.documentId ? null : document.documentId)}>{activeId === document.documentId ? 'Ocultar visualização' : 'Visualizar PDF'}</button>
      <button type="button" className="secondary-button" aria-label={`Baixar PDF — ${document.title}`} disabled={downloadingId !== null || !document.hasArtifact} onClick={() => void download(document)}>{downloadingId === document.documentId ? 'Baixando…' : 'Baixar PDF'}</button>
    </>}>
      {activeId === document.documentId ? <EvaluationPdfViewer processId={processId} documentContext={document} updatedAt={document.updatedAt} title={`PDF — ${document.title}`} controls={false} /> : null}
    </PdfDocumentCard>)}
  </div>;
}
