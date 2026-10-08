'use client';

import { useEffect, useRef, useState } from 'react';
import type { HomologationStatusRef } from '@sadep/contracts';
import { acknowledgePersonalNotification, getPersonalNotificationPdf, getHomologationStatus } from '@/shared/api/services/processes-service';
import { getRequestErrorMessage } from '@/shared/api/http-error';
import { FeedbackAlert } from '@/shared/ui/feedback-alert';
import { WorkSection } from '@/shared/ui/work-patterns';
import { formatDateTime } from './process-formatters';
import { DocumentViewerBoundary, useDocumentViewer } from './document-viewer-context';
import { PdfDocumentCard } from './pdf-document-card';

export function PersonalNotificationCard({ processId }: { processId: string }) {
  return <DocumentViewerBoundary><NotificationContent processId={processId} /></DocumentViewerBoundary>;
}

function NotificationContent({ processId }: { processId: string }) {
  const [status, setStatus] = useState<HomologationStatusRef | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const viewer = useDocumentViewer(status?.notificationDocument ? [{ ...status.notificationDocument, generatedAt: status.notifiedAt, stageSequence: null }] : [], 1, true);
  const expanded = viewer.active === viewer.instance;
  const lock = useRef(false);
  const activeProcess = useRef(processId);
  useEffect(() => {
    activeProcess.current = processId;
    let active = true;
    setStatus(null); setPdfUrl(null); setError(null);
    getHomologationStatus(processId).then(result => { if (active) setStatus(result); })
      .catch(() => { if (active) setError('Não foi possível carregar a Notificação Pessoal.'); });
    return () => { active = false; };
  }, [processId]);
  useEffect(() => { if (pdfUrl) return () => URL.revokeObjectURL(pdfUrl); }, [pdfUrl]);

  async function run(action: 'view' | 'download' | 'acknowledge') {
    if (lock.current || (action === 'acknowledge' && !status?.notificationDocument?.canAcknowledge)) return;
    lock.current = true; setBusy(true); setError(null);
    try {
      if (action === 'view' || action === 'download') {
        const pdf = await getPersonalNotificationPdf(processId);
        if (activeProcess.current !== processId) return;
        const url = URL.createObjectURL(pdf);
        setPdfUrl(url);
        if (action === 'download') {
          const link = document.createElement('a'); link.href = url; link.download = 'notificacao-pessoal.pdf'; link.click();
        }
      } else {
        await acknowledgePersonalNotification(processId);
      }
      const next = await getHomologationStatus(processId);
      if (activeProcess.current === processId) setStatus(next);
    } catch (requestError) {
      if (activeProcess.current === processId) setError(getRequestErrorMessage(requestError, 'Não foi possível concluir a ação. Tente novamente.'));
    } finally { lock.current = false; setBusy(false); }
  }

  useEffect(() => {
    if (expanded && !pdfUrl && !busy && !error) void run('view');
  });

  return <WorkSection title="Notificação Pessoal">
    <p>Consulte o documento oficial com o resultado homologado da sua avaliação.</p>
    {error ? <FeedbackAlert title="Não foi possível concluir" tone="error" description={error} /> : null}
    {status?.acknowledgedAt ? <p>Ciência registrada em {formatDateTime(status.acknowledgedAt)}.</p> : null}
    <PdfDocumentCard title="Notificação Pessoal" hideTitle metadata={<span>{formatDateTime(status?.notifiedAt ?? null)}</span>} actions={<>
      <button type="button" className="secondary-button" disabled={busy || !status?.notificationDocument} aria-expanded={expanded} onClick={() => { if (expanded) viewer.setActive(null); else { viewer.setActive(viewer.instance); if (!pdfUrl) void run('view'); } }}>{expanded ? 'Ocultar visualização' : 'Visualizar PDF'}</button>
      {pdfUrl ? <a className="secondary-button" href={pdfUrl} download="notificacao-pessoal.pdf">Baixar PDF</a> : <button type="button" className="secondary-button" disabled={busy || !status?.notificationDocument} onClick={() => void run('download')}>Baixar PDF</button>}
    </>}>
      {expanded && pdfUrl ? <iframe title="Notificação Pessoal oficial" src={pdfUrl} style={{ width: '100%', height: '70vh', border: 0 }} /> : null}
    </PdfDocumentCard>
    {!status?.acknowledgedAt ? <>
      <p>A ciência confirma o recebimento do resultado. Visualize o documento antes de confirmar.</p>
      <button type="button" disabled={busy || !status?.notificationDocument?.canAcknowledge} onClick={() => void run('acknowledge')}>Confirmar ciência da Notificação Pessoal</button>
    </> : null}
  </WorkSection>;
}
