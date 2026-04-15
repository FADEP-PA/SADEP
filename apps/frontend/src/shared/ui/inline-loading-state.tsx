type InlineLoadingStateProps = {
  title: string;
  description: string;
};

export function InlineLoadingState({ title, description }: InlineLoadingStateProps) {
  return (
    <section className="inline-loading-state" aria-live="polite" aria-busy="true">
      <div className="inline-loading-state__spinner" />
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </section>
  );
}
