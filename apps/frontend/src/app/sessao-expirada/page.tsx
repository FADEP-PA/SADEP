'use client';

import Link from 'next/link';

import { useAuth } from '@/shared/auth/auth-context';

export default function SessionExpiredPage() {
  const { bootstrapError } = useAuth();

  return (
    <main className="forbidden-page">
      <section className="forbidden-page__card" aria-labelledby="session-expired-title">
        <span className="forbidden-page__badge">Sessão expirada</span>
        <h1 id="session-expired-title">Sua sessão não é mais válida</h1>
        <p>
          O token salvo no frontend expirou ou foi rejeitado pelo backend durante a validação em
          `/auth/me`.
        </p>
        {bootstrapError ? <p>{bootstrapError}</p> : null}

        <div className="forbidden-page__actions">
          <Link href="/">Voltar para o login</Link>
        </div>
      </section>
    </main>
  );
}
