'use client';

import Link from 'next/link';

import { AuthGuard } from '@/shared/auth/auth-guard';
import { useAuth } from '@/shared/auth/auth-context';
import { getRolePresentation } from '@/shared/rbac/role-catalog';
import { FeedbackAlert } from '@/shared/ui/feedback-alert';
import { DetailList, WorkPageHeader, WorkSection } from '@/shared/ui/work-patterns';

export default function AuthenticatedProfilePage() {
  const { session, bootstrapError } = useAuth();
  const rolePresentation = session ? getRolePresentation(session.user.role) : null;

  return (
    <AuthGuard>
      <div className="work-page">
        <WorkPageHeader title="Meu perfil" />

        <WorkSection title="Dados da conta">
          <DetailList items={[
            { label: 'Nome', value: session?.user.name ?? 'Não informado' },
            { label: 'Perfil', value: rolePresentation?.label ?? 'Não informado' },
            { label: 'E-mail', value: session?.user.email ?? 'Não informado' },
          ]} />

          {rolePresentation?.homePath ? (
            <div className="work-section-actions">
              <Link className="portal-link-button" href={rolePresentation.homePath}>
                Abrir minha área
              </Link>
            </div>
          ) : null}
        </WorkSection>

        {bootstrapError ? (
          <FeedbackAlert title="Aviso sobre sua sessão" tone="warning" description={bootstrapError} />
        ) : null}
      </div>
    </AuthGuard>
  );
}
