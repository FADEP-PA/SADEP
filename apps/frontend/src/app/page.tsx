import type { Metadata } from 'next';
import { LoginPage } from '@/features/auth/components/login-page';

export const metadata: Metadata = {
  title: 'AEP-PA | Login',
  description: 'Tela de acesso ao sistema AEP-PA.',
};

export default function Home() {
  return <LoginPage />;
}
