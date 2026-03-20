import { UserRole } from '@aep-pa/contracts';

import { RolePlaceholderPage } from '@/features/home/components/role-placeholder-page';

export default function InternServerPage() {
  return (
    <RolePlaceholderPage
      allowedRoles={[UserRole.INTERN_SERVER, UserRole.ADMIN]}
      title="Dashboard técnico do servidor estagiário"
      description="Shell funcional inicial para os fluxos do servidor em estágio probatório dentro da área autenticada."
      highlights={['Autoavaliação', 'Ciência do processo', 'Notificações e pendências']}
      actions={[
        'Conectar leitura do processo individual do servidor.',
        'Exibir pendências e notificações reais.',
        'Plugar ações de ciência e acompanhamento.',
      ]}
    />
  );
}
