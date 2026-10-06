'use client';

import { EvaluationAttachmentOrigin, type EvaluationAttachmentRef } from '@sadep/contracts';
import { useEffect, useRef, useState } from 'react';

import { HttpError, getRequestErrorMessage } from '@/shared/api/http-error';
import {
  downloadEvaluationAttachment,
  listEvaluationAttachments,
  removeSupervisorEvaluationAttachment,
  uploadSupervisorEvaluationAttachment,
} from '@/shared/api/services/evaluation-attachments-service';
import { FeedbackAlert } from '@/shared/ui/feedback-alert';
import { WorkSection } from '@/shared/ui/work-patterns';

const MAX_FILES = 5;
const MAX_BYTES = 10 * 1024 * 1024;
const FILE_FORMATS: Record<string, RegExp> = {
  'application/pdf': /\.pdf$/i,
  'image/jpeg': /\.jpe?g$/i,
  'image/jpg': /\.jpe?g$/i,
  'image/png': /\.png$/i,
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const unit = bytes < 1024 * 1024 ? 'KB' : 'MB';
  const size = bytes / (unit === 'KB' ? 1024 : 1024 * 1024);
  return `${size.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${unit}`;
}

function errorMessage(requestError: unknown) {
  return requestError instanceof HttpError && (requestError.status === 403 || requestError.status === 401)
    ? 'Você não tem autorização para realizar esta ação nos anexos.'
    : getRequestErrorMessage(requestError, 'Não foi possível acessar os anexos. Tente novamente.');
}

type Props = {
  processId: string;
  stageId: string;
  origin: EvaluationAttachmentOrigin;
  editable?: boolean;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
};

export function EvaluationAttachments(props: Props) {
  return <AttachmentsContent key={`${props.processId}:${props.stageId}:${props.origin}`} {...props} />;
}

