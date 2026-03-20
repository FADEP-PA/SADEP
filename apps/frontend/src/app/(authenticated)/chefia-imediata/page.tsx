import { UserRole } from '@aep-pa/contracts';

import { RolePlaceholderPage } from '@/features/home/components/role-placeholder-page';

export default function ImmediateSupervisorPage() {
  return (
    <RolePlaceholderPage
      allowedRoles={[UserRole.IMMEDIATE_SUPERVISOR, UserRole.ADMIN]}
      title="Área da chefia imediata"
      description="Visão inicial para acompanhamento da avaliação, pendências e andamento do processo pela chefia imediata."
      highlights={['Avaliações em andamento', 'Pendências da etapa', 'Histórico do servidor']}
    />
  );
}
