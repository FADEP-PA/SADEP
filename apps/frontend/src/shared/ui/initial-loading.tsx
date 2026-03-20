export function InitialLoading({ message = 'Carregando ambiente autenticado...' }: { message?: string }) {
  return (
    <section className="initial-loading" aria-live="polite" aria-busy="true">
      <div className="initial-loading__spinner" />
      <div>
        <strong>Preparando AEP-PA</strong>
        <p>{message}</p>
      </div>
    </section>
  );
}
