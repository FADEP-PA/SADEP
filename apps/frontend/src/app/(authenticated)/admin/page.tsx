'use client';

import Link from 'next/link';
import { UserRole } from '@sadep/contracts';

import { AuthGuard } from '@/shared/auth/auth-guard';
import { WorkPageHeader, WorkSection } from '@/shared/ui/work-patterns';

export default function AdminPage() {
  return (
    <AuthGuard allowedRoles={[UserRole.ADMIN]}>
      <div className="work-page">
        <WorkPageHeader
          title="Administração"
          description="Acesse as áreas administrativas disponíveis."
        />

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
