import type { ReactNode } from 'react';

import { AuthGuard } from '@/shared/auth/auth-guard';
import { AppShell } from '@/shared/ui/app-shell';

const shortcuts = [
  {
    label: 'Sessão persistida',
    description: 'A sessão é restaurada com `localStorage` ou `sessionStorage` conforme o login.',
  },
  {
    label: 'Guard de rota',
    description: 'A área autenticada só é exibida após validação do token em `/auth/me`.',
  },
  {
    label: 'Menu por perfil',
    description: 'A navegação lateral muda conforme o `UserRole` retornado pelo backend.',
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
        subtitle="Estrutura base para páginas internas do sistema com sessão, RBAC inicial e integração com o backend."
        sidebarFooter={
          <div className="app-shell__sidebar-card">
            <strong>Fundação do sprint</strong>
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
