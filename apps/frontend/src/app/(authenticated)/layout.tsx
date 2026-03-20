import type { ReactNode } from 'react';

import { AuthGuard } from '@/shared/auth/auth-guard';
import { AppShell } from '@/shared/ui/app-shell';

const shortcuts = [
  {
    label: 'Sessão persistida',
    description: 'A sessão é restaurada com `localStorage` ou `sessionStorage` conforme o login e o rememberMe.',
  },
  {
    label: 'Guard de rota',
    description: 'A área autenticada só é exibida após validação do token em `/auth/me`.',
  },
  {
    label: 'Menu por perfil',
    description: 'A navegação lateral e o redirecionamento pós-login mudam conforme o `UserRole` retornado pelo backend.',
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
        subtitle="Shell funcional para páginas internas com autenticação real, dashboards por perfil e rotas protegidas por papel."
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
