'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAuth } from '@/shared/auth/auth-context';
import { getMenuByRole } from '@/shared/rbac/menu';
import { getRolePresentation } from '@/shared/rbac/role-catalog';

type AppShellProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  sidebarFooter?: React.ReactNode;
};

type SidebarIconName =
  | 'home'
  | 'clipboard'
  | 'user'
  | 'folder'
  | 'logout'
  | 'chevron-left'
  | 'chevron-right';

const SIDEBAR_STORAGE_KEY = 'sadep-sidebar-collapsed';

function SidebarIcon({ name }: { name: SidebarIconName }) {
  if (name === 'home') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 10.5 12 4l8 6.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7.5 10v8.5h9V10" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === 'clipboard') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="7" y="4.5" width="10" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9 4.5h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M9.5 9.5h5m-5 3h5m-5 3h3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === 'user') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M6.5 18.5c1.2-2.6 3.2-4 5.5-4s4.3 1.4 5.5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === 'folder') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4.5 8.5h5l1.6 1.8H19a1.5 1.5 0 0 1 1.5 1.5v5.7A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5V10A1.5 1.5 0 0 1 5 8.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === 'logout') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M10 7V5.8A1.8 1.8 0 0 0 8.2 4H5.8A1.8 1.8 0 0 0 4 5.8v12.4A1.8 1.8 0 0 0 5.8 20h2.4A1.8 1.8 0 0 0 10 18.2V17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M13 8.5 17 12l-4 3.5M9 12h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === 'chevron-left') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="m14.5 6.5-5 5.5 5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m9.5 6.5 5 5.5-5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function getSidebarIconByHref(href: string): SidebarIconName {
  if (href === '/servidor-estagiario' || href === '/chefia-imediata') {
    return 'clipboard';
  }

  if (href === '/perfil') {
    return 'user';
  }

  if (href === '/processos') {
    return 'folder';
  }

  return 'folder';
}

function getDisplayName(name: string | undefined) {
  if (!name || name.trim().length === 0) {
    return 'Usuario interno';
  }

  return name.trim();
}

function getAvatarLabel(displayName: string, email: string | undefined) {
  const normalizedDisplayName = displayName.trim();
  if (normalizedDisplayName.length > 0) {
    return (normalizedDisplayName[0] ?? 'U').toUpperCase();
  }

  if (!email) {
    return 'U';
  }

  return (email[0] ?? 'U').toUpperCase();
}

function isActiveNavigationPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children, title, subtitle, headerActions, sidebarFooter }: AppShellProps) {
  const pathname = usePathname();
  const { session, signOut } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const navigationGroups = session ? getMenuByRole(session.user.role) : [];
  const rolePresentation = session ? getRolePresentation(session.user.role) : null;
  const displayName = getDisplayName(session?.user.name);
  const avatarLabel = getAvatarLabel(displayName, session?.user.email);
  const currentNavigationItem = navigationGroups
    .flatMap((group) => group.items)
    .find((item) => isActiveNavigationPath(pathname, item.href));
  const headerTitle = title ?? currentNavigationItem?.label;
  const headerSubtitle = subtitle ?? currentNavigationItem?.description ?? rolePresentation?.description;

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
      <a className="app-shell__skip-link" href="#conteudo-principal">
        Pular para o conteudo principal
      </a>

      <aside className="app-shell__sidebar" aria-label="Menu lateral do ambiente autenticado">
        <div className="app-shell__sidebar-top">
          <Link
            href={rolePresentation?.homePath ?? '/perfil'}
            className="app-shell__brand app-shell__sidebar-brand"
            aria-label="Ir para a área principal do perfil"
          >
            <span className="app-shell__brand-mark app-shell__brand-mark--coat" aria-hidden="true">
              <img src="/brasao-para.svg" alt="" />
            </span>
            <span className="app-shell__brand-copy">
              <strong>SADEP</strong>
              <small>SEDUC/PA</small>
            </span>
          </Link>

          <button
            type="button"
            className="app-shell__sidebar-toggle"
            onClick={() => setIsSidebarCollapsed((current) => !current)}
            aria-label={isSidebarCollapsed ? 'Abrir menu lateral' : 'Fechar menu lateral'}
          >
            <SidebarIcon name={isSidebarCollapsed ? 'chevron-right' : 'chevron-left'} />
          </button>
        </div>

        <div className="app-shell__sidebar-divider" />

        <nav className="app-shell__sidebar-nav" aria-label="Navegação lateral do ambiente autenticado">
          {navigationGroups.map((group) => (
            <section key={group.title} className="app-shell__sidebar-group">
              <span className="app-shell__sidebar-group-label">{group.title}</span>

              <div className="app-shell__sidebar-links">
                {group.items.map((item) => {
                  const isActive = isActiveNavigationPath(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.description}
                      aria-label={item.label}
                      aria-current={isActive ? 'page' : undefined}
                      className={
                        isActive
                          ? 'app-shell__sidebar-link app-shell__sidebar-link--active'
                          : 'app-shell__sidebar-link'
                      }
                    >
                      <span className="app-shell__sidebar-link-dot" aria-hidden="true">
                        <SidebarIcon name={getSidebarIconByHref(item.href)} />
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
          {rolePresentation ? (
            <div className="app-shell__sidebar-badge" aria-label={`Perfil atual: ${rolePresentation.label}`}>
              <span>Perfil ativo</span>
              <strong>{rolePresentation.shortLabel}</strong>
            </div>
          ) : null}
          <button
            type="button"
            className="app-shell__sidebar-signout"
            onClick={signOut}
            aria-label="Sair do sistema"
          >
            <span className="app-shell__sidebar-signout-icon" aria-hidden="true">
              <SidebarIcon name="logout" />
            </span>
            <span className="app-shell__sidebar-signout-text">Sair do sistema</span>
          </button>
        </div>
      </aside>

      <div className="app-shell__workspace">
        <header className="app-shell__header">
          <div className="app-shell__header-left">
            <div className="app-shell__header-branding">
              <div className="app-shell__header-branding-copy">
                <strong>Governo do Estado do Pará</strong>
                <span>Secretaria de Educação</span>
              </div>
            </div>

          </div>

          <div className="app-shell__header-right">
            {headerActions}

            <div className="app-shell__header-user">
              <strong>{displayName}</strong>
              <span>{rolePresentation?.label ?? session?.user.role ?? 'Perfil interno'}</span>
            </div>

            <span className="app-shell__header-avatar" aria-hidden="true">
              {avatarLabel}
            </span>
          </div>
        </header>

        <main id="conteudo-principal" className="app-shell__body" tabIndex={-1}>
          <div className="app-shell__content">{children}</div>
        </main>
      </div>
    </div>
  );
}
