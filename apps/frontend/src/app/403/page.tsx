import Link from 'next/link';

import { AccessBlockedState } from '@/shared/ui/operational-states';

export default function ForbiddenPage() {
  return (
    <main className="forbidden-page">
      <section className="forbidden-page__card" aria-labelledby="forbidden-title">
        <div id="forbidden-title">
          <AccessBlockedState
            title="Acesso negado"
            description="Você está autenticado, mas o perfil atual não possui permissão para acessar este conteúdo."
          >
            <div className="forbidden-page__actions">
              <Link href="/inicio">Voltar ao início</Link>
              <Link href="/">Ir para o login</Link>
            </div>
          </AccessBlockedState>
        </div>
      </section>
    </main>
  );
}
