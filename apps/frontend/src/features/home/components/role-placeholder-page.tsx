'use client';

import type { UserRole } from '@aep-pa/contracts';

import { AuthGuard } from '@/shared/auth/auth-guard';
import { useAuth } from '@/shared/auth/auth-context';

type RolePlaceholderPageProps = {
  allowedRoles: UserRole[];
  title: string;
  description: string;
  highlights: string[];
  actions: string[];
};

export function RolePlaceholderPage({
  allowedRoles,
  title,
  description,
  highlights,
  actions,
}: RolePlaceholderPageProps) {
  const { session } = useAuth();

  return (
    <AuthGuard allowedRoles={allowedRoles}>
      <section className="technical-home" aria-labelledby="role-page-title">
        <div className="technical-home__hero">
          <div>
            <span className="technical-home__badge">Dashboard técnico por perfil</span>
            <h2 id="role-page-title">{title}</h2>
            <p>{description}</p>
          </div>

          <div className="technical-home__panel">
            <strong>Perfil autenticado</strong>
            <ul>
              <li>{session?.user.email}</li>
              <li>{session?.user.role}</li>
              <li>Shell funcional já segregada por papel.</li>
            </ul>
          </div>
        </div>

        <div className="technical-home__grid">
          {highlights.map((item) => (
            <article key={item} className="technical-home__card">
              <h3>{item}</h3>
              <p>Espaço técnico preparado para evolução incremental deste fluxo.</p>
            </article>
          ))}
        </div>

        <section className="technical-home__checklist">
          <div>
            <span className="technical-home__section-label">Próximas ações do perfil</span>
            <h3>Backlog imediato desta dashboard</h3>
          </div>

          <ol>
            {actions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ol>
        </section>
      </section>
    </AuthGuard>
  );
}
