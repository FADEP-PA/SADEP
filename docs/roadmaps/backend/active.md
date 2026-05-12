# Backend — Painel Ativo

Este painel resume os itens backend ativos, retomaveis ou pendentes. O antigo tracker backend permanece como indice de compatibilidade em [`../backend-implementation-tracker.md`](../backend-implementation-tracker.md).

## Concluido recente

### BE-CESAD-AUTH-02 — Implementar CesadStageAssignment

- **Status operacional:** concluida / auditada / aprovada com ressalvas.
- **Commit funcional aprovado:** `8ffd804 feat(backend): persist CESAD stage assignments`.
- **Decisao arquitetural:** implementa a [`ADR-003`](../../architecture/adr/adr-003-cesad-stage-assignment.md), adotando `CesadStageAssignment` como vinculo persistido entre comissao CESAD, processo e etapa.
- **Escopo entregue:** enum `CesadStageAssignmentStatus`, modelo Prisma `CesadStageAssignment`, migration `20260511120000_add_cesad_stage_assignment`, relacoes com processo, etapa, comissao, usuario e supersessao futura.
- **Efeito no workflow:** a assignment ativa da etapa e criada ou reutilizada durante `SEND_TO_CESAD`, apos os guards documentais; ausencia de comissao ativa, multiplas comissoes ativas e comissoes `INACTIVE`/`SUPERSEDED` bloqueiam nova assignment ordinaria.
- **Efeito de seguranca:** a autorizacao contextual CESAD passou a usar assignment ativa da etapa; membros de outra comissao e fluxos sem assignment ativa sao bloqueados; `COMMISSION_ASSISTANT` permanece restrito a leitura/apoio.
- **Efeito documental futuro:** `CesadStageOpinionExpectedSigner` passou a derivar a comissao da assignment da etapa, preservando o contexto formal do envio a CESAD.
- **Validacoes/auditoria:** testes backend ampliados; `prisma:generate`, typecheck, typecheck de specs, suite backend, Prisma validate com `DATABASE_URL` temporaria e `git diff --check` aprovados.
- **Ressalvas:** unicidade de assignment `ACTIVE` por etapa garantida em service/transacao; bases locais/dev com processos ja em `EM_ANALISE_CESAD` ou `PARECER_EMITIDO` podem exigir fixture/backfill controlado; metadata de `SENT_TO_CESAD` pode explicitar `assignedAt`/`referenceDate` em recorte futuro; `BE-SEC-03` permanece aberta para supersessao, reatribuicao e integracoes estruturais.

### BE-CESAD-AUTH-01 — Aplicar autorizacao contextual CESAD aos endpoints sensiveis

- **Status operacional:** concluida / auditada / aprovada com ressalvas.
- **Commit funcional aprovado:** `211a4d4 feat(backend): apply contextual CESAD authorization`.
- **Escopo entregue:** `CesadContextAuthorizationService` passou a proteger os fluxos sensiveis atuais de workflow, historico, transicoes CESAD sensiveis, leitura consolidada CESAD e leitura/rascunho/conclusao do parecer CESAD de etapa.
- **Efeito de seguranca:** `CESAD_MEMBER` e `COMMISSION_ASSISTANT` sem vinculo ativo sao bloqueados; `COMMISSION_ASSISTANT` vinculado permanece restrito a leitura/apoio, sem escrita de parecer nem transicao CESAD; servidor avaliado, chefia imediata e admin preservam o comportamento anterior.
- **Validacoes/auditoria:** testes backend ampliados; typecheck, typecheck de specs, suite backend, Prisma validate com `DATABASE_URL` temporaria e `git diff --check` aprovados.
- **Ressalvas:** a politica foi depois fortalecida por `BE-CESAD-AUTH-02`, que criou o vinculo persistido comissao-processo-etapa. `BE-SEC-03` permanece ativa como guarda-chuva estrutural para supersessao, assinatura colegiada, workflow completo e pareceres futuros.

### BE-ARCH-01E3 — Implementar refresh, rotacao e logout server-side

- **Status operacional:** concluida / auditada / aprovada.
- **Commit funcional aprovado:** `feat(auth): add refresh token sessions`.
- **Escopo entregue:** login cria `UserSession` sem alterar `LoginResponse`; refresh token opaco e salvo apenas como `refreshTokenHash` HMAC-SHA-256; cookie `HttpOnly`; `POST /auth/refresh`; rotacao transacional com sessao anterior `ROTATED` e `replacedBySessionId`; deteccao de reuso com revogacao das sessoes ativas da familia; `POST /auth/logout` idempotente; CORS com `credentials: true` mantendo origem explicita.
- **Preservado:** bearer JWT atual, `/auth/me`, `/auth/admin-check`, frontend existente, contracts, Prisma schema/migrations, workflow, CESAD, permissoes e regras processuais.
- **Validacoes/auditoria:** implementacao auditada e aprovada; as validacoes obrigatorias passaram.
- **Etapa frontend seguinte:** `BE-ARCH-01E4A`, `BE-ARCH-01E4B` e `BE-ARCH-01E4C` foram entregues depois com access token em memoria, bootstrap via refresh, retry silencioso e remocao de caminhos legados de token; `BE-ARCH-01F` foi concluida no recorte de eventos estruturados de auth; `BE-ARCH-01E5` foi concluida no recorte de hardening operacional de cookies/CORS/env.

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
- **Observacao:** a frente maior `BE-ARCH-01` pode ser lida como concluida no recorte planejado de sessao/auth. Novas evolucoes devem nascer como tasks proprias.

