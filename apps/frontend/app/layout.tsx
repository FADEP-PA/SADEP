import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AEP-PA | Login',
  description: 'Tela de acesso ao sistema AEP-PA.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
