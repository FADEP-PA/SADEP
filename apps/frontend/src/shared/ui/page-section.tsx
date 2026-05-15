import type { ReactNode } from 'react';

type PageSectionProps = {
  title?: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
};

export function PageSection({ title, eyebrow, description, children }: PageSectionProps) {
  const hasHeader = Boolean(eyebrow || title || description);

  return (
    <section className="page-section">
      {hasHeader ? (
        <header className="page-section__header">
          {eyebrow ? <span className="section-chip">{eyebrow}</span> : null}
          {title || description ? (
            <div>
              {title ? <h2>{title}</h2> : null}
              {description ? <p>{description}</p> : null}
            </div>
          ) : null}
        </header>
      ) : null}

      {children}
    </section>
  );
}
