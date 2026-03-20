'use client';

import { TechnicalDashboard } from '@/features/dashboard/components/technical-dashboard';
import { RolePlaceholderSection } from '@/features/home/components/role-placeholder-section';
import { useAuth } from '@/shared/auth/auth-context';
import { InfoCard } from '@/shared/ui/info-card';

const integrationCards = [
  {
    title: 'Sessão autenticada',
    description: 'Token persistido no navegador e revalidação do usuário via `/auth/me` no bootstrap.',
  },
  {
    title: 'Cliente HTTP',
    description: 'Camada base de `fetch` preparada para bearer token, parsing consistente e tratamento padronizado de erros.',
  },
  {
    title: 'RBAC inicial',
    description: 'Menu lateral, labels por perfil e placeholders habilitados conforme o `UserRole` retornado pelo backend.',
  },
];

export default function TechnicalHomePage() {
  const { session } = useAuth();

  return (
    <section className="technical-home">
      <div className="technical-home__hero">
        <div>
          <span className="technical-home__badge">Pós-login</span>
          <h2>Página inicial técnica</h2>
          <p>
            Esta base provisória da área autenticada agora centraliza sessão, contratos de integração,
            placeholders por papel e consumo autenticado dos endpoints técnicos do backend.
          </p>
        </div>

        <div className="technical-home__panel">
          <strong>Status atual</strong>
          <ul>
            <li>Usuário autenticado: {session?.user.email}</li>
            <li>Perfil ativo: {session?.user.role}</li>
            <li>Token validado a partir do endpoint `/auth/me`.</li>
          </ul>
        </div>
      </div>

      <div className="metrics-grid">
        {integrationCards.map((card) => (
          <InfoCard key={card.title} title={card.title} description={card.description} />
        ))}
      </div>

      {session ? <RolePlaceholderSection role={session.user.role} /> : null}

      <TechnicalDashboard />
    </section>
  );
}
