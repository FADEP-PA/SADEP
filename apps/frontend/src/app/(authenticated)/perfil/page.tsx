'use client';

import { AuthGuard } from '@/shared/auth/auth-guard';
import { useAuth } from '@/shared/auth/auth-context';

const integrationPoints = [
  {
    title: 'Formato do retorno de /auth/login',
    items: ['accessToken: string', 'user.sub: string', 'user.email: string', 'user.role: UserRole'],
  },
  {
    title: 'Formato do retorno de /auth/me',
    items: ['sub: string', 'email: string', 'role: UserRole'],
  },
  {
    title: 'Convenção de erro de autenticação',
    items: [
      '401 para credenciais inválidas, token inválido ou token expirado.',
      'Payload tratado pelo frontend via `message`, `error` e `statusCode`.',
    ],
  },
  {
    title: 'Estratégia de token no frontend',
    items: [
      'Persistir em `localStorage` quando `rememberMe` estiver ativo.',
      'Persistir em `sessionStorage` quando a sessão for apenas da aba/janela.',
      'Revalidar o token em `/auth/me` ao iniciar a aplicação.',
    ],
  },
];

export default function AuthenticatedProfilePage() {
  const { session, status, bootstrapError } = useAuth();

  return (
    <AuthGuard>
      <section className="technical-home" aria-labelledby="authenticated-profile-title">
        <div className="technical-home__hero">
          <div>
            <span className="technical-home__badge">Usuário autenticado</span>
            <h2 id="authenticated-profile-title">Perfil da sessão atual</h2>
            <p>
              Painel técnico com o payload devolvido pelo backend e com as convenções de integração
              usadas pelo frontend nesta etapa.
            </p>
          </div>

          <div className="technical-home__panel">
            <strong>Payload atual</strong>
            <ul>
              <li>status: {status}</li>
              <li>sub: {session?.user.sub}</li>
              <li>email: {session?.user.email}</li>
              <li>role: {session?.user.role}</li>
              <li>rememberMe: {session?.rememberMe ? 'true' : 'false'}</li>
            </ul>
          </div>
        </div>

        <div className="technical-home__grid">
          {integrationPoints.map((section) => (
            <article key={section.title} className="technical-home__card">
              <h3>{section.title}</h3>
              <ul className="technical-home__list">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        {bootstrapError ? (
          <section className="technical-home__checklist" aria-labelledby="profile-error-title">
            <div>
              <span className="technical-home__section-label">Último aviso</span>
              <h3 id="profile-error-title">Feedback de autenticação capturado</h3>
            </div>

            <p className="technical-home__paragraph">{bootstrapError}</p>
          </section>
        ) : null}
      </section>
    </AuthGuard>
  );
}
