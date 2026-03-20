import type { ReactNode } from 'react';

type PageSectionProps = {
  title: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
};

export function PageSection({ title, eyebrow, description, children }: PageSectionProps) {
  return (
    <section className="page-section">
      <header className="page-section__header">
        {eyebrow ? <span className="section-chip">{eyebrow}</span> : null}
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
      </header>

      {children}
    </section>
  );
}
