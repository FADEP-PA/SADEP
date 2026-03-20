'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAuth } from '@/shared/auth/auth-context';
import { getMenuByRole } from '@/shared/rbac/menu';

type AppShellProps = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  sidebarFooter?: React.ReactNode;
};

export function AppShell({ children, title, subtitle, headerActions, sidebarFooter }: AppShellProps) {
  const pathname = usePathname();
  const { session, signOut } = useAuth();
  const navigationGroups = session ? getMenuByRole(session.user.role) : [];

  return (
    <div className="app-shell">
      <aside className="app-shell__sidebar" aria-label="Navegação principal da aplicação">
        <div className="app-shell__brand">
          <span className="app-shell__brand-badge">AEP-PA</span>
          <div>
            <strong>Área interna</strong>
            <p>Base visual para os fluxos autenticados.</p>
          </div>
        </div>

        <nav className="app-shell__nav" aria-label="Seções da aplicação">
          {navigationGroups.map((group) => (
            <section key={group.title} className="app-shell__nav-group">
              <p>{group.title}</p>
              <ul>
                {group.items.map((item) => {
                  const isActive = pathname === item.href;

                  return (
                    <li key={item.href}>
                      <Link href={item.href} className={isActive ? 'app-shell__nav-link app-shell__nav-link--active' : 'app-shell__nav-link'}>
                        <span>{item.label}</span>
                        <small>{item.description}</small>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </nav>

        {sidebarFooter}
      </aside>

      <div className="app-shell__content">
        <header className="app-shell__header">
          <div>
            <span className="app-shell__eyebrow">Fundação da aplicação</span>
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>

          <div className="app-shell__actions">
            {headerActions ?? (
              <>
                <span className="app-shell__status">
                  {session?.user.email} · {session?.user.role}
                </span>
                <button type="button" onClick={signOut}>
                  Sair
                </button>
              </>
            )}
          </div>
        </header>

        <main className="app-shell__main">{children}</main>
      </div>
    </div>
  );
}
