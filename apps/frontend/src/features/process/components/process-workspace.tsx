'use client';

import Link from 'next/link';
import { UserRole } from '@sadep/contracts';

import { AuthGuard } from '@/shared/auth/auth-guard';
import { useAuth } from '@/shared/auth/auth-context';
import { getRolePresentation } from '@/shared/rbac/role-catalog';
import { NextAction, WorkPageHeader } from '@/shared/ui/work-patterns';

const ALLOWED_ROLES = [
  UserRole.INTERN_SERVER,
  UserRole.CESAD_MEMBER,
  UserRole.COMMISSION_ASSISTANT,
];

export function ProcessWorkspace() {
  const { session } = useAuth();
  const role = session ? getRolePresentation(session.user.role) : null;

  return (
    <AuthGuard allowedRoles={ALLOWED_ROLES}>
      <div className="work-page">
        <WorkPageHeader
          title="Processos"
          description="Acesse os processos pela sua área de trabalho."
        />
        <NextAction
          title="Continue na sua área principal"
          description="Os processos e as ações disponíveis já aparecem organizados para o seu perfil."
          action={
            role ? (
              <Link className="portal-link-button" href={role.homePath}>
                Abrir minha área
              </Link>
            ) : null
          }
        />
      </div>
    </AuthGuard>
  );
}
