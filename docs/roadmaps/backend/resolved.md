# Backend — Itens Resolvidos

Este arquivo resume itens backend ja concluidos ou resolvidos. O antigo tracker backend permanece como indice de compatibilidade em [`../backend-implementation-tracker.md`](../backend-implementation-tracker.md).

Esta separacao nao altera status de tasks, nao move documentos legados e nao arquiva historico. Ela apenas prepara a futura reducao dos roadmaps legados.

## BE-TECH-01 — Migrar configuracao Prisma depreciada

- **Status documental:** concluida/aprovada no tracker legado.
- Criou `apps/backend/prisma.config.ts`.
- Removeu a configuracao antiga `package.json#prisma`.
- Preservou os scripts atuais do backend.
- Preservou `npm run backend:bootstrap` como fluxo oficial local.
- Preservou `DEV_SEED_PASSWORD` como requisito do seed local.
- Validacoes backend, bootstrap, Prisma e build passaram conforme registro legado.
- A limitacao historica de `prisma:migrate:dev` permanece separada e nao foi resolvida por esta task.

## BE-ARCH-01A — Fechar semantica de sessao web

- **Status documental:** decisao documental concluida.
- Consolidou bearer JWT temporario como estrategia incremental.
- Manteve expiracao de `1h`.
- Registrou que `/auth/me` deveria evoluir para leitura viva.
- Manteve refresh token, cookies, revogacao e logout server-side fora do escopo imediato.

## BE-ARCH-01B — Revalidar usuario atual no backend

- **Status documental:** concluida/aprovada no tracker legado.
- Backend passou a revalidar usuario vivo em requests autenticadas.
- Usuario inexistente, inativo ou com role divergente passa a produzir `401`.
- `/auth/me` passou a refletir estado persistido.
- Nao implementou refresh token, cookies, revogacao nem logout server-side.

## BE-ARCH-01C — Compartilhar contratos de auth/session

- **Status documental:** concluida/aprovada no tracker legado.
- Criou contratos minimos `AuthenticatedUserRef`, `LoginRequest` e `LoginResponse`.
- Backend e frontend passaram a reutilizar contratos minimos de auth/session.
- `AuthSession` e `rememberMe` permaneceram locais no frontend.
- `JwtPayload` permaneceu local no backend.

## BE-ARCH-01D — Alinhar frontend de sessao

- **Status documental:** concluida/aprovada.
- **Commit funcional aprovado:** `fix(frontend): align session invalidation`.
- Ajustou o bootstrap da sessao frontend para nao revalidar `/auth/me` em toda troca de rota.
- Manteve `/auth/me` atualizando `session.user` com dados vivos.
- Centralizou `401` no `http-client` com invalidacao idempotente para o MVP.
- Preservou `403` como falta de permissao, sem limpar sessao.
- Preservou sessao local em falhas nao-401 durante bootstrap/refresh.
- Manteve `AuthSession`, `rememberMe`, contratos de auth e storage atual.
- Nao implementou refresh token, cookies, revogacao nem logout server-side.
- `BE-ARCH-01E4A`, `BE-ARCH-01E4B` e `BE-ARCH-01E4C` foram entregues depois no recorte frontend; `BE-ARCH-01E5` e `BE-ARCH-01F` permanecem pendentes; a frente maior `BE-ARCH-01` nao esta totalmente concluida.
- Validacao manual em navegador ainda e recomendada para login, logout, reload autenticado, `401` concorrente, `403` e limpeza dos storages.

## BE-ARCH-01E2 — Modelar sessao e refresh token

- **Status documental:** concluida / auditada / aprovada.
- **Commit funcional aprovado:** `feat(auth): model user sessions`.
- Criou a entidade Prisma `UserSession`.
- Adicionou a relacao `User -> sessions`.
- Modelou `refreshTokenHash` como unico para refresh token futuro persistido apenas como hash.
- Modelou `familyId` para agrupar geracoes da mesma sessao logica/dispositivo.
- Preparou campos para expiracao, rotacao, revogacao, uso e metadados: `expiresAt`, `revokedAt`, `revokedReason`, `rotatedAt`, `replacedBySessionId`, `lastUsedAt`, `ipAddress`, `userAgent` e `metadata`.
- Criou indices em `userId`, `familyId`, `[userId, familyId]`, `expiresAt` e `revokedAt`.
- Criou a migration versionada `20260430120000_add_user_session`.
- A auditoria confirmou que `replacedBySessionId` permaneceu `String?`, sem self-relation inicial, e que nao foram criados enum Prisma de revogacao nem modelos `RefreshToken`, `SessionEvent`, `RevokedToken` ou `TokenFamily`.
- Validacoes aprovadas: `npm run prisma:generate --workspace @sadep/backend`, `npm run db:check --workspace @sadep/backend`, `npm run typecheck --workspace @sadep/backend`, `npm run typecheck:spec --workspace @sadep/backend`, `npm run test --workspace @sadep/backend`, `npm run backend:build`, `npm run backend:bootstrap` e `git diff --check`.
- A validacao `npx prisma migrate diff` continua falhando por limitacao historica P3006 em migration antiga com `ALTER TABLE ... ADD CONSTRAINT` no SQLite shadow DB; a falha e preexistente, nao foi causada pela migration nova e nao bloqueia esta task porque o fluxo oficial local com `db push` passou.
- Nao implementou refresh real, endpoints, cookies, CORS, frontend, contracts, auditoria formal, rotacao real, revogacao real ou logout server-side.
- A implementacao funcional ficou fora da `BE-ARCH-01E2` e foi entregue depois na `BE-ARCH-01E3`; `BE-ARCH-01E4A`, `BE-ARCH-01E4B` e `BE-ARCH-01E4C` foram entregues posteriormente no frontend; `BE-ARCH-01E5` e `BE-ARCH-01F` permanecem pendentes, e a frente maior `BE-ARCH-01` nao esta totalmente concluida.

