const highlights = [
  'Acesso rápido para servidores, chefias e comissões.',
  'Interface pronta para integrar com a autenticação já existente.',
  'Layout responsivo para desktop, tablet e celular.',
];

export default function LoginPage() {
  return (
    <main className="login-shell">
      <section className="login-hero" aria-label="Apresentação do sistema">
        <span className="login-badge">AEP-PA</span>
        <h1>Portal de autenticação</h1>
        <p>
          Entre com seu e-mail institucional e senha para acessar os fluxos internos do
          sistema.
        </p>

        <ul className="login-highlights">
          {highlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="login-card" aria-labelledby="login-title">
        <div className="login-card__header">
          <p className="login-kicker">Bem-vindo</p>
          <h2 id="login-title">Faça seu login</h2>
          <p>Use as mesmas credenciais cadastradas no backend.</p>
        </div>

        <form className="login-form">
          <label className="field-group" htmlFor="email">
            <span>E-mail</span>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="nome@orgao.pa.gov.br"
              autoComplete="email"
            />
          </label>

          <label className="field-group" htmlFor="password">
            <span>Senha</span>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Digite sua senha"
              autoComplete="current-password"
            />
          </label>

          <div className="login-form__meta">
            <label className="checkbox-field" htmlFor="remember-me">
              <input id="remember-me" name="rememberMe" type="checkbox" />
              <span>Lembrar meu acesso</span>
            </label>

            <a href="/" aria-label="Recuperar acesso">
              Esqueci minha senha
            </a>
          </div>

          <button type="submit">Entrar</button>
        </form>
      </section>
    </main>
  );
}
