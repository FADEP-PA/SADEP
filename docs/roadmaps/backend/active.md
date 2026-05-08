# Backend — Painel Ativo

Este painel resume os itens backend ativos, retomaveis ou pendentes. O antigo tracker backend permanece como indice de compatibilidade em [`../backend-implementation-tracker.md`](../backend-implementation-tracker.md).

## Concluido recente

### BE-ARCH-01E3 — Implementar refresh, rotacao e logout server-side

- **Status operacional:** concluida / auditada / aprovada.
- **Commit funcional aprovado:** `feat(auth): add refresh token sessions`.
- **Escopo entregue:** login cria `UserSession` sem alterar `LoginResponse`; refresh token opaco e salvo apenas como `refreshTokenHash` HMAC-SHA-256; cookie `HttpOnly`; `POST /auth/refresh`; rotacao transacional com sessao anterior `ROTATED` e `replacedBySessionId`; deteccao de reuso com revogacao das sessoes ativas da familia; `POST /auth/logout` idempotente; CORS com `credentials: true` mantendo origem explicita.
- **Preservado:** bearer JWT atual, `/auth/me`, `/auth/admin-check`, frontend existente, contracts, Prisma schema/migrations, workflow, CESAD, permissoes e regras processuais.
- **Validacoes/auditoria:** implementacao auditada e aprovada; as validacoes obrigatorias passaram.
- **Etapa frontend seguinte:** `BE-ARCH-01E4A`, `BE-ARCH-01E4B` e `BE-ARCH-01E4C` foram entregues depois com access token em memoria, bootstrap via refresh, retry silencioso e remocao de caminhos legados de token; permanecem pendentes `BE-ARCH-01E5` e `BE-ARCH-01F`.

### BE-ARCH-01E2 — Modelar sessao e refresh token

- **Status operacional:** concluida / auditada / aprovada.
- **Commit funcional aprovado:** `feat(auth): model user sessions`.
- **Escopo entregue:** modelagem persistente `UserSession`, relacao `User -> sessions`, `refreshTokenHash` unico, `familyId`, campos de expiracao, rotacao, revogacao, uso e metadados, alem da migration `20260430120000_add_user_session`.
- **Fora do escopo entregue:** refresh real, cookies, CORS, endpoints, logout server-side, frontend, contracts e auditoria formal.
- **Observacao:** a `BE-ARCH-01E1` foi concluida com a [`ADR-002`](../../architecture/adr/adr-002-session-refresh-revocation-strategy.md); a `BE-ARCH-01E2` entregou a modelagem estrutural; a `BE-ARCH-01E3` entregou o backend funcional de refresh, rotacao e logout server-side.

### [BE-ARCH-01D — Alinhar frontend de sessao](./tasks/BE-ARCH-01D-frontend-session-alignment.md)

- **Status operacional:** concluida / aprovada.
- **Escopo entregue:** alinhamento minimo de sessao frontend, bootstrap, `/auth/me`, `401` idempotente, preservacao de `403` e falhas nao-401 sem limpeza indevida de sessao.
- **Commit funcional aprovado:** `fix(frontend): align session invalidation`.
- **Ressalva:** validacao manual em navegador ainda recomendada para login, logout, reload autenticado, `401` concorrente, `403` e limpeza dos storages.
- **Observacao:** a frente maior `BE-ARCH-01` ainda nao esta totalmente concluida, pois `BE-ARCH-01E5` e `BE-ARCH-01F` permanecem pendentes.

## Pendentes relevantes

- `BE-ARCH-01E5` — hardening operacional de cookies/CORS/env.
- `BE-ARCH-01F` — auditar e testar eventos de autenticacao.
- [`BE-SEC-03` — fortalecer autorizacao contextual CESAD por processo](./tasks/BE-SEC-03-cesad-contextual-authorization.md).

## Resolvidos por varredura global

- `BE-ARCH-01E4B` — retry automatico de `401`, refresh silencioso com single-flight e protecao contra loop foram identificados no `http-client` do frontend.
- `BE-ARCH-01E4C` — a varredura nao encontrou `session.accessToken` no frontend e confirmou o consumo autenticado via access token em memoria.
- A frente maior `BE-ARCH-01` continua aberta enquanto `BE-ARCH-01E5` e `BE-ARCH-01F` permanecerem pendentes.
- `BE-ARCH-02` — `@sadep/contracts` passou a expor `dist/` como entrypoint e consumidores constroem contracts antes dos gates.
- `BE-TECH-02` — worker e cron revisados; `apps/worker` e `apps/cron` permanecem como estrutura reservada, sem execucao no MVP.

## Backlog processual

O tracker legado documenta blocos `BE-FLOW-*`, incluindo formalizacao de documento de parecer CESAD, assinatura do parecer e substituicao por suplente. Nesta fase, esses itens permanecem resumidos aqui e detalhados apenas no tracker legado.
