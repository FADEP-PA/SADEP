import type { ReactNode } from 'react';

type InfoCardProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  children?: ReactNode;
};

export function InfoCard({ title, description, eyebrow, children }: InfoCardProps) {
  return (
    <article className="surface-card surface-card--interactive">
      {eyebrow ? <span className="section-chip">{eyebrow}</span> : null}
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {children}
    </article>
  );
}
