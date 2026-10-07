'use client';

import { useEffect, useRef, useState } from 'react';
import type { HomologationStatusRef } from '@sadep/contracts';
import { acknowledgePersonalNotification, getPersonalNotificationPdf, getPersonalNotificationStatus } from '@/shared/api/services/processes-service';
import { getRequestErrorMessage } from '@/shared/api/http-error';
import { FeedbackAlert } from '@/shared/ui/feedback-alert';
import { WorkSection } from '@/shared/ui/work-patterns';
import { formatDateTime } from './process-formatters';

export function PersonalNotificationCard({ processId }: { processId: string }) {
  const [status, setStatus] = useState<HomologationStatusRef | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const activeProcess = useRef(processId);
  useEffect(() => {
    activeProcess.current = processId;
    let active = true;
    setStatus(null); setPdfUrl(null); setError(null);
    getPersonalNotificationStatus(processId).then(result => { if (active) setStatus(result); })
      .catch(() => { if (active) setError('Não foi possível carregar a Notificação Pessoal.'); });
    return () => { active = false; };
  }, [processId]);
  useEffect(() => { if (pdfUrl) return () => URL.revokeObjectURL(pdfUrl); }, [pdfUrl]);

  async function run(action: 'view' | 'acknowledge') {
    if (lock.current || (action === 'acknowledge' && !status?.notificationDocument?.canAcknowledge)) return;
    lock.current = true; setBusy(true); setError(null);
    try {
      if (action === 'view') {
        const pdf = await getPersonalNotificationPdf(processId);
        if (activeProcess.current !== processId) return;
        setPdfUrl(URL.createObjectURL(pdf));
      } else {
        await acknowledgePersonalNotification(processId);
      }
      const next = await getPersonalNotificationStatus(processId);
      if (activeProcess.current === processId) setStatus(next);
    } catch (requestError) {
      if (activeProcess.current === processId) setError(getRequestErrorMessage(requestError, 'Não foi possível concluir a ação. Tente novamente.'));
    } finally { lock.current = false; setBusy(false); }
  }

  return <WorkSection title="Notificação Pessoal">
    <p>Consulte o documento oficial com o resultado homologado da sua avaliação.</p>
    {error ? <FeedbackAlert title="Não foi possível concluir" tone="error" description={error} /> : null}
    <button type="button" disabled={busy || !status?.notificationDocument} onClick={() => void run('view')}>{busy ? 'Processando…' : 'Visualizar Notificação Pessoal'}</button>
    {pdfUrl ? <>
      <iframe title="Notificação Pessoal oficial" src={pdfUrl} style={{ width: '100%', height: 650, border: '1px solid #ccc', marginTop: 16 }} />
      <a href={pdfUrl} download="notificacao-pessoal.pdf">Baixar Notificação Pessoal</a>
    </> : null}
    {status?.acknowledgedAt ? <p>Ciência registrada em {formatDateTime(status.acknowledgedAt)}.</p> : <>
      <p>A ciência confirma o recebimento do resultado. Visualize o documento antes de confirmar.</p>
      <button type="button" disabled={busy || !status?.notificationDocument?.canAcknowledge} onClick={() => void run('acknowledge')}>Confirmar ciência da Notificação Pessoal</button>
    </>}
  </WorkSection>;
}
