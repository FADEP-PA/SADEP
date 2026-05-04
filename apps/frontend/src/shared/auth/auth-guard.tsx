'use client';

import type { UserRole } from '@sadep/contracts';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAuth } from './auth-context';
import { InitialLoading } from '@/shared/ui/initial-loading';
import { AccessBlockedState } from '@/shared/ui/operational-states';

type AuthGuardProps = {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
};

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const pathname = usePathname();
  const { session, status, bootstrapError } = useAuth();

  if (status === 'loading') {
    return <InitialLoading message="Validando sua sessão e permissões..." />;
  }

  if (status !== 'authenticated' || !session) {
    return <InitialLoading message="Redirecionando para o login..." />;
  }

  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    return (
      <section className="guard-feedback" aria-labelledby="guard-feedback-title">
        <div id="guard-feedback-title">
          <AccessBlockedState
            title="Seu perfil não pode acessar esta rota"
            description={`O usuário autenticado está com o papel ${session.user.role} e não possui permissão para abrir ${pathname}.`}
          >
            {bootstrapError ? <p>{bootstrapError}</p> : null}
            <Link href="/403">Ir para a página 403</Link>
          </AccessBlockedState>
        </div>
      </section>
    );
  }

  return <>{children}</>;
}
