const systemCards = [
  {
    title: 'Sessão',
    description: 'Área preparada para exibir dados do usuário autenticado e seu papel atual.',
  },
  {
    title: 'Integrações',
    description: 'Ponto técnico para conectar `/auth/me`, notificações e dados iniciais.',
  },
  {
    title: 'Módulos',
    description: 'Atalho visual para os fluxos internos que serão liberados por perfil.',
  },
];

const pendingSteps = [
  'Conectar autenticação real com backend.',
  'Ativar guard de rota para área autenticada.',
  'Exibir menu por UserRole.',
];

export default function TechnicalHomePage() {
  return (
    <section className="technical-home">
      <div className="technical-home__hero">
        <div>
          <span className="technical-home__badge">Pós-login</span>
          <h2>Página inicial técnica</h2>
          <p>
            Esta é a base provisória da área autenticada, pensada para validar navegação,
            estrutura visual e pontos de integração do frontend.
          </p>
        </div>

        <div className="technical-home__panel">
          <strong>Status atual</strong>
          <ul>
            <li>Layout autenticado disponível.</li>
            <li>Rota técnica acessível para validação visual.</li>
            <li>Pronta para receber sessão e dados do usuário.</li>
          </ul>
        </div>
      </div>

      <div className="technical-home__grid">
        {systemCards.map((card) => (
          <article key={card.title} className="technical-home__card">
            <h3>{card.title}</h3>
            <p>{card.description}</p>
          </article>
        ))}
      </div>

      <section className="technical-home__checklist" aria-labelledby="pending-steps-title">
        <div>
          <span className="technical-home__section-label">Próximas integrações</span>
          <h3 id="pending-steps-title">O que falta ligar nesta etapa</h3>
        </div>

        <ol>
          {pendingSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
    </section>
  );
}