## BE-ARCH-01E3 — Implementar refresh, rotacao e logout server-side

- **Status documental:** concluida / auditada / aprovada.
- **Commit funcional aprovado:** `feat(auth): add refresh token sessions`.
- O login passou a criar `UserSession` sem alterar o body de `LoginResponse`.
- O refresh token passou a ser opaco, gerado sem claims/JWT/JSON, transportado em cookie `HttpOnly` e nunca retornado em JSON.
- Apenas o `refreshTokenHash` HMAC-SHA-256 e persistido; o token puro nao e salvo.
- `POST /auth/refresh` foi implementado sem exigir bearer token; valida cookie, sessao, expiracao, revogacao, usuario ativo e role emitida.
- O refresh rotaciona a sessao em transacao, cria nova linha com o mesmo `familyId`, marca a sessao anterior como `ROTATED`, preenche `rotatedAt` e `replacedBySessionId`, seta novo cookie e retorna o `LoginResponse` atual com novo access token.
- Reuso de refresh token rotacionado/revogado revoga sessoes ativas da mesma familia com `REUSE_DETECTED` e retorna `401` generico.
- `POST /auth/logout` foi implementado de forma idempotente, revogando a sessao quando encontrada e limpando o cookie sempre.
- O bearer JWT atual, `/auth/me`, `/auth/admin-check`, frontend existente, contracts, Prisma schema/migrations, workflow, CESAD, permissoes e regras processuais foram preservados.
- Validacoes aprovadas: `npm run prisma:generate --workspace @sadep/backend`, `npm run db:check --workspace @sadep/backend`, `npm run typecheck --workspace @sadep/backend`, `npm run typecheck:spec --workspace @sadep/backend`, `npm run test --workspace @sadep/backend`, `npm run backend:build` e `git diff --check`.
- As etapas frontend `BE-ARCH-01E4A`, `BE-ARCH-01E4B` e `BE-ARCH-01E4C` foram entregues depois com access token em memoria, bootstrap via refresh, retry silencioso e remocao dos caminhos legados de token de sessao; `BE-ARCH-01E5` e `BE-ARCH-01F` permanecem pendentes, e a frente maior `BE-ARCH-01` nao esta totalmente concluida.

## BE-TECH-02 — Revisar worker e cron

- **Status documental:** concluida no recorte de varredura tecnica.
- `apps/worker` e `apps/cron` existem apenas como estrutura reservada para arquitetura futura.
- As duas apps possuem READMEs e diretorios preservados por `.gitkeep`, sem `package.json`, scripts npm, entrypoint executavel, jobs, processors, queues, schedules ou tasks implementadas.
- A decisao registrada e manter worker e cron fora do escopo operacional imediato do MVP, evitando promessa de execucao assincrona ou rotina agendada ja disponivel.
- Nao houve implementacao de notificacoes, assinatura, publicacao, producao, workflow, CESAD ou regras processuais.
- Frontend, dados demonstrativos, fakes, placeholders e fallback visual nao foram alterados.
- Validacoes aprovadas: `npm run backend:build` e `git diff --check`.

## Outros concluidos no legado

Os blocos abaixo aparecem como concluidos no tracker legado e devem ser tratados como historico ate a fase de arquivamento:

- `BE-OPS-*`;
- `BE-QUAL-*`;
- `BE-SEC-01/02`;
- `CESAD-DOM-*`;
- `BE-IDENT-01`;
- `BE-STR-01`.

Para a leitura de transicao e links modulares, consultar [`../backend-implementation-tracker.md`](../backend-implementation-tracker.md).
