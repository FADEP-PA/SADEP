import type { ReactNode } from 'react';
import { AppShell } from '@/shared/ui/app-shell';

const shortcuts = [
  {
    label: 'Área autenticada',
    description: 'Ponto de entrada comum para os fluxos internos após o login.',
  },
  {
    label: 'Perfis e permissões',
    description: 'A navegação por papel será conectada nas próximas etapas do sprint.',
  },
];

export default function AuthenticatedLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <AppShell
      title="Ambiente autenticado"
      subtitle="Estrutura base para páginas internas do sistema."
      sidebarFooter={
        <div className="app-shell__sidebar-card">
          <strong>Próximos passos</strong>
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
  );
}
