'use client';

import { useEffect, useState } from 'react';
import { getProcessDocumentHistory, type ProcessDocumentHistoryItem } from '@/shared/api/services/processes-service';
import { getRequestErrorMessage } from '@/shared/api/http-error';
import { WorkSection } from '@/shared/ui/work-patterns';
import { OfficialDocumentList } from './official-document-list';
import { formatDocumentStatus, formatDocumentType } from './process-formatters';

export function ProcessDocumentHistory({ processId, revision }: { processId: string; revision: string }) {
  const [documents, setDocuments] = useState<ProcessDocumentHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState<string>('');
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void getProcessDocumentHistory(processId).then(result => { if (active) setDocuments(result); })
      .catch(requestError => { if (active) setError(getRequestErrorMessage(requestError, 'Não foi possível carregar os documentos.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [processId, revision]);
  const stages = [...new Set(documents.map(document => document.stageSequence))].sort((a, b) => (a ?? 5) - (b ?? 5));
  return <WorkSection title="Documentos e histórico">
    {loading ? <p role="status">Carregando documentos…</p> : error ? <p role="alert">{error}</p> : stages.length === 0 ? <p className="muted-copy">Nenhum documento emitido.</p> : <>
      <label>Etapa do histórico<select aria-label="Etapa do histórico" value={stages.some(stage => String(stage) === selectedStage) ? selectedStage : String(stages[0])} onChange={event => setSelectedStage(event.target.value)}>{stages.map(stage => <option key={stage ?? 'final'} value={String(stage)}>{stage === null ? 'Documentos finais' : `${stage}ª etapa`}</option>)}</select></label>
      <OfficialDocumentList key={selectedStage} processId={processId} documents={documents.filter(document => String(document.stageSequence) === (stages.some(stage => String(stage) === selectedStage) ? selectedStage : String(stages[0]))).map(document => ({ ...document, title: `${formatDocumentType({ documentType: document.documentType, opinionScope: document.stageSequence === null ? 'FINAL_CONCLUSIVE' : 'STAGE' })}${document.version > 1 ? ` · versão ${document.version}` : ''}`, status: formatDocumentStatus(document.documentStatus) }))} />
    </>}
  </WorkSection>;
}
