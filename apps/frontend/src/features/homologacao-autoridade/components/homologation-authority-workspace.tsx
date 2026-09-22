'use client';

import { UserRole } from '@sadep/contracts';

import { AuthGuard } from '@/shared/auth/auth-guard';
import { EmptyState } from '@/shared/ui/operational-states';
import { WorkPageHeader, WorkSection } from '@/shared/ui/work-patterns';

const ALLOWED_ROLES = [UserRole.HOMOLOGATION_AUTHORITY, UserRole.ADMIN];

export function HomologationAuthorityWorkspace() {
  return (
    <AuthGuard allowedRoles={ALLOWED_ROLES}>
      <div className="work-page">
        <WorkPageHeader
          title="Homologação final"
          description="Processos aptos para decisão da autoridade homologadora."
        />
        <WorkSection title="Processos para homologação">
          <EmptyState
            title="Nenhum processo apto à homologação"
            description="Quando um processo concluir as etapas obrigatórias e o parecer final, ele aparecerá aqui."
          />
        </WorkSection>
      </div>
    </AuthGuard>
  );
}
