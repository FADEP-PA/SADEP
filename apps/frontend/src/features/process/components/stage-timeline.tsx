import type { ReactNode } from 'react';

import type { StatusBadgeTone } from '@/shared/ui/status-badge';
import { StatusBadge } from '@/shared/ui/status-badge';

export type StageTimelineItem = {
  sequence: number;
  title: string;
  statusLabel: string;
  tone?: StatusBadgeTone;
  description: string;
  isActive?: boolean;
  meta?: ReactNode;
};

type StageTimelineProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  items: StageTimelineItem[];
};

export function StageTimeline({
  eyebrow = 'Etapas',
  title = 'Linha do tempo das etapas',
  description = 'Visão visual das etapas retornadas pelo contexto carregado, sem inferir regra processual no frontend.',
  items,
}: StageTimelineProps) {
  return (
    <section className="operations-section">
      <div className="operations-section__header">
        <div>
          <span className="section-chip">{eyebrow}</span>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>

      <div className="operations-flow">
        {items.map((item) => (
          <article
            key={item.sequence}
            className={
              item.isActive
                ? 'operations-flow-card operations-flow-card--active'
                : 'operations-flow-card'
            }
          >
            <div className="operations-flow-card__index">
              {String(item.sequence).padStart(2, '0')}
            </div>
            <div className="operations-flow-card__content">
              <div className="operations-flow-card__header">
                <strong>{item.title}</strong>
                <StatusBadge label={item.statusLabel} tone={item.tone ?? 'neutral'} />
              </div>
              <p>{item.description}</p>
              {item.meta}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
