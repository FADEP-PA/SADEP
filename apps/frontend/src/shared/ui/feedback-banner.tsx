type FeedbackBannerProps = {
  title: string;
  message: string;
  variant?: 'info' | 'warning' | 'error';
};

export function FeedbackBanner({
  title,
  message,
  variant = 'info',
}: FeedbackBannerProps) {
  return (
    <section className={`feedback-banner feedback-banner--${variant}`} aria-live="polite">
      <strong>{title}</strong>
      <p>{message}</p>
    </section>
  );
}
