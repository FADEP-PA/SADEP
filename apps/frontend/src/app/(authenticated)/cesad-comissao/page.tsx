import { UserRole } from '@aep-pa/contracts';

import { RolePlaceholderPage } from '@/features/home/components/role-placeholder-page';

export default function CesadCommissionPage() {
  return (
    <RolePlaceholderPage
      allowedRoles={[UserRole.CESAD_MEMBER, UserRole.ADMIN]}
      title="Área CESAD / comissão"
      description="Visão inicial para análise colegiada, emissão de pareceres e acompanhamento do histórico processual."
      highlights={['Processos em análise', 'Pareceres', 'Trilha de auditoria']}
    />
  );
}
