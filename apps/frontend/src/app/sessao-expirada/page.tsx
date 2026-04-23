import Link from 'next/link';

export default function SessionExpiredPage() {
  return (
    <main className="forbidden-page">
      <section className="forbidden-page__card" aria-labelledby="session-expired-title">
        <div className="app-shell__brand app-shell__brand--footer">
          <span className="app-shell__brand-mark" aria-hidden="true">
            <span>AEP</span>
          </span>
          <span className="app-shell__brand-copy">
            <strong>AEP-PA</strong>
            <small>Secretaria de Estado de Educacao do Para</small>
          </span>
        </div>

        <span className="forbidden-page__badge">Sessao expirada</span>
        <h1 id="session-expired-title">Sua autenticacao nao e mais valida</h1>
        <p>
          O sistema encerrou a navegacao protegida porque a sessao local perdeu validade ou nao
          conseguiu mais ser confirmada junto ao backend.
        </p>
        <p>Faca login novamente para restabelecer o acesso ao ambiente autenticado.</p>

        <div className="forbidden-page__actions">
          <Link href="/">Voltar para o login</Link>
        </div>
      </section>
    </main>
  );
}
