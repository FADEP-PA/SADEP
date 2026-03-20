'use client';

import { AuthIntegrationSummary } from '@/features/auth/components/auth-integration-summary';
import { RolePlaceholderSection } from '@/features/home/components/role-placeholder-section';
import { useAuth } from '@/shared/auth/auth-context';
import { getDefaultRouteByRole } from '@/shared/rbac/menu';

const integrationCards = [
  {
    title: 'Sessão autenticada',
    description: 'Token persistido no navegador e revalidação do usuário via `/auth/me` no bootstrap.',
  },
  {
    title: 'Cliente HTTP',
    description: 'Camada base de `fetch` preparada para enviar bearer token e tratar erros comuns.',
  },
  {
    title: 'RBAC inicial',
    description: 'Menu lateral, redirecionamento pós-login e dashboards habilitados conforme o `UserRole`.',
  },
];

const pendingSteps = [
  'Conectar módulos reais da sprint nas áreas por perfil.',
  'Refinar feedback de erro por tipo de falha do backend.',
  'Acoplar logout, refresh e métricas de navegação nas próximas entregas.',
];

export default function TechnicalHomePage() {
  const { session } = useAuth();
  const defaultRoute = session ? getDefaultRouteByRole(session.user.role) : '/inicio';

  return (
    <section className="technical-home">
      <div className="technical-home__hero">
        <div>
          <span className="technical-home__badge">Pós-login</span>
          <h2>Centro técnico da shell autenticada</h2>
          <p>
            Esta página consolida o ponto de integração da autenticação, o estado da sessão e o
            destino padrão por perfil dentro da Sprint 2B.
          </p>
        </div>

        <div className="technical-home__panel">
          <strong>Status atual</strong>
          <ul>
            <li>Usuário autenticado: {session?.user.email}</li>
            <li>Perfil ativo: {session?.user.role}</li>
            <li>Dashboard padrão do perfil: {defaultRoute}</li>
          </ul>
        </div>
      </div>

      <div className="technical-home__grid">
        {integrationCards.map((card) => (
          <article key={card.title} className="technical-home__card">
            <h3>{card.title}</h3>
            <p>{card.description}</p>
          </article>
        ))}
      </div>

      <AuthIntegrationSummary />
      {session ? <RolePlaceholderSection role={session.user.role} /> : null}

      <section className="technical-home__checklist" aria-labelledby="pending-steps-title">
        <div>
          <span className="technical-home__section-label">Próximas integrações</span>
          <h3 id="pending-steps-title">O que falta ligar nesta etapa</h3>
        </div>

        <ol>
          {pendingSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
    </section>
  );
}
