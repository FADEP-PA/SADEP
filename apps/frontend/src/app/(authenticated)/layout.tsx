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
        title="Portal AEP-PA"
        subtitle="Acompanhamento institucional do estagio probatorio"
      >
        {children}
      </AppShell>
    </AuthGuard>
  );
}