function AttachmentsContent({ processId, stageId, origin, editable = false, disabled = false, onBusyChange }: Props) {
  const [attachments, setAttachments] = useState<EvaluationAttachmentRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ attachment: EvaluationAttachmentRef; url: string } | null>(null);
  const retry = useRef<{ action: () => Promise<void>; write: boolean } | null>(null);
  const lock = useRef(false);
  const objectUrl = useRef<string | null>(null);
  const mounted = useRef(true);
  const canManage = editable && origin === EvaluationAttachmentOrigin.SUPERVISOR_EVALUATION;
  const blocked = disabled || loading || busy !== null || !loaded;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void listEvaluationAttachments(processId, stageId, origin, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setAttachments(result.attachments);
        setLoaded(true);
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        setError(errorMessage(requestError));
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [processId, stageId, origin, attempt]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    };
  }, []);

  async function run(label: string, action: () => Promise<void>, write = false) {
    if (lock.current || disabled || (write && !canManage)) return;
    lock.current = true;
    setBusy(label);
    onBusyChange?.(true);
    setError(null);
    setFeedback(null);
    retry.current = { action, write };
    try {
      await action();
      retry.current = null;
    } catch (requestError) {
      if (mounted.current) setError(errorMessage(requestError));
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(null);
      onBusyChange?.(false);
    }
  }

  function upload(files: File[]) {
    if (!canManage || blocked || lock.current || files.length === 0) return;
    retry.current = null;
    setFeedback(null);
    if (attachments.length + files.length > MAX_FILES) {
      setError('São permitidos no máximo 5 anexos por avaliação.');
      return;
    }
    for (const file of files) {
      if (!FILE_FORMATS[file.type]?.test(file.name)) {
        setError(`Formato inválido: ${file.name}. Selecione PDF, JPG ou PNG.`);
        return;
      }
      if (file.size === 0 || file.size > MAX_BYTES) {
        setError(`Tamanho inválido: ${file.name}. Cada arquivo deve ter conteúdo e no máximo 10 MB.`);
        return;
      }
    }
    let remaining = files;
    void run('Enviando anexos…', async () => {
      while (remaining.length > 0) {
        const file = remaining[0]!;
        setBusy(`Enviando ${file.name}…`);
        const result = await uploadSupervisorEvaluationAttachment(processId, stageId, file);
        if (!mounted.current) return;
        setAttachments((current) => [...current, result.attachment]);
        remaining = remaining.slice(1);
      }
      setFeedback('Anexos enviados.');
    }, true);
  }

  function remove(attachment: EvaluationAttachmentRef) {
    if (!canManage || blocked) return;
    void run(`Removendo ${attachment.originalFilename}…`, async () => {
      const result = await removeSupervisorEvaluationAttachment(processId, stageId, attachment.id);
      if (!mounted.current) return;
      if (!result.removed) throw new Error('Não foi possível remover o anexo.');
      setAttachments((current) => current.filter((item) => item.id !== result.attachmentId));
      if (preview?.attachment.id === attachment.id) setPreview(null);
      setFeedback('Anexo removido.');
    }, true);
  }

  function open(attachment: EvaluationAttachmentRef, download: boolean) {
    if (blocked) return;
    void run(`Carregando ${attachment.originalFilename}…`, async () => {
      const blob = await downloadEvaluationAttachment(processId, stageId, origin, attachment.id);
      if (!mounted.current) return;
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      const url = URL.createObjectURL(blob);
      objectUrl.current = url;
      setPreview(download ? null : { attachment, url });
      if (download) {
        const link = document.createElement('a');
        link.href = url;
        link.download = attachment.originalFilename;
        link.click();
      }
    });
  }

  return (
    <WorkSection title={origin === EvaluationAttachmentOrigin.SELF_EVALUATION ? 'Anexos do Servidor' : 'Anexos da avaliação'}>
      {canManage ? <div className="form-stack" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); upload(Array.from(event.dataTransfer.files)); }}>
        <label className="field-group">
          <span>Selecionar arquivos</span>
          <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" disabled={blocked || attachments.length >= MAX_FILES} onChange={(event) => { upload(Array.from(event.target.files ?? [])); event.target.value = ''; }} />
        </label>
        <p className="muted-copy">Selecione ou arraste PDF, JPG ou PNG. Até 5 anexos, com no máximo 10 MB por arquivo.</p>
      </div> : <p className="muted-copy">Somente leitura.</p>}
      {loading || busy ? <p role="status">{busy ?? 'Carregando anexos…'}</p> : null}
      {error ? <>
        <FeedbackAlert title="Não foi possível concluir" tone="error" description={error} />
        {!loaded || (retry.current && (!retry.current.write || canManage)) ? <button type="button" className="secondary-button" disabled={disabled || loading || busy !== null} onClick={() => { if (!loaded) setAttempt((current) => current + 1); else if (retry.current) void run('Tentando novamente…', retry.current.action, retry.current.write); }}>Tentar novamente</button> : null}
      </> : null}
      {feedback ? <p role="status">{feedback}</p> : null}
      {loaded && attachments.length === 0 ? <p>Nenhum anexo enviado.</p> : null}
      <ul className="document-list">
        {attachments.map((attachment) => <li className="document-list__item" key={attachment.id}>
          <div><strong>{attachment.originalFilename}</strong><span>{attachment.mimeType} · {formatSize(attachment.sizeBytes)}</span></div>
          <div className="form-actions">
            <button type="button" className="secondary-button" disabled={blocked} onClick={() => open(attachment, false)}>Visualizar {attachment.originalFilename}</button>
            <button type="button" className="secondary-button" disabled={blocked} onClick={() => open(attachment, true)}>Baixar {attachment.originalFilename}</button>
            {canManage ? <button type="button" className="secondary-button" disabled={blocked} onClick={() => remove(attachment)}>Remover {attachment.originalFilename}</button> : null}
          </div>
        </li>)}
      </ul>
      {preview ? <div className="form-stack">
        {preview.attachment.mimeType === 'application/pdf'
          ? <iframe title={`Anexo ${preview.attachment.originalFilename}`} src={preview.url} style={{ width: '100%', height: '60vh', border: 0 }} />
          : <img alt={`Anexo ${preview.attachment.originalFilename}`} src={preview.url} style={{ maxWidth: '100%' }} />}
        <button type="button" className="secondary-button" onClick={() => setPreview(null)}>Fechar visualização</button>
      </div> : null}
    </WorkSection>
  );
}
