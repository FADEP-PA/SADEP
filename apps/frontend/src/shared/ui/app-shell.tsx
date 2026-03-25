'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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

export function AppShell({ children, title, subtitle, headerActions, sidebarFooter }: AppShellProps) {
  const pathname = usePathname();
  const { session, signOut } = useAuth();
  const navigationGroups = session ? getMenuByRole(session.user.role) : [];
  const rolePresentation = session ? getRolePresentation(session.user.role) : null;

  return (
    <div className="app-shell">
      <aside className="app-shell__sidebar" aria-label="Navegação principal da aplicação">
        <div className="app-shell__brand">
          <span className="app-shell__brand-badge">Governo do Pará</span>
          <div>
            <strong>Sistema AEP-PA</strong>
            <p>
              Ambiente interno para acompanhamento do estágio probatório com trilha auditável,
              workflow processual e segregação por perfil.
            </p>
          </div>
        </div>

        <div className="app-shell__sidebar-meta" aria-label="Contexto institucional">
          <div>
            <span>Ambiente</span>
            <strong>Operação interna autenticada</strong>
          </div>
          <div>
            <span>Perfil atual</span>
            <strong>{rolePresentation?.label ?? 'Não identificado'}</strong>
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
                      <Link
                        href={item.href}
                        className={
                          isActive
                            ? 'app-shell__nav-link app-shell__nav-link--active'
                            : 'app-shell__nav-link'
                        }
                      >
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
        <div className="app-shell__topbar">
          <span>Governo do Estado do Pará · Sistema de Avaliação de Estágio Probatório</span>
          <span>Uso restrito a perfis autorizados</span>
        </div>

        <header className="app-shell__header">
          <div>
            <span className="app-shell__eyebrow">Painel institucional</span>
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>

          <div className="app-shell__actions">
            {headerActions ?? (
              <>
                <div className="app-shell__user-panel" aria-label="Resumo da sessão autenticada">
                  <strong>{rolePresentation?.label ?? session?.user.role ?? 'Perfil não identificado'}</strong>
                  <span>{session?.user.email}</span>
                </div>
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
