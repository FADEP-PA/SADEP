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

## Ponto de integração ao final da etapa

### `POST /auth/login`

Retorno esperado pelo frontend:

```json
{
  "accessToken": "jwt-ou-token-equivalente",
  "user": {
    "sub": "uuid-do-usuario",
    "email": "usuario@aep-pa.local",
    "role": "ADMIN"
  }
}
```

### `GET /auth/me`

Retorno esperado pelo frontend:

```json
{
  "sub": "uuid-do-usuario",
  "email": "usuario@aep-pa.local",
  "role": "ADMIN"
}
```

### Payload do usuário autenticado

O frontend considera obrigatórios, nesta etapa:

- `sub`
- `email`
- `role`

### Campo `role`

O campo `role` é usado para:

- decidir o redirecionamento pós-login;
- renderizar o menu lateral por perfil;
- proteger páginas técnicas por papel;
- exibir o shell correspondente ao perfil autenticado.

### Convenção de erro de autenticação

O cliente HTTP trata falhas JSON de autenticação usando, nesta ordem:

1. `message`
2. `error`
3. fallback com status HTTP

Para falhas de autenticação, a convenção atual é:

- `401` para credenciais inválidas;
- `401` para token inválido;
- `401` para token expirado.

### Estratégia de token no frontend

- `rememberMe = true` → persistir sessão em `localStorage`;
- `rememberMe = false` → persistir sessão em `sessionStorage`;
- no bootstrap da aplicação, o frontend chama `/auth/me` com `Bearer <token>`;
- se o backend responder `401`, a sessão local é descartada e o usuário é redirecionado para a página técnica de sessão expirada.

## Convenções do frontend nesta etapa

### Modelos mínimos exibidos na UI

- `AuthenticatedUserModel` → `{ sub, email, role }`
- `ProcessListItem` → `{ id, title, status, ownerName, currentStep }`
- `ApiListResponse<T>` → `{ items, meta: { total, page, pageSize } }`

### Convenções de listagem/resposta da API

- listas técnicas usam `items` e `meta`;
- detalhes técnicos usam identificadores explícitos (`id`) e labels legíveis (`title`);
- o frontend trata `status` como string de domínio devolvida pelo backend, sem reimplementar regra de negócio.

### Convenções de erro

- a UI prioriza `message`;
- usa `error` como fallback textual;
- usa `statusCode` para compor título e contexto quando disponível;
- o frontend exibe erro em componentes visuais padronizados (`FeedbackBanner`).

### Identificadores e labels por perfil

- `INTERN_SERVER` → identificador `servidor-estagiario` → label `Servidor estagiário`
- `IMMEDIATE_SUPERVISOR` → identificador `chefia-imediata` → label `Chefia imediata`
- `CESAD_MEMBER` → identificador `cesad-comissao` → label `CESAD / comissão`
- `HOMOLOGATION_AUTHORITY` → identificador `homologacao-autoridade` → label `Autoridade homologadora`
- `ADMIN` → identificador `admin` → label `Administrador técnico`

### Placeholders antes do workflow real

Nesta metade do sprint, a aplicação expõe placeholders técnicos para:

- dashboard inicial por perfil;
- tela de perfil autenticado;
- listagem técnica de processos em `/processos`;
- página de sessão expirada;
- shell autenticado com navegação lateral por papel.
