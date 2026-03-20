import { UserRole } from '@aep-pa/contracts';

import { RolePlaceholderPage } from '@/features/home/components/role-placeholder-page';

export default function InternServerPage() {
  return (
    <RolePlaceholderPage
      pageRole={UserRole.INTERN_SERVER}
      allowedRoles={[UserRole.INTERN_SERVER, UserRole.ADMIN]}
      title="Área do servidor estagiário"
      description="Placeholder inicial para os fluxos do servidor em estágio probatório dentro da área autenticada."
      highlights={['Autoavaliação', 'Ciência do processo', 'Notificações e pendências']}
    />
  );
}
