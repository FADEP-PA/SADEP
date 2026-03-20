import type { ReactNode } from 'react';

type ContentStateProps = {
  title: string;
  description: string;
  tone?: 'neutral' | 'info' | 'warning' | 'error' | 'success';
  children?: ReactNode;
};

export function ContentState({ title, description, tone = 'neutral', children }: ContentStateProps) {
  return (
    <div className={`content-state content-state--${tone}`}>
      <strong>{title}</strong>
      <p>{description}</p>
      {children ? <div className="content-state__extra">{children}</div> : null}
    </div>
  );
}
