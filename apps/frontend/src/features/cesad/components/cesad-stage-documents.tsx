'use client';

import { DocumentType, type CesadStageReadSnapshotRef } from '@sadep/contracts';
import { useState } from 'react';
import { getCesadStageReadSnapshot } from '@/shared/api/services/processes-service';
import { getRequestErrorMessage } from '@/shared/api/http-error';
import { OfficialDocumentList } from '@/features/process/components/official-document-list';
import { formatDocumentStatus, formatDocumentType } from '@/features/process/components/process-formatters';
import { WorkSection } from '@/shared/ui/work-patterns';
import { EvaluationAcknowledgement } from '@/features/process/components/evaluation-acknowledgement';

export function CesadStageDocuments({ snapshot }: { snapshot: CesadStageReadSnapshotRef }) {
  const [selected, setSelected] = useState(snapshot.stage.sequence);
  const [historical, setHistorical] = useState<CesadStageReadSnapshotRef | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shown = selected === snapshot.stage.sequence ? snapshot : historical;

  async function selectStage(sequence: number) {
    setSelected(sequence); setHistorical(null); setError(null);
    if (sequence === snapshot.stage.sequence) return;
    setLoading(true);
    try { setHistorical(await getCesadStageReadSnapshot(snapshot.process.id, sequence)); }
    catch (requestError) { setError(getRequestErrorMessage(requestError, 'Não foi possível carregar a etapa.')); }
    finally { setLoading(false); }
  }

  return <WorkSection title="Documentos da etapa">
    <label>Etapa dos documentos<select aria-label="Etapa dos documentos" value={selected} disabled={loading} onChange={event => void selectStage(Number(event.target.value))}>{Array.from({ length: Math.min(snapshot.stage.sequence, snapshot.stage.totalStages) }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}ª etapa</option>)}</select></label>
    {loading ? <p role="status">Carregando documentos…</p> : error ? <p role="alert">{error}</p> : shown ? <div className="form-stack" key={shown.stage.stageId}>
      <EvaluationAcknowledgement acknowledgement={shown.documents.find(document => document.documentType === DocumentType.SUPERVISOR_EVALUATION)?.serverAcknowledgement} />
      <OfficialDocumentList processId={shown.process.id} documents={shown.documents.filter(document => document.exists && document.documentId).map(document => ({ documentId: document.documentId!, title: formatDocumentType({ documentType: document.documentType, opinionScope: 'STAGE' }), hasArtifact: document.hasArtifact, updatedAt: document.updatedAt ?? document.createdAt ?? '', status: formatDocumentStatus(document.documentStatus) }))} />
    </div> : null}
  </WorkSection>;
}
