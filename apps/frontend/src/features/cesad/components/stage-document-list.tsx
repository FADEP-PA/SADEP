import { DocumentType, type CesadStageReadSnapshotRef } from '@aep-pa/contracts';

import {
  formatDateTime,
  formatDocumentStatus,
  formatDocumentType,
  formatRole,
  formatSignatureStatus,
  getDocumentStatusTone,
  getSignatureStatusTone,
} from '@/features/process/components/process-formatters';
import { ContentState } from '@/shared/ui/content-state';
import { InfoCard } from '@/shared/ui/info-card';
import { KeyValueList } from '@/shared/ui/key-value-list';
import { MissingDocumentState } from '@/shared/ui/operational-states';
import { PageSection } from '@/shared/ui/page-section';
import { StatusBadge } from '@/shared/ui/status-badge';

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

export function StageDocumentList({ documents }: StageDocumentListProps) {
  return (
    <PageSection
      eyebrow="Documentos"
      title="Documentos e assinaturas da etapa"
      description="A lista abaixo explicita os documentos esperados da etapa, inclusive quando ainda não existem ou não possuem vínculo explícito."
    >
      <div className="metrics-grid">
        {documents.map((document) => (
          <InfoCard
            key={document.documentType}
            title={formatDocumentType(document.documentType)}
            eyebrow={document.exists ? 'Documento localizado' : 'Documento ausente'}
          >
            <div className="cesad-stage-read__stack">
              <StatusBadge
                label={
                  document.exists
                    ? formatDocumentStatus(document.documentStatus)
                    : getMissingStageDocumentDescription(document.documentType)
                }
                tone={getStageReadBadgeTone(document)}
              />
              <KeyValueList
                items={[
                  { label: 'ID', value: document.documentId ?? 'Não gerado' },
                  { label: 'Vínculo com etapa', value: getStageLinkModeLabel(document) },
                  {
                    label: 'Arquivo lógico',
                    value: document.artifactPath ?? 'Sem artefato físico informado',
                  },
                  { label: 'Atualizado em', value: formatDateTime(document.updatedAt) },
                ]}
              />

              {document.exists ? (
                document.signatures.length > 0 ? (
                  <div>
                    <strong>Assinaturas</strong>
                    <ul className="content-list cesad-stage-read__signatures">
                      {document.signatures.map((signature) => (
                        <li key={signature.signatureId}>
                          <strong>{formatRole(signature.signatoryRole)}</strong>{' '}
                          <StatusBadge
                            label={formatSignatureStatus(signature.status)}
                            tone={getSignatureStatusTone(signature.status)}
                          />
                          {signature.signedAt
                            ? ` em ${formatDateTime(signature.signedAt)}`
                            : ' sem data de conclusão'}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <ContentState
                    title="Sem trilha de assinatura"
                    description="O documento existe, mas ainda não há registros de assinatura associados."
                    tone="warning"
                  />
                )
              ) : (
                <MissingDocumentState
                  title={`${formatDocumentType(document.documentType)} ausente`}
                  description={
                    document.missingReason ??
                    'O backend sinalizou ausência deste documento no escopo da etapa.'
                  }
                />
              )}
            </div>
          </InfoCard>
        ))}
      </div>
    </PageSection>
  );
}
