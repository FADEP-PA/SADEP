import { UserRole } from '@aep-pa/contracts';

import { RolePlaceholderPage } from '@/features/home/components/role-placeholder-page';

export default function InternServerPage() {
  return (
    <RolePlaceholderPage
      allowedRoles={[UserRole.INTERN_SERVER, UserRole.ADMIN]}
      title="Área do servidor estagiário"
      description="Visão inicial para acompanhamento do processo, registros de ciência e pendências do servidor em estágio probatório."
      highlights={['Situação do processo', 'Ciência do processo', 'Notificações e pendências']}
    />
  );
}
