'use client';

import { useEffect, useState } from 'react';

import { HttpError } from '@/shared/api/http-error';
import { getEvaluationDocumentPdf } from '@/shared/api/services/processes-service';
import { useDocumentViewer } from './document-viewer-context';
import type { ReactNode } from 'react';
import { PdfDocumentCard } from './pdf-document-card';

type Props = {
  processId: string;
  documentContext: {
    documentId: string;
    hasArtifact: boolean;
    signatures?: Array<{ status: string; signedAt: string | null }>;
  } | null;
  updatedAt: string;
  title: string;
  controls?: boolean;
  defaultOpen?: boolean;
  metadata?: ReactNode;
};

export function EvaluationPdfViewer(props: Props) {
  const signatureVersion = JSON.stringify(props.documentContext?.signatures ?? []);
  return <PdfContent key={`${props.processId}:${props.documentContext?.documentId}:${props.updatedAt}:${props.documentContext?.hasArtifact}:${signatureVersion}`} {...props} />;
}

function PdfContent({ processId, documentContext, title, controls = true, defaultOpen = false, metadata }: Props) {
  const [attempt, setAttempt] = useState(0);
  const [url, setUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const viewer = useDocumentViewer(defaultOpen && controls);
  const expanded = viewer.active === viewer.instance;
  const shouldLoad = Boolean(documentContext?.hasArtifact || attempt > 0);
  const documentId = documentContext?.documentId;

  useEffect(() => {
    if (!documentId || !shouldLoad) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    setMessage(null);
    setUrl(null);
    void getEvaluationDocumentPdf(processId, documentId, controller.signal)
      .then((pdf) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(pdf);
        setUrl(objectUrl);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setMessage(error instanceof HttpError && error.status === 403
          ? 'Você não tem permissão para visualizar este PDF.'
          : error instanceof HttpError && error.status === 404
            ? 'O PDF ainda não está disponível. Tente novamente mais tarde.'
            : 'Não foi possível carregar o PDF. Tente novamente.');
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [processId, documentId, shouldLoad, attempt]);

  if (!documentId) return <p className="muted-copy" role="status">Documento PDF indisponível.</p>;
  const content = url ? <iframe title={title} src={url} style={{ width: '100%', height: '70vh', border: 0 }} /> : (
    <div className="form-stack">
      <p className="muted-copy" role="status">{message ?? (shouldLoad ? 'Carregando PDF…' : 'PDF em preparação ou aguardando geração.')}</p>
      {!shouldLoad || message ? <button type="button" className="secondary-button" onClick={() => setAttempt((current) => current + 1)}>{message ? 'Tentar novamente' : 'Verificar PDF'}</button> : null}
    </div>
  );
  if (!controls) return content;
  return <PdfDocumentCard title={title} metadata={metadata} actions={<>
    <button type="button" className="secondary-button" aria-label={`${expanded ? 'Ocultar visualização' : 'Visualizar PDF'} — ${title}`} aria-expanded={expanded} onClick={() => viewer.setActive(expanded ? null : viewer.instance)}>{expanded ? 'Ocultar visualização' : 'Visualizar PDF'}</button>
    {url ? <a className="secondary-button" href={url} download={`${title}.pdf`}>Baixar PDF</a> : <button type="button" className="secondary-button" disabled>Baixar PDF</button>}
  </>}>
    {expanded || !url ? content : null}
  </PdfDocumentCard>;
}
