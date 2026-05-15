# Frontend (Next.js)

Interface operacional desacoplada para os perfis:
- servidor-estagiário
- chefia imediata
- CESAD/comissão
- autoridade homologadora
- administração técnica

Nesta etapa, o frontend já está autenticado, consome o backend real para login/sessão e também possui um dashboard técnico autenticado para consultar endpoints processuais iniciais.

## Configuracao de API

O cliente HTTP centralizado em `src/shared/api/http-client.ts` usa `NEXT_PUBLIC_API_BASE_URL` para montar as chamadas ao backend.

- Em desenvolvimento local, homologacao e producao, `NEXT_PUBLIC_API_BASE_URL` deve ser definida explicitamente.
- Quando `NEXT_PUBLIC_API_BASE_URL` nao esta definida, o cliente HTTP falha de forma explicita; nao ha fallback hardcoded para `localhost`.
- Em homologacao e producao, a variavel deve apontar para a origin HTTPS da API institucional.
- O valor deve ser apenas a origin da API, sem path final, query, fragmento, credenciais ou wildcard.
- `NEXT_PUBLIC_TECHNICAL_PROCESS_ID` nao deve ser reintroduzida; a selecao/consulta de processos deve continuar pela UI ou por listagens reais futuras.

Exemplo de configuração local (usando o arquivo `.env.example` copiado para `.env.local`):

```env
NEXT_PUBLIC_API_BASE_URL="http://localhost:3000"
```

## Estrutura atual

- `src/app`: composição de rotas, layouts, páginas técnicas e pontos de entrada do App Router.
- `src/features/auth`: tela de login e experiência de entrada no sistema.
- `src/features/dashboard`: dashboard técnico inicial para consultar workflow, histórico e avaliação da chefia.
- `src/features/home`: area historica de apoio por perfil, sem uso operacional ativo nesta etapa.
- `src/shared/api`: cliente HTTP, tipos de convenção de API e organização dos serviços autenticados.
- `src/shared/api/services`: serviços HTTP por contexto (`auth`, `processes`).
- `src/shared/auth`: sessão, provider, bootstrap autenticado, guards e redirects.
- `src/shared/rbac`: catálogo de perfis, labels, rotas iniciais e menu lateral.
- `src/shared/ui`: componentes básicos padronizados (`PageSection`, `InfoCard`, `FeedbackAlert`, `StatusBadge`, `KeyValueList`).
- `src/shared/styles`: estilos globais e tokens visuais.

## Convenções do frontend

### 1. Layout base

- Toda rota autenticada deve passar por `src/app/(authenticated)/layout.tsx`.
- O `AppShell` é a base visual obrigatória para páginas internas.
- Páginas devem preferir `PageSection` para estrutura e `InfoCard` para blocos de conteúdo.
- Dados resumidos devem usar `KeyValueList` em vez de listas ad hoc.
- Status operacionais devem usar `StatusBadge` para manter consistência visual.

### 2. Componentes básicos

Componentes reutilizáveis padronizados nesta etapa:

- `PageSection`: seção com eyebrow, título e descrição.
- `InfoCard`: cartão base para blocos técnicos.
- `FeedbackAlert`: padrão único para sucesso, aviso, erro e informação.
- `StatusBadge`: badge para estados e situações de integração.
- `KeyValueList`: renderização de pares label/valor para payloads técnicos.

### 3. Camada de serviços HTTP

A camada HTTP foi organizada em dois níveis:

1. `src/shared/api/http-client.ts`
   - centraliza `fetch`
   - aplica `Content-Type`
   - injeta bearer token
   - normaliza parsing JSON
   - converte falhas em `HttpError`

2. `src/shared/api/services/*`
   - `auth-service.ts`: `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me` e `/auth/admin-check`
   - `processes-service.ts`: endpoints processuais autenticados de workflow, historico, workspace do servidor, workspace da chefia, avaliacoes e leitura consolidada CESAD por etapa

Regra: páginas e contextos não devem chamar `fetch` bruto diretamente quando o endpoint fizer parte do contrato da aplicação.

### 4. Convenção de listagem e resposta da API

Para novos endpoints de listagem consumidos pelo frontend, o padrão alvo é:

```json
{
  "items": [],
  "meta": {
    "total": 0,
    "page": 1,
    "pageSize": 10
  }
}
```

Convenções:

- `items` contém os registros.
- `meta.total` é obrigatório.
- `meta.page` e `meta.pageSize` são opcionais quando não houver paginação.
- endpoints legados que ainda retornam array puro devem ser adaptados na camada de serviço, sem contaminar os componentes de tela.

### 5. Convenção de erro na UI

A UI trata erros nesta ordem:

