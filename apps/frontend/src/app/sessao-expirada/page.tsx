import Link from 'next/link';

export default function SessionExpiredPage() {
  return (
    <main className="forbidden-page">
      <section className="forbidden-page__card" aria-labelledby="session-expired-title">
        <span className="forbidden-page__badge">Sessão expirada</span>
        <h1 id="session-expired-title">Seu acesso expirou</h1>
        <p>
          Sua autenticação não é mais válida. Faça login novamente
          para restabelecer o acesso à área protegida do sistema.
        </p>
        <p>
          O sistema interrompe a navegação protegida sempre que identifica expiração ou invalidação da sessão.
        </p>

        <div className="forbidden-page__actions">
          <Link href="/">Voltar para o login</Link>
        </div>
      </section>
    </main>
  );
}
