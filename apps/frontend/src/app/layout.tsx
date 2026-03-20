import type { Metadata } from 'next';
import '@/shared/styles/globals.css';

import { AppProviders } from '@/shared/auth/app-providers';

export const metadata: Metadata = {
  title: 'AEP-PA',
  description: 'Plataforma interna para autenticação e operação do sistema AEP-PA.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
