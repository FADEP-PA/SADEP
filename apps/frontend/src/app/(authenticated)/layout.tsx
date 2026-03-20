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
  {
    label: 'Processos placeholder',
    description: 'A rota `/processos` antecipa o contrato visual antes do workflow real.',
  },
  {
    label: 'Erros padronizados',
    description: 'A UI usa feedback visual consistente para autenticação, sessão expirada e avisos.',
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
        subtitle="Estrutura base para páginas internas com sessão, RBAC inicial, placeholders de processo e integração real com o backend."
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
