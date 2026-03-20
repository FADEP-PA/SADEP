'use client';

import type { UserRole } from '@aep-pa/contracts';

import { AuthGuard } from '@/shared/auth/auth-guard';
import { useAuth } from '@/shared/auth/auth-context';

type RolePlaceholderPageProps = {
  allowedRoles: UserRole[];
  title: string;
  description: string;
  highlights: string[];
};

export function RolePlaceholderPage({
  allowedRoles,
  title,
  description,
  highlights,
}: RolePlaceholderPageProps) {
  const { session } = useAuth();

  return (
    <AuthGuard allowedRoles={allowedRoles}>
      <section className="technical-home" aria-labelledby="role-page-title">
        <div className="technical-home__hero">
          <div>
            <span className="technical-home__badge">Placeholder inicial</span>
            <h2 id="role-page-title">{title}</h2>
            <p>{description}</p>
          </div>

          <div className="technical-home__panel">
            <strong>Perfil autenticado</strong>
            <ul>
              <li>{session?.user.email}</li>
              <li>{session?.user.role}</li>
              <li>Área pronta para continuidade do sprint.</li>
            </ul>
          </div>
        </div>

        <div className="technical-home__grid">
          {highlights.map((item) => (
            <article key={item} className="technical-home__card">
              <h3>{item}</h3>
              <p>Espaço reservado para aprofundar o fluxo correspondente a este perfil.</p>
            </article>
          ))}
        </div>
      </section>
    </AuthGuard>
  );
}
