# Problemas Transversais Resolvidos

Este arquivo resume problemas transversais resolvidos ou mitigados. O antigo painel transversal permanece como indice de compatibilidade em [`../problemas-atuais-do-projeto.md`](../problemas-atuais-do-projeto.md).

Esta separacao nao altera status, nao move documentos legados e nao arquiva historico. Problemas ativos continuam em [`./active-problems.md`](./active-problems.md).

## DX-01 — Desalinhamento local do Next

- **Status documental:** resolvido operacionalmente.
- Antes: `package.json`/lock declaravam `next@15.5.15`, mas o ambiente executava `next@15.3.0`.
- Depois: `npm install` alinhou o ambiente local e `npm ls next` passou com `next@15.5.15`.
- `frontend:check`, build e typecheck do frontend passaram com `Next.js 15.5.15`.
- Nao houve alteracao versionada.
- O alerta `postcss`/audit permanece pendente em [`./tasks/DX-POSTCSS-01-audit-postcss-next.md`](./tasks/DX-POSTCSS-01-audit-postcss-next.md).

## BE-TECH-01 — Configuracao Prisma depreciada

- **Status documental:** resolvida no painel transversal e no tracker backend.
- A configuracao baseada em `package.json#prisma` foi removida.
- `apps/backend/prisma.config.ts` foi criado.
- Scripts, `backend:bootstrap`, seed com `DEV_SEED_PASSWORD` e fluxo local oficial foram preservados.
- A limitacao historica de `prisma:migrate:dev` permanece separada.

## BE-ARCH-01B — Revalidacao de usuario atual no backend

- **Status documental:** resolvida/concluida.
- O risco de o backend confiar apenas no payload do token ate a expiracao foi mitigado.
- Requests autenticadas passaram a revalidar usuario vivo e sessao invalida passou a ser tratada com `401`.

## BE-ARCH-01C — Contratos minimos de auth/session

- **Status documental:** resolvida/concluida.
- A duplicacao basica de contratos de auth/session entre backend e frontend foi mitigada.
- `AuthenticatedUserRef`, `LoginRequest` e `LoginResponse` foram introduzidos em `packages/contracts`.

## BE-ARCH-01D — Sessao frontend alinhada

- **Status documental:** resolvida/concluida no recorte minimo de sessao frontend.
- **Commit funcional aprovado:** `fix(frontend): align session invalidation`.
- O risco de revalidacao excessiva de `/auth/me` em toda troca de rota foi mitigado.
- `401` foi centralizado no `http-client` com invalidacao idempotente para o MVP.
- `403` foi preservado como falta de permissao, sem limpeza de sessao.
- Falhas nao-401 no bootstrap/refresh nao apagam sessao local indevidamente.
- `localStorage` e `sessionStorage` seguem limpos por `clearSession()` em sessao invalida.
- A estrategia de producao com refresh/revogacao permanece pendente em `BE-ARCH-01E`.
- Auditoria/testes de eventos de autenticacao permanecem pendentes em `BE-ARCH-01F`.
- Validacao manual em navegador ainda e recomendada para login, logout, reload autenticado, `401` concorrente, `403` e limpeza dos storages.

## BE-ARCH-01E2 — Modelagem persistente de sessao/refresh

- **Status documental:** resolvida/mitigada no recorte de modelagem.
- **Commit funcional aprovado:** `feat(auth): model user sessions`.
- O gap de modelagem persistente para refresh/revogacao foi mitigado com a entidade Prisma `UserSession`.
- A modelagem inclui relacao `User -> sessions`, `refreshTokenHash` unico, `familyId`, campos de expiracao, rotacao, revogacao, uso e metadados.
- A migration `20260430120000_add_user_session` foi criada e auditada.
- A implementacao funcional de refresh, cookies, rotacao real, revogacao real e logout server-side ficou fora da `BE-ARCH-01E2` e foi entregue depois na `BE-ARCH-01E3`; frontend, hardening operacional amplo e auditoria formal permanecem nas subtasks posteriores.

## BE-ARCH-01E3 — Refresh, rotacao e logout server-side

- **Status documental:** resolvida/mitigada no recorte backend.
- **Commit funcional aprovado:** `feat(auth): add refresh token sessions`.
- O gap backend de refresh, rotacao e logout server-side foi mitigado.
- O login cria `UserSession`, o refresh token e opaco, o hash HMAC-SHA-256 e persistido em `refreshTokenHash` e o transporte usa cookie `HttpOnly`.
- `POST /auth/refresh` e `POST /auth/logout` foram implementados; refresh rotaciona a sessao e reuso revoga sessoes ativas da familia.
- A etapa frontend `BE-ARCH-01E4A` foi entregue depois para access token em memoria e bootstrap via refresh.
- Hardening operacional amplo e auditoria formal permanecem pendentes em `BE-ARCH-01E5` e `BE-ARCH-01F`; `BE-ARCH-01E4B/C` foram concluidas no recorte frontend.

## BE-ARCH-01E4A — Access token em memoria e bootstrap via refresh

- **Status documental:** resolvida/mitigada no recorte frontend inicial.
- **Commit funcional aprovado:** `feat(frontend): keep access token in memory`.
- **Fix funcional aprovado:** `BE-ARCH-01E4A-FIX — fix(frontend): normalize public auth routes`.
- O risco de access token persistido em `localStorage` ou `sessionStorage` foi mitigado.
- O frontend passou a manter o access token em memoria, restaurar sessao via `POST /auth/refresh`, usar `credentials: include` em login/refresh/logout e chamar `POST /auth/logout` em modo best-effort.
- `rememberMe` passou a ser preferencia local nao sensivel e o storage legado `sadep:auth:session` deixou de ser prova de sessao autenticada.
- O alerta de UX do `401 público` no bootstrap foi mitigado pela normalizacao de rotas públicas no helper de auth; rota publica equivalente permanece como anonimo silencioso.
- A mitigacao frontend de retry automatico com single-flight e remocao dos consumidores remanescentes de `session.accessToken` foi concluida em `BE-ARCH-01E4B/C`.
- Hardening operacional amplo e auditoria formal permanecem pendentes em `BE-ARCH-01E5` e `BE-ARCH-01F`; a frente maior `BE-ARCH-01` nao esta totalmente concluida.

## Problemas antigos resolvidos

Os indices modulares tambem registram grupos de problemas resolvidos, incluindo identidade canonica, signatarios esperados, bootstrap local, preflight de banco, guard operacional do Prisma no Windows, build/start de producao e hardening de credenciais de desenvolvimento.

Para a leitura de transicao e links modulares, consultar [`../problemas-atuais-do-projeto.md`](../problemas-atuais-do-projeto.md).
