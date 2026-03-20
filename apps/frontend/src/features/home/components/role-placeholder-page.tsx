'use client';

import type { UserRole } from '@aep-pa/contracts';

import { AuthGuard } from '@/shared/auth/auth-guard';
import { useAuth } from '@/shared/auth/auth-context';
import { getRoleMetadata } from '@/shared/rbac/role-metadata';
import { DashboardCard } from '@/shared/ui/dashboard-card';

type RolePlaceholderPageProps = {
  pageRole: UserRole;
  allowedRoles: UserRole[];
  title: string;
  description: string;
  highlights: string[];
};

export function RolePlaceholderPage({
  pageRole,
  allowedRoles,
  title,
  description,
  highlights,
}: RolePlaceholderPageProps) {
  const { session } = useAuth();
  const authenticatedRoleMetadata = session ? getRoleMetadata(session.user.role) : null;
  const pageRoleMetadata = getRoleMetadata(pageRole);
  const placeholderModels = ['ProcessListItem', 'ProcessSummary', 'AuthenticatedUserModel'];

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
            <strong>Contexto da rota</strong>
            <ul>
              <li>Perfil da tela: {pageRoleMetadata.label}</li>
              <li>Identificador da tela: {pageRoleMetadata.identifier}</li>
              <li>Usuário autenticado: {session?.user.email}</li>
              <li>Role autenticada: {authenticatedRoleMetadata?.label ?? session?.user.role}</li>
            </ul>
          </div>
        </div>

        <div className="technical-home__grid">
          {highlights.map((item) => (
            <DashboardCard
              key={item}
              title={item}
              description="Espaço reservado para aprofundar o fluxo correspondente a este perfil."
            />
          ))}
        </div>

        <section className="technical-home__checklist" aria-labelledby="role-conventions-title">
          <div>
            <span className="technical-home__section-label">Convenções deste dashboard</span>
            <h3 id="role-conventions-title">Modelos mínimos e placeholders</h3>
          </div>

          <ul className="technical-home__list">
            {placeholderModels.map((model) => (
              <li key={model}>{model}</li>
            ))}
          </ul>
        </section>
      </section>
    </AuthGuard>
  );
}
