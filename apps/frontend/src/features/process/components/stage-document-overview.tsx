import type { ReactNode } from 'react';

import { InfoCard } from '@/shared/ui/info-card';
import { KeyValueList } from '@/shared/ui/key-value-list';
import { PageSection } from '@/shared/ui/page-section';
import { StatusBadge, type StatusBadgeTone } from '@/shared/ui/status-badge';

type StageDocumentOverviewDetail = {
  label: string;
  value: ReactNode;
};

export type StageDocumentOverviewItem = {
  id: string;
  title: string;
  eyebrow: string;
  statusLabel: string;
  statusTone?: StatusBadgeTone;
  details: StageDocumentOverviewDetail[];
  content?: ReactNode;
};

type StageDocumentOverviewProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  items: StageDocumentOverviewItem[];
};

export function StageDocumentOverview({
  eyebrow = 'Documentos',
  title = 'Documentos e assinaturas da etapa',
  description = 'Lista padronizada dos documentos vinculados ao contexto da etapa carregada.',
  items,
}: StageDocumentOverviewProps) {
  return (
    <PageSection eyebrow={eyebrow} title={title} description={description}>
      <div className="metrics-grid">
        {items.map((item) => (
          <InfoCard key={item.id} title={item.title} eyebrow={item.eyebrow}>
            <div className="cesad-stage-read__stack">
              <StatusBadge label={item.statusLabel} tone={item.statusTone ?? 'neutral'} />
              <KeyValueList items={item.details} />
              {item.content}
            </div>
          </InfoCard>
        ))}
      </div>
    </PageSection>
  );
}
