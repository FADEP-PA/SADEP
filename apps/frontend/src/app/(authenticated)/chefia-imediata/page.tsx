import { UserRole } from '@aep-pa/contracts';

import { RolePlaceholderPage } from '@/features/home/components/role-placeholder-page';

export default function ImmediateSupervisorPage() {
  return (
    <RolePlaceholderPage
      allowedRoles={[UserRole.IMMEDIATE_SUPERVISOR, UserRole.ADMIN]}
      title="Dashboard técnico da chefia imediata"
      description="Shell funcional inicial para as entregas de avaliação e acompanhamento operacional da chefia imediata."
      highlights={['Avaliações', 'Pendências de assinatura', 'Acompanhamento do servidor']}
      actions={[
        'Conectar draft/submissão da avaliação da chefia.',
        'Listar servidores vinculados ao perfil atual.',
        'Exibir histórico e status do fluxo por servidor.',
      ]}
    />
  );
}
