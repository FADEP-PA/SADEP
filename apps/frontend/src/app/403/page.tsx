import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <main className="forbidden-page">
      <section className="forbidden-page__card" aria-labelledby="forbidden-title">
        <div className="app-shell__brand app-shell__brand--footer">
          <span className="app-shell__brand-mark" aria-hidden="true">
            <span>AEP</span>
          </span>
          <span className="app-shell__brand-copy">
            <strong>AEP-PA</strong>
            <small>Secretaria de Estado de Educacao do Para</small>
          </span>
        </div>

        <span className="forbidden-page__badge">Acesso bloqueado</span>
        <h1 id="forbidden-title">Seu perfil nao pode abrir esta rota</h1>
        <p>
          A pagina solicitada continua protegida pela politica atual de permissao. O sistema
          manteve a navegacao dentro do escopo liberado para o perfil autenticado.
        </p>

        <div className="forbidden-page__actions">
          <Link href="/inicio">Voltar ao inicio</Link>
          <Link href="/">Ir para o login</Link>
        </div>
      </section>
    </main>
  );
}
