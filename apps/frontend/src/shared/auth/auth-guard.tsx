'use client';

import type { UserRole } from '@aep-pa/contracts';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAuth } from './auth-context';
import { InitialLoading } from '@/shared/ui/initial-loading';

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
        <span className="guard-feedback__badge">Acesso negado</span>
        <h2 id="guard-feedback-title">Seu perfil não pode acessar esta rota</h2>
        <p>
          O usuário autenticado está com o papel <strong>{session.user.role}</strong> e não possui
          permissão para abrir <code>{pathname}</code>.
        </p>
        {bootstrapError ? <p>{bootstrapError}</p> : null}
        <Link href="/403">Ir para a página 403</Link>
      </section>
    );
  }

  return <>{children}</>;
}
