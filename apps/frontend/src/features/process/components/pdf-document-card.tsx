import type { ReactNode } from 'react';

export function PdfDocumentCard({ title, metadata, actions, children }: {
  title: string;
  metadata?: ReactNode;
  actions: ReactNode;
  children?: ReactNode;
}) {
  return <article className="pdf-document-card">
    <div className="pdf-document-card__header">
      <div className="pdf-document-card__metadata"><strong>{title}</strong>{metadata}</div>
      <div className="pdf-document-card__actions">{actions}</div>
    </div>
    {children ? <div className="pdf-document-card__content">{children}</div> : null}
  </article>;
}
