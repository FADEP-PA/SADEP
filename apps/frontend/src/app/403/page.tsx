import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <main className="forbidden-page">
      <section className="forbidden-page__card" aria-labelledby="forbidden-title">
        <span className="forbidden-page__badge">Erro 403</span>
        <h1 id="forbidden-title">Acesso negado</h1>
        <p>
          Você está autenticado, mas o perfil atual não possui permissão para acessar este
          conteúdo.
        </p>

        <div className="forbidden-page__actions">
          <Link href="/inicio">Voltar ao início</Link>
          <Link href="/">Ir para o login</Link>
        </div>
      </section>
    </main>
  );
}
