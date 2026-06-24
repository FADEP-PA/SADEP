# Problemas Transversais Resolvidos

Este arquivo resume problemas transversais resolvidos ou mitigados. O antigo painel transversal foi arquivado em [`docs/archive/roadmaps-legados/problemas-atuais-do-projeto.md`](../../../archive/roadmaps-legados/problemas-atuais-do-projeto.md).

Esta separacao nao altera status, nao move documentos legados e nao arquiva historico. Problemas ativos continuam em [`./active-problems.md`](./active-problems.md).

## BE-CESAD-FINAL-01C — Envio formal a homologacao concluido

- **Status documental:** resolvido em 2026-06-24.
- **Commit funcional:** `a0e5b2d feat(backend): send final CESAD opinion to homologation`.
- A ponte formal `SEND_TO_HOMOLOGATION` foi implementada no backend com endpoint, guardas, auditoria e migration proprias.
- `BE-CESAD-FINAL-01` esta encerrada no recorte planejado das tres fatias.
- O proximo passo e `BE-HOMOLOG-01`.
- Documentacao do painel ativo atualizada para refletir `BE-HOMOLOG-01` como proxima prioridade.

## DX-FE-ENV-EXAMPLE-01 e FE-ENV-01 — Configuração e Documentação de Variáveis de Ambiente do Frontend

- **Status documental:** resolvidas.
- Criado o arquivo `apps/frontend/.env.example` com `NEXT_PUBLIC_API_BASE_URL` para homologação/produção e local.
- Atualizado o `docs/setup/local-setup.md` para instruir a cópia do arquivo `.env.example` para `.env.local` no ambiente de desenvolvimento local.
- Atualizado o `apps/frontend/README.md` refletindo a alteração na configuração opcional.
- Variáveis documentadas, evitando fallback silencioso de API.

## Varredura global pos-auth — 2026-05-07

- **Status documental:** registrada e reconciliada.
- A varredura confirmou que backend, frontend e contracts buildam; typechecks passam; testes backend passam; `git diff --check` passa; o worktree permaneceu limpo.
- `db:check` falhou apenas porque o banco local nao possuia seed minimo de desenvolvimento; para preparar ambiente local, usar `npm run backend:bootstrap`.
- Backend possui `UserSession`; login cria sessao; refresh rotaciona; logout revoga.
- Frontend nao persiste `accessToken`, usa bootstrap via `/auth/refresh` e mantem access token em memoria.
- Packages ativos usam `@sadep/*`; nao foram encontrados imports com a nomenclatura antiga de contracts.
- A divida estrutural inicial de packages foi tratada no recorte `BE-ARCH-02`; o cookie default residual `aep_pa_refresh` permanece como alerta `NOM-AEP-COOKIE-01`.

## DOC-AUTH-STATE-01 — Reconciliar status documental de BE-ARCH-01E4B/E4C

- **Status documental:** resolvida nesta atualizacao documental.
- A varredura global confirmou que `BE-ARCH-01E4B` estava implementada no codigo com retry automatico de `401`, refresh silencioso e single-flight.
- A varredura global confirmou que `BE-ARCH-01E4C` estava implementada no codigo quanto a ausencia de consumidores de `session.accessToken`.
- Os roadmaps foram reconciliados para nao apresentar `BE-ARCH-01E4B` ou `BE-ARCH-01E4C` como proximas implementacoes pendentes.
- `BE-ARCH-01E5` foi concluida posteriormente no recorte de hardening operacional; a frente maior `BE-ARCH-01` pode ser lida como concluida no recorte planejado de sessao/auth.

## BE-ARCH-01F — Eventos de autenticacao

- **Status documental:** resolvida no recorte backend de eventos estruturados e testes unitarios.
- Login, refresh, reuso de refresh token, logout e rejeicoes de access token passaram a emitir eventos JSON com codigos estaveis.
- Os testes unitarios cobrem os principais eventos positivos e negativos e confirmam que senha recebida em login rejeitado nao aparece nos logs.
- Nao houve alteracao de frontend, dados demonstrativos, fakes, placeholders ou fallback visual.
- Auditoria persistida formal de eventos de auth permanece fora deste recorte e fica registrada em `BE-AUDIT-AUTH-01`.

## BE-ARCH-01E5 — Cookies/CORS/env

- **Status documental:** resolvida no recorte backend de hardening operacional.
- `FRONTEND_ORIGIN` exige origin explicita `http`/`https`, sem wildcard, path, query, fragmento ou credenciais, e exige `https` em producao.
- `COOKIE_DOMAIN` e `COOKIE_PATH` passaram a ter validacoes adicionais contra valores ambiguos ou invalidos.
- As exigencias de `COOKIE_SECURE=true` em producao e `COOKIE_SAMESITE=none` apenas com cookie seguro foram preservadas.
- O cookie default residual `aep_pa_refresh` permanece como alerta `NOM-AEP-COOKIE-01`, fora deste recorte.
- Nao houve alteracao de frontend, dados demonstrativos, fakes, placeholders ou fallback visual.
- Helmet/security headers, rate limit/throttling, politica CSRF/cookie ampla e revisao de logs com PII permanecem fora deste recorte e ficam em `SEC-HARD-01`.

## DOC-FT24-STATE-01 — Reconciliar status documental de FT-24

- **Status documental:** resolvida nesta atualizacao documental.
- A varredura global confirmou ausencia de `NEXT_PUBLIC_TECHNICAL_PROCESS_ID` no codigo frontend.
- `FT-24` foi reclassificada como resolvida no recorte frontend.
- Melhorias futuras de selecao ou listagem segura de processos por perfil devem nascer em task propria e nao manter `FT-24` aberta.

## DX-01 — Desalinhamento local do Next

