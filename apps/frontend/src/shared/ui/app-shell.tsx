'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAuth } from '@/shared/auth/auth-context';
import { getMenuByRole } from '@/shared/rbac/menu';
import { getRoleMetadata } from '@/shared/rbac/role-metadata';

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
  const roleMetadata = session ? getRoleMetadata(session.user.role) : null;

  return (
    <div className="app-shell">
      <aside className="app-shell__sidebar" aria-label="Navegação principal da aplicação">
        <div className="app-shell__brand">
          <span className="app-shell__brand-badge">AEP-PA</span>
          <div>
            <strong>Área interna</strong>
            <p>Base visual refinada para os fluxos autenticados e dashboards técnicos iniciais.</p>
          </div>
        </div>

        {session && roleMetadata ? (
          <div className="app-shell__sidebar-card">
            <strong>{roleMetadata.label}</strong>
            <small>{roleMetadata.description}</small>
            <ul>
              <li>
                <span>Identificador</span>
                <small>{roleMetadata.identifier}</small>
              </li>
              <li>
                <span>E-mail ativo</span>
                <small>{session.user.email}</small>
              </li>
            </ul>
          </div>
        ) : null}

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
                  {session?.user.email} · {roleMetadata?.shortLabel ?? session?.user.role}
                </span>
                <Link href="/processos" className="app-shell__secondary-link">
                  Ver processos
                </Link>
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
