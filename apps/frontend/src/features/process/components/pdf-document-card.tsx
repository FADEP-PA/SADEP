import type { ReactNode } from 'react';

export function PdfDocumentCard({ title, metadata, actions, children, hideTitle = false }: {
  title: string;
  metadata?: ReactNode;
  actions: ReactNode;
  children?: ReactNode;
  hideTitle?: boolean;
}) {
  return <article className="pdf-document-card">
    <div className="pdf-document-card__header">
      <div className="pdf-document-card__metadata">{hideTitle ? null : <strong>{title}</strong>}{metadata}</div>
      <div className="pdf-document-card__actions">{actions}</div>
    </div>
    {children ? <div className="pdf-document-card__content">{children}</div> : null}
  </article>;
}
