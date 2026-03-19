import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/shared/styles/globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

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
      <body className={inter.className} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
