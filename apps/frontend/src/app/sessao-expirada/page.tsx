import Link from 'next/link';

export default function SessionExpiredPage() {
  return (
    <main className="forbidden-page">
      <section className="forbidden-page__card" aria-labelledby="session-expired-title">
        <div className="app-shell__brand app-shell__brand--footer">
          <span className="app-shell__brand-mark app-shell__brand-mark--coat" aria-hidden="true">
            <img src="/brasao-para.svg" alt="" />
          </span>
          <span className="app-shell__brand-copy">
            <strong>SADEP</strong>
            <small>Secretaria de Estado de Educação do Pará</small>
          </span>
        </div>

        <span className="forbidden-page__badge">Sessão expirada</span>
        <h1 id="session-expired-title">Sua sessão terminou</h1>
        <p>Entre novamente para continuar.</p>

        <div className="forbidden-page__actions">
          <Link href="/">Voltar para o login</Link>
        </div>
      </section>
    </main>
  );
}
