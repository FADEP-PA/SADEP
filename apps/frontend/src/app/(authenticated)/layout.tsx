import type { ReactNode } from 'react';

import { AuthGuard } from '@/shared/auth/auth-guard';
import { AppShell } from '@/shared/ui/app-shell';

const shortcuts = [
  {
    label: 'Sessão institucional',
    description: 'A sessão autenticada é restaurada conforme a política definida no login.',
  },
  {
    label: 'Validação contínua',
    description: 'As rotas internas só são exibidas após revalidação do token em `/auth/me`.',
  },
  {
    label: 'Navegação por perfil',
    description: 'Os atalhos laterais respeitam o papel retornado pelo backend para cada usuário.',
  },
];

export default function AuthenticatedLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <AuthGuard>
      <AppShell
        title="Ambiente autenticado"
        subtitle="Painel interno com identidade institucional para acompanhamento processual, consulta operacional e execução controlada das etapas do AEP-PA."
        sidebarFooter={
          <div className="app-shell__sidebar-card">
            <strong>Diretrizes do ambiente</strong>
            <ul>
              {shortcuts.map((item) => (
                <li key={item.label}>
                  <span>{item.label}</span>
                  <small>{item.description}</small>
                </li>
              ))}
            </ul>
          </div>
        }
      >
        {children}
      </AppShell>
    </AuthGuard>
  );
}
