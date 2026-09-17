'use client';

import { StatusBadge, type StatusBadgeTone } from '@/shared/ui/status-badge';

export type StageDocumentItem = {
  label: string;
  tone: 'default' | 'muted';
};

export type StageCardViewModel = {
  sequence: number;
  title: string;
  period: string;
  statusLabel: string;
  statusTone: StatusBadgeTone;
  markerLabel: string;
  markerClassName: string;
  documents: StageDocumentItem[];
  primaryAction?: {
    label: string;
    kind?: 'primary' | 'secondary';
    disabled?: boolean;
    onClick?: () => void;
  };
};

export function StageCard({ item }: { item: StageCardViewModel }) {
  const isCurrent = item.markerClassName.includes('--current');

  return (
    <article className={isCurrent ? 'intern-stage-card intern-stage-card--current' : 'intern-stage-card'}>
      <div className="intern-stage-card__main">
        <div className={item.markerClassName}>{item.markerLabel}</div>

        <div className="intern-stage-card__body">
          <div className="intern-stage-card__identity">
            <div className="intern-stage-card__title-row">
              <strong>{item.title}</strong>
              <StatusBadge label={item.statusLabel} tone={item.statusTone} />
            </div>

            <p>
              <span>Período:</span> {item.period}
            </p>
          </div>

          <div className="intern-stage-card__documents">
            {item.documents.map((document) => (
              <span
                key={`${item.sequence}-${document.label}`}
                className={
                  document.tone === 'muted'
                    ? 'intern-document-chip intern-document-chip--muted'
                    : 'intern-document-chip'
                }
              >
                {document.label}
              </span>
            ))}

            {item.primaryAction ? (
              <button
                type="button"
                className={item.primaryAction.kind === 'secondary' ? 'secondary-button' : undefined}
                onClick={item.primaryAction.onClick}
                disabled={item.primaryAction.disabled}
              >
                {item.primaryAction.label}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