1. `message`
2. `error`
3. fallback com status HTTP

Formato alvo de erro:

```json
{
  "statusCode": 400,
  "message": "Mensagem principal",
  "error": "Bad Request",
  "path": "/rota",
  "timestamp": "2026-03-20T00:00:00.000Z",
  "details": {
    "campo": ["motivo 1", "motivo 2"]
  }
}
```

Convenções de UI:

- `FeedbackAlert` é o bloco visual padrão.
- arrays em `message` devem ser unidos em um único texto amigável.
- `details` é opcional e pode ser exibido em lista.
- `401` deve limpar sessão local e redirecionar para a tela técnica de sessão expirada.

## Modelos mínimos exibidos na UI

### Sessão autenticada

`POST /auth/login`

```json
{
  "accessToken": "jwt-ou-token-equivalente",
  "user": {
    "sub": "uuid-do-usuario",
    "email": "usuario@sadep.local",
    "role": "ADMIN"
  }
}
```

`GET /auth/me`

```json
{
  "sub": "uuid-do-usuario",
  "email": "usuario@sadep.local",
  "role": "ADMIN"
}
```

Campos mínimos obrigatórios nesta etapa:
- `sub`
- `email`
- `role`

### Workflow técnico inicial

`GET /processes/:id/workflow`

```json
{
  "id": "process-id",
  "status": "EM_AVALIACAO",
  "availableActions": ["START_EVALUATION"]
}
```

### Histórico técnico inicial

`GET /processes/:id/history`

```json
[
  {
    "id": "audit-id",
    "action": "START_EVALUATION",
    "eventType": "EVALUATION_STARTED",
    "actorUserId": "user-id",
    "actorRole": "IMMEDIATE_SUPERVISOR",
    "beforeState": null,
    "afterState": { "supervisorEvaluationStatus": "DRAFT" },
    "comment": null,
    "occurredAt": "2026-03-20T00:00:00.000Z"
  }
]
```

No frontend, esse retorno é adaptado para a convenção interna de listagem `{ items, meta }` dentro da camada de serviço.

### Avaliação da chefia

`GET /processes/:id/supervisor-evaluation`

```json
{
  "id": "evaluation-id",
  "processId": "process-id",
  "evaluatorUserId": "user-id",
  "status": "DRAFT",
  "summary": "Resumo",
  "generalComments": "Comentários gerais",
  "content": {
    "criteria": [
      {
        "code": "CRIT-01",
        "label": "Critério",
        "rating": 4,
        "comment": "Observação opcional"
      }
    ]
  },
  "submittedAt": null,
  "createdAt": "2026-03-20T00:00:00.000Z",
  "updatedAt": "2026-03-20T00:00:00.000Z"
}
```

## Identificadores e labels por perfil

Catálogo centralizado usado pelo frontend:

- `INTERN_SERVER` → `Servidor estagiário`
- `IMMEDIATE_SUPERVISOR` → `Chefia imediata`
- `CESAD_MEMBER` → `CESAD / comissão`
- `HOMOLOGATION_AUTHORITY` → `Autoridade homologadora`
- `ADMIN` → `Administrador técnico`

Cada perfil também possui:
- descrição curta padronizada
- rota inicial autenticada
- rota inicial autenticada

## Areas operacionais e demonstrativas

Mantidas nesta etapa como telas reais, paineis de leitura ou areas demonstrativas controladas:

- `/servidor-estagiario`
- `/chefia-imediata`
- `/cesad-comissao`
- `/homologacao-autoridade`
- `/admin`

Essas paginas nao devem ser tratadas como scaffolds vazios. Quando ainda dependem de backend futuro, devem explicitar a limitacao de forma institucional e preservar dados demonstrativos seguros para validacao visual.

## Estrategia de token no frontend

- O access token fica apenas em memoria, no `access-token-store`.
- O refresh token nao e exposto ao JavaScript; ele e transportado pelo backend em cookie `HttpOnly`.
- No bootstrap autenticado, o frontend chama `POST /auth/refresh` com `credentials: include`; em caso de sucesso, recebe novo access token e usuario.
- `rememberMe` preserva apenas a preferencia de experiencia de entrada, nao uma sessao completa em `localStorage` ou `sessionStorage`.
- Caminhos legados de sessao em storage sao limpos pelo frontend quando encontrados.
- Chamadas autenticadas usam o bearer token em memoria.
- O `http-client` faz retry silencioso de `401` com refresh single-flight, evitando multiplos refresh concorrentes e loop em rotas de auth.
- Se o refresh falhar ou a sessao expirar, a sessao em memoria e descartada e o usuario e redirecionado para `/sessao-expirada`.
- `403` permanece como falta de permissao e nao deve limpar a sessao por si so.
