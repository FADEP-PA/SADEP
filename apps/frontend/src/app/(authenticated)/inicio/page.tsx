'use client';

import { RolePlaceholderSection } from '@/features/home/components/role-placeholder-section';
import { useAuth } from '@/shared/auth/auth-context';

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
    description: 'Menu lateral e placeholders habilitados conforme o `UserRole` retornado pelo backend.',
  },
];

const integrationChecklist = [
  'Formato de `/auth/login`: `{ accessToken, user: { sub, email, role } }`.',
  'Formato de `/auth/me`: `{ sub, email, role }`.',
  'Payload autenticado usa `sub`, `email` e `role` como base mínima.',
  'Campo `role` é o pivô para redirect pós-login, menu lateral e guard por papel.',
  'Erros 401 do backend são tratados como sessão inválida/expirada no frontend.',
  'Token fica em `localStorage` ou `sessionStorage` conforme `rememberMe`.',
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
            Esta é a base provisória da área autenticada, agora conectada à sessão do usuário,
            ao consumo de autenticação e à navegação por perfil.
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

      <div className="technical-home__grid">
        {integrationCards.map((card) => (
          <article key={card.title} className="technical-home__card">
            <h3>{card.title}</h3>
            <p>{card.description}</p>
          </article>
        ))}
      </div>

      {session ? <RolePlaceholderSection role={session.user.role} /> : null}

      <section className="technical-home__checklist" aria-labelledby="pending-steps-title">
        <div>
          <span className="technical-home__section-label">Ponto de integração final</span>
          <h3 id="pending-steps-title">Contrato técnico consolidado desta etapa</h3>
        </div>

        <ol>
          {integrationChecklist.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
    </section>
  );
}
