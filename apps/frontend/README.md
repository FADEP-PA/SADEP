# Frontend (Next.js)

Interface operacional desacoplada para os perfis:
- servidor-estagiário
- chefia imediata
- CESAD/comissão
- autoridade homologadora

Sem lógica de negócio nesta fase (somente estrutura).

## Estrutura inicial

O frontend está organizado em camadas mínimas para permitir evolução incremental:

- `src/app`: composição de rotas, layouts, páginas de loading e pontos de entrada do App Router.
- `src/features`: telas e componentes orientados à funcionalidade, como autenticação e placeholders por perfil.
- `src/shared/api`: cliente HTTP base, tratamento de erro e integrações transversais.
- `src/shared/auth`: sessão, provider, consumo de `/auth/login`, `/auth/me` e guardas de rota.
- `src/shared/rbac`: definição do menu e navegação inicial baseada em `UserRole`.
- `src/shared/ui`: shell autenticado, loading inicial e componentes reutilizáveis.
- `src/shared/styles`: estilos globais da aplicação.

## Convenções iniciais

- Rotas devem ficar em `src/app`.
- Telas específicas de uma funcionalidade devem ser montadas em `src/features`.
- Recursos transversais, como estilos, helpers de autenticação e cliente HTTP, devem ficar em `src/shared`.
- A sessão autenticada é persistida no navegador usando `localStorage` ou `sessionStorage`, conforme a opção de login.
- A área autenticada só deve ser renderizada após validação da sessão em `/auth/me`.


## Ponto de integração de autenticação

- `POST /auth/login` retorna `{ accessToken, user }`.
- `GET /auth/me` retorna `{ sub, email, role }`.
- O payload autenticado usa o campo `role` baseado no enum compartilhado `UserRole`.
- Erros de autenticação seguem a convenção `{ statusCode, message, error, path, timestamp }`.
- O token é mantido no frontend em `localStorage` ou `sessionStorage` e enviado no header `Authorization: Bearer <token>`.


## Shell funcional por perfil

- O login real consome `POST /auth/login`.
- A restauração de sessão consome `GET /auth/me`.
- O redirecionamento pós-login usa o `UserRole` autenticado para abrir o dashboard técnico adequado.
- As rotas protegidas por autenticação ficam sob a shell autenticada, e páginas sensíveis também usam proteção por papel.
- Existe uma página técnica para `sessao-expirada` e uma página dedicada ao `perfil` do usuário autenticado.
