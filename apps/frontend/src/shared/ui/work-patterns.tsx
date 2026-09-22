import type { ReactNode } from 'react';

import { StatusBadge, type StatusBadgeTone } from './status-badge';

type WorkPageHeaderProps = {
  title: string;
  description?: string;
  status?: string;
  statusTone?: StatusBadgeTone;
  actions?: ReactNode;
};

export function WorkPageHeader({
  title,
  description,
  status,
  statusTone = 'neutral',
  actions,
}: WorkPageHeaderProps) {
  return (
    <header className="work-page-header">
      <div className="work-page-header__copy">
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {status || actions ? (
        <div className="work-page-header__aside">
          {status ? <StatusBadge label={status} tone={statusTone} /> : null}
          {actions}
        </div>
      ) : null}
    </header>
  );
}

type NextActionProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: 'info' | 'warning' | 'success';
};

export function NextAction({ title, description, action, tone = 'info' }: NextActionProps) {
  return (
    <section className={`next-action next-action--${tone}`} aria-label="Próxima ação">
      <div>
        <span className="next-action__label">Próxima ação</span>
        <strong>{title}</strong>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <div className="next-action__control">{action}</div> : null}
    </section>
  );
}

export function WorkSection({
  title,
  description,
  action,
  children,
  className = '',
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`work-section ${className}`.trim()}>
      <header className="work-section__header">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {action}
      </header>
      <div className="work-section__body">{children}</div>
    </section>
  );
}

export type WorkTab = {
  id: string;
  label: string;
};

export function WorkTabs({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: WorkTab[];
  activeTab: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="work-tabs" role="tablist" aria-label="Seções do processo">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`${tab.id}-panel`}
          className={activeTab === tab.id ? 'work-tabs__tab work-tabs__tab--active' : 'work-tabs__tab'}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function DetailList({
  items,
}: {
  items: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <dl className="detail-list">
      {items.map((item) => (
        <div key={item.label} className="detail-list__item">
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
