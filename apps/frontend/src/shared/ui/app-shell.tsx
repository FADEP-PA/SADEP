import type { ReactNode } from 'react';

type AppShellProps = {
  children: ReactNode;
  title: string;
  subtitle?: string;
  headerActions?: ReactNode;
  sidebarFooter?: ReactNode;
};

const navigationGroups = [
  {
    title: 'Base da aplicação',
    items: ['Visão geral', 'Fluxos internos', 'Atividades recentes'],
  },
  {
    title: 'Módulos',
    items: ['Processos', 'Documentos', 'Assinaturas'],
  },
];

export function AppShell({
  children,
  title,
  subtitle,
  headerActions,
  sidebarFooter,
}: AppShellProps) {
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
                {group.items.map((item) => (
                  <li key={item}>
                    <span>{item}</span>
                  </li>
                ))}
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
                <span className="app-shell__status">Sessão autenticada</span>
                <button type="button">Ações rápidas</button>
              </>
            )}
          </div>
        </header>

        <main className="app-shell__main">{children}</main>
      </div>
    </div>
  );
}