## Pendentes relevantes

- [`BE-SEC-03` — fortalecer autorizacao contextual CESAD por processo](./tasks/BE-SEC-03-cesad-contextual-authorization.md): pendente critica como guarda-chuva estrutural; `BE-CESAD-AUTH-01` concluiu a protecao dos endpoints sensiveis e `BE-CESAD-AUTH-02` concluiu o vinculo persistido comissao-processo-etapa via assignment. Permanecem refinamentos futuros de reatribuicao/supersessao formal, assinatura colegiada, workflow completo e pareceres futuros.
- [`BE-CESAD-ASSIGN-REPLACE-01` — modelar reatribuicao e supersessao formal de comissao CESAD por etapa](./tasks/BE-CESAD-ASSIGN-REPLACE-01-assignment-supersession.md): pendente futura para substituir assignment ativa por ato formal auditado, sem troca automatica invisivel.
- [`BE-DOC-CESAD-SIGN-01` — modelar e validar assinatura colegiada do parecer CESAD](./tasks/BE-DOC-CESAD-SIGN-01-collegiate-opinion-signatures.md): pendente alta para pareceres com multiplos signatarios obrigatorios.
- [`BE-FLOW-4STAGE-01` — estruturar progressao formal das quatro etapas avaliativas](./tasks/BE-FLOW-4STAGE-01-four-stage-progression.md): pendente alta para nao confundir o fluxo reduzido atual com o Caso 2 completo.
- [`BE-CESAD-FINAL-01` — modelar parecer conclusivo final da CESAD](./tasks/BE-CESAD-FINAL-01-final-opinion.md): pendente alta e pre-condicao para homologacao final valida.
- [`BE-HOMOLOG-01` — modelar fluxo de homologacao, notificacao e ciencia](./tasks/BE-HOMOLOG-01-homologation-notification-acknowledgement.md): pendente futura dependente de parecer conclusivo final.
- [`BE-AUDIT-AUTH-01` — auditoria persistida de eventos de autenticacao](./tasks/BE-AUDIT-AUTH-01-persisted-auth-audit.md): melhoria futura; nao reabre `BE-ARCH-01F`, que foi concluida no recorte de logs/testes.

## Resolvidos por varredura global

- `BE-ARCH-01E4B` — retry automatico de `401`, refresh silencioso com single-flight e protecao contra loop foram identificados no `http-client` do frontend.
- `BE-ARCH-01E4C` — a varredura nao encontrou `session.accessToken` no frontend e confirmou o consumo autenticado via access token em memoria.
- `BE-ARCH-01E5` — hardening operacional de cookies/CORS/env concluido no recorte backend.
- A frente maior `BE-ARCH-01` foi concluida no recorte planejado de sessao/auth.
- `BE-ARCH-01F` — eventos estruturados de auth e testes unitarios concluidos no recorte backend.
- `BE-ARCH-02` — `@sadep/contracts` passou a expor `dist/` como entrypoint e consumidores constroem contracts antes dos gates.
- `BE-TECH-02` — worker e cron revisados; `apps/worker` e `apps/cron` permanecem como estrutura reservada, sem execucao no MVP.

## Backlog processual

O tracker legado documenta blocos `BE-FLOW-*`, incluindo formalizacao de documento de parecer CESAD, assinatura do parecer e substituicao por suplente. A partir da reconciliacao documental controlada pos-varredura, as pendencias estruturais acima passam a ter arquivos proprios neste diretorio. O tracker legado permanece apenas como indice de compatibilidade.

## Ressalvas de recorte

- `BE-ARCH-01` esta concluida no recorte planejado de sessao/auth; isso nao encerra hardening HTTP amplo, CSRF, rate limit ou auditoria persistida formal.
- `BE-ARCH-01E5` esta concluida no recorte de validacao operacional de env/CORS/cookies; hardening adicional fica em `SEC-HARD-01`.
- `BE-ARCH-01F` esta concluida no recorte de logs estruturados e testes de autenticacao; auditoria persistida formal fica em `BE-AUDIT-AUTH-01`.
- Homologacao, notificacao, ciencia e recursos nao devem ser tratados como implementados ate haver parecer conclusivo final, workflow e documentos correspondentes.
