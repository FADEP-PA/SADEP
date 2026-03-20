import { UserRole } from '@aep-pa/contracts';

import { RolePlaceholderPage } from '@/features/home/components/role-placeholder-page';

export default function ImmediateSupervisorPage() {
  return (
    <RolePlaceholderPage
      allowedRoles={[UserRole.IMMEDIATE_SUPERVISOR, UserRole.ADMIN]}
      title="Área da chefia imediata"
      description="Placeholder inicial para as entregas de avaliação e acompanhamento operacional da chefia imediata."
      highlights={['Avaliações', 'Pendências de assinatura', 'Acompanhamento do servidor']}
    />
  );
}