- **Status documental:** resolvido operacionalmente.
- Antes: `package.json`/lock declaravam `next@15.5.15`, mas o ambiente executava `next@15.3.0`.
- Depois: `npm install` alinhou o ambiente local e `npm ls next` passou com `next@15.5.15`.
- `frontend:check`, build e typecheck do frontend passaram com `Next.js 15.5.15`.
- Nao houve alteracao versionada.
- O alerta `postcss`/audit permanece pendente em [`./tasks/DX-POSTCSS-01-audit-postcss-next.md`](./tasks/DX-POSTCSS-01-audit-postcss-next.md).

## BE-TECH-02 — Worker e cron como arquitetura futura

- **Status documental:** resolvida no recorte de varredura tecnica.
- `apps/worker` e `apps/cron` foram confirmados como estrutura sem implementacao nesta fase.
- Nao existem scripts npm, package dedicado, entrypoint, jobs, processors, queues, schedules ou tasks reais para worker/cron.
- A promessa operacional imediata foi retirada dos problemas ativos: worker e cron permanecem apenas como estrutura reservada para task futura propria.
- Nao houve alteracao de frontend, dados demonstrativos, fakes, placeholders ou fallback visual.

## BE-ARCH-02 — Packages compartilhados do monorepo

- **Status documental:** resolvida no recorte estrutural de `@sadep/contracts`.
- `@sadep/contracts` passou a usar `dist/` como entrypoint de `main`, `types` e `exports`.
- Backend e frontend constroem contracts antes dos gates relevantes, evitando dependencia runtime direta de `packages/contracts/src`.
- O backend deixou de incluir `packages/contracts/src/**/*.ts` nos tsconfigs de app/spec.
- Novos contratos funcionais, DTOs, schemas e eventos de dominio permanecem fora deste recorte e devem nascer como tasks proprias.
- Nao houve alteracao de frontend, dados demonstrativos, fakes, placeholders ou fallback visual.

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
- Auditoria/testes de eventos de autenticacao foram concluidos no recorte `BE-ARCH-01F`.
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
- Hardening operacional foi concluido no recorte `BE-ARCH-01E5`; auditoria formal de eventos foi concluida no recorte `BE-ARCH-01F`; `BE-ARCH-01E4B/C` foram concluidas no recorte frontend.

## BE-ARCH-01E4A — Access token em memoria e bootstrap via refresh

- **Status documental:** resolvida/mitigada no recorte frontend inicial.
- **Commit funcional aprovado:** `feat(frontend): keep access token in memory`.
- **Fix funcional aprovado:** `BE-ARCH-01E4A-FIX — fix(frontend): normalize public auth routes`.
- O risco de access token persistido em `localStorage` ou `sessionStorage` foi mitigado.
- O frontend passou a manter o access token em memoria, restaurar sessao via `POST /auth/refresh`, usar `credentials: include` em login/refresh/logout e chamar `POST /auth/logout` em modo best-effort.
- `rememberMe` passou a ser preferencia local nao sensivel e o storage legado `sadep:auth:session` deixou de ser prova de sessao autenticada.
- O alerta de UX do `401 público` no bootstrap foi mitigado pela normalizacao de rotas públicas no helper de auth; rota publica equivalente permanece como anonimo silencioso.
- A mitigacao frontend de retry automatico com single-flight e remocao dos consumidores remanescentes de `session.accessToken` foi concluida em `BE-ARCH-01E4B/C`.
- Hardening operacional foi concluido no recorte `BE-ARCH-01E5`; auditoria formal de eventos foi concluida no recorte `BE-ARCH-01F`; a frente maior `BE-ARCH-01` pode ser lida como concluida no recorte planejado de sessao/auth.

## BE-ARCH-01E4B — Retry 401 com refresh silencioso

- **Status documental:** resolvida/mitigada no recorte frontend.
- O `http-client` faz retry automatico apos `401` em rotas autenticadas nao-`/auth`.
- O refresh usa single-flight por promise compartilhada para evitar refresh storm.
- O retry reutiliza access token em memoria quando outra request ja concluiu a renovacao.
- Rotas `/auth/*` nao entram no retry, preservando protecao contra loop.
- `BE-ARCH-01E5` foi concluida no recorte backend de hardening operacional.

## BE-ARCH-01E4C — Remocao de consumidores de session.accessToken

- **Status documental:** resolvida/mitigada no recorte frontend.
- A varredura global nao encontrou `session.accessToken` no codigo frontend.
- O caminho legado de token explicito foi removido e as chamadas autenticadas usam access token em memoria.
- Validacao manual ampla permanece recomendada, mas nao reabre a task no recorte identificado.

## FT-24 — Remover dependencia de NEXT_PUBLIC_TECHNICAL_PROCESS_ID

- **Status documental:** resolvida no recorte frontend.
- A varredura global nao encontrou `NEXT_PUBLIC_TECHNICAL_PROCESS_ID` no codigo frontend.
- `/chefia-imediata`, `/processos` e `/servidor-estagiario` dependem de consulta manual/selecao explicita na UI.
- Listagem segura por perfil deve ser tratada em task futura propria.
- `FE-CHEFIA-01` permanece parcial como fluxo final de chefia; listagem segura por perfil deve ser tratada em `FE-CHEFIA-02` e/ou `FE-PROCESS-LIST-01`.

## Problemas antigos resolvidos

Os indices modulares tambem registram grupos de problemas resolvidos, incluindo identidade canonica, signatarios esperados, bootstrap local, preflight de banco, guard operacional do Prisma no Windows, build/start de producao e hardening de credenciais de desenvolvimento.

Para a leitura de transicao e links modulares, consultar [`../problemas-atuais-do-projeto.md`](../problemas-atuais-do-projeto.md).
