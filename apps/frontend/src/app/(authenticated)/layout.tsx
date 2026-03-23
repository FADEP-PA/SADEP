import type { ReactNode } from 'react';

import { AuthGuard } from '@/shared/auth/auth-guard';
import { AppShell } from '@/shared/ui/app-shell';

export default function AuthenticatedLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <AuthGuard>
      <AppShell
        title="Ambiente autenticado"
        subtitle="Painel interno para acompanhamento processual, consulta operacional e execução das áreas já disponíveis no AEP-PA."
      >
        {children}
      </AppShell>
    </AuthGuard>
  );
}
