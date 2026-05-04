import { DocumentType, type CesadStageReadSnapshotRef } from '@sadep/contracts';

import {
  formatDateTime,
  formatDocumentStatus,
  formatDocumentType,
  getDocumentStatusTone,
} from '@/features/process/components/process-formatters';
import {
  StageDocumentOverview,
  type StageDocumentOverviewItem,
} from '@/features/process/components/stage-document-overview';
import { MissingDocumentState } from '@/shared/ui/operational-states';

import { SignatureTimeline } from './signature-timeline';

type StageDocumentListProps = {
  documents: CesadStageReadSnapshotRef['documents'];
};

function getStageReadBadgeTone(document: CesadStageReadSnapshotRef['documents'][number]) {
  if (!document.exists) {
    return 'warning' as const;
  }

  return getDocumentStatusTone(document.documentStatus);
}

function getMissingStageDocumentDescription(documentType: DocumentType) {
  if (documentType === DocumentType.CESAD_OPINION) {
    return 'Parecer da etapa ainda não emitido.';
  }

  return 'Documento ainda não formalizado para a etapa.';
}

function getStageLinkModeLabel(document: CesadStageReadSnapshotRef['documents'][number]) {
  if (document.stageLinkMode === 'STAGE_BOUND') {
    return 'Documento vinculado diretamente à etapa';
  }

  if (document.stageLinkMode === 'PROCESS_SINGLE_STAGE_FALLBACK') {
    return 'Documento inferido a partir de processo com etapa única';
  }

  return 'Sem vínculo explícito com a etapa';
}

function mapDocumentToOverviewItem(
  document: CesadStageReadSnapshotRef['documents'][number],
): StageDocumentOverviewItem {
  const documentTitle = formatDocumentType({
    documentType: document.documentType,
    opinionScope: 'STAGE',
  });

  return {
    id: document.documentType,
    title: documentTitle,
    eyebrow: document.exists ? 'Documento localizado' : 'Documento ausente',
    statusLabel: document.exists
      ? formatDocumentStatus(document.documentStatus)
      : getMissingStageDocumentDescription(document.documentType),
    statusTone: getStageReadBadgeTone(document),
    details: [
      { label: 'ID', value: document.documentId ?? 'Não gerado' },
      { label: 'Vínculo com etapa', value: getStageLinkModeLabel(document) },
      {
        label: 'Arquivo lógico',
        value: document.artifactPath ?? 'Sem artefato físico informado',
      },
      { label: 'Atualizado em', value: formatDateTime(document.updatedAt) },
    ],
    content: document.exists ? (
      <SignatureTimeline signatures={document.signatures} />
    ) : (
      <MissingDocumentState
        title={`${documentTitle} ausente`}
        description={
          document.missingReason ??
          'O backend sinalizou ausência deste documento no escopo da etapa.'
        }
      />
    ),
  };
}

export function StageDocumentList({ documents }: StageDocumentListProps) {
  return (
    <StageDocumentOverview
      description="A lista abaixo explicita os documentos esperados da etapa, inclusive quando ainda não existem ou não possuem vínculo explícito."
      items={documents.map((document) => mapDocumentToOverviewItem(document))}
    />
  );
}
