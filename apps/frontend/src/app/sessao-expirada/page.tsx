import Link from 'next/link';

export default function SessionExpiredPage() {
  return (
    <main className="forbidden-page">
      <section className="forbidden-page__card" aria-labelledby="session-expired-title">
        <span className="forbidden-page__badge">Sessão expirada</span>
        <h1 id="session-expired-title">Seu acesso expirou</h1>
        <p>
          O token armazenado no frontend não é mais válido para o backend. Faça login novamente
          para revalidar o usuário autenticado em <code>/auth/me</code>.
        </p>
        <p>
          Esta página técnica centraliza o tratamento de <strong>401</strong> recebido durante a
          navegação protegida.
        </p>

        <div className="forbidden-page__actions">
          <Link href="/">Voltar para o login</Link>
        </div>
      </section>
    </main>
  );
}
