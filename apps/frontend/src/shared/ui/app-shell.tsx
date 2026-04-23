'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/shared/auth/auth-context';
import { getMenuByRole } from '@/shared/rbac/menu';
import { getRolePresentation } from '@/shared/rbac/role-catalog';

type AppShellProps = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  sidebarFooter?: React.ReactNode;
};

const SIDEBAR_STORAGE_KEY = 'aep-pa-sidebar-collapsed';

function getNavigationBadge(label: string) {
  const badge = label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return badge || 'AP';
}

function getDisplayNameFromEmail(email: string | undefined) {
  if (!email) {
    return 'Usuario interno';
  }

  const localPart = email.split('@')[0] ?? '';
  const normalized = localPart.replace(/[._-]+/g, ' ').trim();

  if (!normalized) {
    return email;
  }

  return normalized
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getAvatarLabel(email: string | undefined) {
  if (!email) {
    return 'U';
  }

  return (email[0] ?? 'U').toUpperCase();
}

export function AppShell({ children, title, subtitle, headerActions, sidebarFooter }: AppShellProps) {
  const pathname = usePathname();
  const { session, signOut } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const navigationGroups = session ? getMenuByRole(session.user.role) : [];
  const rolePresentation = session ? getRolePresentation(session.user.role) : null;
  const displayName = getDisplayNameFromEmail(session?.user.email);
  const avatarLabel = getAvatarLabel(session?.user.email);

  const navigationItems = useMemo(
    () =>
      Array.from(
        new Map(navigationGroups.flatMap((group) => group.items).map((item) => [item.href, item])).values(),
      ),
    [navigationGroups],
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedValue = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);

    if (storedValue === 'true' || storedValue === 'false') {
      setIsSidebarCollapsed(storedValue === 'true');
      return;
    }

    setIsSidebarCollapsed(window.innerWidth < 1180);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  return (
    <div className={isSidebarCollapsed ? 'app-shell app-shell--sidebar-collapsed' : 'app-shell'}>
      <aside className="app-shell__sidebar">
        <div className="app-shell__sidebar-top">
          <Link
            href="/inicio"
            className="app-shell__brand app-shell__sidebar-brand"
            aria-label="Ir para a pagina inicial do AEP-PA"
          >
            <span className="app-shell__brand-mark" aria-hidden="true">
              <span>AEP</span>
            </span>
            <span className="app-shell__brand-copy">
              <strong>AEP-PA</strong>
              <small>SEDUC/PA</small>
            </span>
          </Link>

          <button
            type="button"
            className="app-shell__sidebar-toggle"
            onClick={() => setIsSidebarCollapsed((current) => !current)}
            aria-label={isSidebarCollapsed ? 'Abrir menu lateral' : 'Fechar menu lateral'}
          >
            {isSidebarCollapsed ? '>' : '<'}
          </button>
        </div>

        <div className="app-shell__sidebar-divider" />

        <nav className="app-shell__sidebar-nav" aria-label="Navegacao lateral do ambiente autenticado">
          {navigationGroups.map((group) => (
            <section key={group.title} className="app-shell__sidebar-group">
              <span className="app-shell__sidebar-group-label">{group.title}</span>

              <div className="app-shell__sidebar-links">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.description}
                      aria-current={isActive ? 'page' : undefined}
                      className={
                        isActive
                          ? 'app-shell__sidebar-link app-shell__sidebar-link--active'
                          : 'app-shell__sidebar-link'
                      }
                    >
                      <span className="app-shell__sidebar-link-dot" aria-hidden="true">
                        {getNavigationBadge(item.label)}
                      </span>
                      <span className="app-shell__sidebar-link-text">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>

        <div className="app-shell__sidebar-bottom">
          {sidebarFooter}
          <button type="button" className="app-shell__sidebar-signout" onClick={signOut}>
            <span className="app-shell__sidebar-signout-icon" aria-hidden="true">
              {'->'}
            </span>
            <span className="app-shell__sidebar-signout-text">Sair do sistema</span>
          </button>
        </div>
      </aside>

      <div className="app-shell__workspace">
        <header className="app-shell__header">
          <div className="app-shell__header-left">
            <button
              type="button"
              className="app-shell__header-toggle"
              onClick={() => setIsSidebarCollapsed((current) => !current)}
              aria-label={isSidebarCollapsed ? 'Abrir menu lateral' : 'Fechar menu lateral'}
            >
              Menu
            </button>

            <div className="app-shell__header-branding">
              <span className="app-shell__header-branding-mark" aria-hidden="true">
                GOV
              </span>
              <div className="app-shell__header-branding-copy">
                <strong>Governo do Estado do Para</strong>
                <span>Secretaria de Educacao</span>
              </div>
            </div>

            <div className="app-shell__header-context">
              <strong>{title}</strong>
              {subtitle ? <span>{subtitle}</span> : null}
            </div>
          </div>

          <div className="app-shell__header-right">
            {headerActions}

            <Link href="/perfil" className="app-shell__header-link">
              Meu perfil
            </Link>

            <div className="app-shell__header-user">
              <strong>{displayName}</strong>
              <span>{rolePresentation?.label ?? session?.user.role ?? 'Perfil interno'}</span>
            </div>

            <span className="app-shell__header-avatar" aria-hidden="true">
              {avatarLabel}
            </span>
          </div>
        </header>

        <main className="app-shell__body">
          <div className="app-shell__content">{children}</div>
        </main>
      </div>
    </div>
  );
}
