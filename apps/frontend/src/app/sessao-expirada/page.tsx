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
        <h1 id="session-expired-title">Sua autenticação não é mais válida</h1>
        <p>
          O sistema encerrou a navegação protegida porque a sessão local perdeu validade ou não
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
