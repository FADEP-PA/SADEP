import { UserRole } from '@aep-pa/contracts';

const integrationPoints = [
  {
    title: 'Retorno de /auth/login',
    lines: ['{ accessToken, user }', 'user => { sub, email, role }'],
  },
  {
    title: 'Retorno de /auth/me',
    lines: ['{ sub, email, role }', 'payload do usuário autenticado reutilizado em toda a shell'],
  },
  {
    title: 'Campo role',
    lines: [`Enum compartilhado: ${Object.values(UserRole).join(', ')}`],
  },
  {
    title: 'Convenção de erro auth',
    lines: ['{ statusCode, message, error, path, timestamp }'],
  },
  {
    title: 'Estratégia de token',
    lines: [
      'Bearer token em Authorization header.',
      'Persistência em localStorage ou sessionStorage conforme rememberMe.',
      'Sessão inválida/expirada redireciona para /sessao-expirada.',
    ],
  },
];

export function AuthIntegrationSummary() {
  return (
    <section className="technical-home__checklist" aria-labelledby="auth-integration-title">
      <div>
        <span className="technical-home__section-label">Ponto de integração</span>
        <h3 id="auth-integration-title">Contrato técnico da autenticação nesta etapa</h3>
      </div>

      <div className="technical-home__integration-grid">
        {integrationPoints.map((point) => (
          <article key={point.title} className="technical-home__card">
            <h3>{point.title}</h3>
            <ul className="technical-home__bullet-list">
              {point.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
