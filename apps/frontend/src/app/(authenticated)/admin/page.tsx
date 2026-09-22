'use client';

import Link from 'next/link';
import { UserRole } from '@sadep/contracts';

import { AuthGuard } from '@/shared/auth/auth-guard';
import { useAuth } from '@/shared/auth/auth-context';
import { DetailList, WorkPageHeader, WorkSection } from '@/shared/ui/work-patterns';

export default function AdminPage() {
  const { session } = useAuth();

  return (
    <AuthGuard allowedRoles={[UserRole.ADMIN]}>
      <div className="work-page">
        <WorkPageHeader
          title="Administração"
          description="Acesse as áreas administrativas disponíveis."
        />

        <WorkSection title="Seu acesso">
          <DetailList
            items={[
              { label: 'Nome', value: session?.user.name ?? 'Não informado' },
              { label: 'E-mail', value: session?.user.email ?? 'Não informado' },
              { label: 'Perfil', value: 'Administrador' },
            ]}
          />
        </WorkSection>

        <WorkSection title="Áreas disponíveis">
          <div className="admin-links">
            <Link className="portal-link-button" href="/cesad-comissao/admin">
              Gerenciar Comissão CESAD
            </Link>
            <Link className="secondary-button portal-link-button" href="/homologacao-autoridade">
              Consultar homologação
            </Link>
          </div>
        </WorkSection>
      </div>
    </AuthGuard>
  );
}
