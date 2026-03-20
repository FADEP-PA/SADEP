type FeedbackAlertProps = {
  title: string;
  tone?: 'info' | 'warning' | 'error' | 'success';
  description: string;
  details?: string[];
};

export function FeedbackAlert({ title, tone = 'info', description, details }: FeedbackAlertProps) {
  const className = `feedback-alert feedback-alert--${tone}`;

  return (
    <section className={className} aria-live="polite">
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>

      {details && details.length > 0 ? (
        <ul>
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
