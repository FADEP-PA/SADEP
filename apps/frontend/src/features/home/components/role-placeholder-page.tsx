'use client';

import type { UserRole } from '@aep-pa/contracts';

import { AuthGuard } from '@/shared/auth/auth-guard';
import { useAuth } from '@/shared/auth/auth-context';
import { getRolePresentation } from '@/shared/rbac/role-catalog';
import { InfoCard } from '@/shared/ui/info-card';
import { KeyValueList } from '@/shared/ui/key-value-list';
import { PageSection } from '@/shared/ui/page-section';

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
  const activeRole = session?.user.role;
  const rolePresentation = activeRole ? getRolePresentation(activeRole) : null;

  return (
    <AuthGuard allowedRoles={allowedRoles}>
      <PageSection eyebrow="Placeholder inicial" title={title} description={description}>
        <div className="technical-home__hero">
          <div className="surface-card">
            <span className="technical-home__badge">Perfil autenticado</span>
            <h3>{rolePresentation?.label ?? 'Perfil não identificado'}</h3>
            <p className="muted-paragraph">Área pronta para continuidade do sprint antes do workflow real.</p>
            <KeyValueList
              items={[
                { label: 'E-mail', value: session?.user.email ?? 'Não informado' },
                { label: 'Role', value: session?.user.role ?? 'Não informado' },
                { label: 'Rota base', value: rolePresentation?.homePath ?? 'Não informada' },
              ]}
            />
          </div>
        </div>

        <div className="metrics-grid">
          {highlights.map((item) => (
            <InfoCard key={item} title={item} description="Espaço reservado para aprofundar o fluxo correspondente a este perfil." />
          ))}
        </div>
      </PageSection>
    </AuthGuard>
  );
}
