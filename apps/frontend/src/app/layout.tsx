import type { Metadata } from 'next';
import '@/shared/styles/globals.css';

import { AppProviders } from '@/shared/auth/app-providers';

export const metadata: Metadata = {
  title: 'SADEP | Portal institucional',
  description: 'Portal interno do SADEP para autenticacao, consulta processual e operacao por perfil.',
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
