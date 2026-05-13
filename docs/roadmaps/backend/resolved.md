# Backend — Itens Resolvidos

Este arquivo resume itens backend ja concluidos ou resolvidos. O antigo tracker backend permanece como indice de compatibilidade em [`../backend-implementation-tracker.md`](../backend-implementation-tracker.md).

Esta separacao nao altera status de tasks, nao move documentos legados e nao arquiva historico. Ela apenas prepara a futura reducao dos roadmaps legados.

## BE-DOC-CESAD-SIGN-01 — Modelar e validar assinatura colegiada do parecer CESAD

- **Status documental:** concluida / auditada / aprovada com ressalvas.
- Implementou o ciclo documental minimo do parecer CESAD de etapa com `ProcessDocument.CESAD_OPINION`.
- O documento CESAD de etapa e stage-bound, vinculado a `evaluationProcessId`, `processStageId` e `documentType = CESAD_OPINION`.
- Criou/reutilizou de forma idempotente o documento CESAD em `READY_FOR_SIGNATURE`, com `artifactPath = null`.
- Alterou `SignatureRecord` para permitir multiplos signatarios CESAD no mesmo documento.
- Substituiu a unique antiga por `processDocumentId + signatoryUserId + signatoryRole`.
- Adicionou vinculo nullable de `SignatureRecord` com `CesadStageOpinionExpectedSigner`.
- Criou a migration `20260513120000_add_cesad_opinion_collegiate_signatures`.
- Gera assinaturas pendentes a partir de `CesadStageOpinionExpectedSigner`.
- Cria uma assinatura `PENDING` por expected signer, com `signatoryUserId = actingUserId`, `signatoryRole = CESAD_MEMBER` e `provider = INTERNAL`.
- Nao assina automaticamente o autor do parecer.
- Bloqueia assinatura por membro nao esperado.
- Bloqueia assinatura por `COMMISSION_ASSISTANT`.
- Nao permite que `ADMIN` assine por membro.
- Mantem o documento CESAD em `READY_FOR_SIGNATURE` enquanto houver pendencias.
- Marca o documento CESAD como `SIGNED` somente quando todos os expected signers assinarem.
- Bloqueia `ISSUE_CESAD_OPINION` ate que o documento CESAD stage-bound esteja `SIGNED` e todas as assinaturas esperadas estejam `COMPLETED`.
- Adicionou a action contratual `PREPARE_CESAD_OPINION_SIGNATURES`.
- Implementou os endpoints `POST /processes/:id/stages/:sequence/cesad-stage-opinion/signatures/prepare`, `GET /processes/:id/stages/:sequence/cesad-stage-opinion/signatures` e `POST /processes/:id/stages/:sequence/cesad-stage-opinion/sign`.
- Ampliou testes backend para preparacao idempotente, documento stage-bound, multiplos membros CESAD, bloqueios de autorizacao, assinatura parcial/completa, workflow e regressoes de chefia/autoavaliacao.
- Validacoes aprovadas: build de `@sadep/contracts`, `npm run prisma:generate --workspace @sadep/backend`, `npm run typecheck --workspace @sadep/backend`, `npm run typecheck:spec --workspace @sadep/backend`, `npm run test --workspace @sadep/backend`, `npx prisma validate --schema apps/backend/prisma/schema.prisma` com `DATABASE_URL` temporaria e `git diff --check`.
- Ressalvas remanescentes: metadata de `SIGNATURE_REQUESTED` pode ser enriquecida futuramente com `signatureId` e `signatureStatus = PENDING`; a nova unique permite multiplos usuarios com a mesma role no mesmo documento, entao documentos nao colegiados seguem protegidos pela camada de service; versionamento documental, invalidacao/supersessao documental, substituicao formal de signatario apos assinatura aberta e assinatura externa GOVBR real permanecem fora do recorte.
- Nao alterou frontend, quatro etapas, parecer conclusivo final, homologacao, notificacao, ciencia, recursos, portaria ou versionamento documental.
- `BE-FLOW-4STAGE-01`, `BE-CESAD-FINAL-01` e `BE-HOMOLOG-01` permanecem pendentes.

## BE-CESAD-ASSIGN-REPLACE-01 — Modelar reatribuicao e supersessao formal de comissao CESAD por etapa

- **Status documental:** concluida / auditada / aprovada com ressalvas.
- Implementou o endpoint `POST /processes/:id/stages/:sequence/cesad-stage-assignment/supersede`.
- O payload aceita `newCommissionId`, `reason`, `referenceDate` opcional e `formalActReference` opcional.
- A autorizacao ficou restrita a `ADMIN` e `HOMOLOGATION_AUTHORITY`.
- Bloqueia `CESAD_MEMBER`, `COMMISSION_ASSISTANT`, chefia imediata, servidor avaliado e usuario nao autenticado/invalido.
- Exige processo em `EM_ANALISE_CESAD`.
- Exige exatamente uma assignment `ACTIVE` para a etapa.
- Valida a nova comissao CESAD, impedindo comissao inexistente, `INACTIVE`, `SUPERSEDED`, fora de vigencia na `referenceDate` ou igual a comissao atual.
- Bloqueia reatribuicao quando ja existe `CesadStageOpinion` da etapa.
- Bloqueia reatribuicao quando ja existem `CesadStageOpinionExpectedSigner` congelados.
- Bloqueia reatribuicao quando ja existe `ProcessDocument.CESAD_OPINION` da etapa.
- Nao faz update simples de `commissionId`: a assignment antiga e preservada e marcada como `SUPERSEDED`.
- A assignment antiga recebe `supersededAt`, `supersededReason` e `supersededByAssignmentId`.
- A nova assignment nasce como `ACTIVE`, com `assignedByUserId`, `assignmentReason` e `referenceDate`.
- Criou auditoria por `AuditEventType.CESAD_STAGE_ASSIGNMENT_SUPERSEDED` e action `SUPERSEDE_CESAD_STAGE_ASSIGNMENT`.
- Ampliou testes backend para sucesso com admin/autoridade, bloqueios por papel e estado, bloqueios por artefatos CESAD, persistencia historica, auditoria e regressao de autorizacao contextual.
- Validacoes aprovadas: build de `@sadep/contracts`, `npm run prisma:generate --workspace @sadep/backend`, `npm run typecheck --workspace @sadep/backend`, `npm run typecheck:spec --workspace @sadep/backend`, `npm run test --workspace @sadep/backend`, `npx prisma validate --schema apps/backend/prisma/schema.prisma` com `DATABASE_URL` temporaria, typecheck frontend adicional e `git diff --check`.
- Nao alterou frontend, assinatura colegiada, quatro etapas, parecer conclusivo final, homologacao, notificacao, ciencia, `SignatureRecord` ou versionamento documental.
- Ressalvas remanescentes: `referenceDate` ainda usa parsing por `new Date(...)`; testes HTTP adicionais podem cobrir `referenceDate` invalida, `newCommissionId` vazio/nao string e `formalActReference` nao string; reatribuicao apos parecer, expected signers ou documento CESAD permanece bloqueada e depende de versionamento, invalidacao ou supersessao documental formal.
- `BE-SEC-03` permanece aberta como guarda-chuva para workflow completo de quatro etapas, parecer conclusivo final, homologacao/notificacao/ciencia e documentos posteriores.

## BE-CESAD-AUTH-02 — Implementar CesadStageAssignment

- **Status documental:** concluida / auditada / aprovada com ressalvas.
- **Commit funcional aprovado:** `8ffd804 feat(backend): persist CESAD stage assignments`.
- **ADR relacionada:** [`ADR-003 — Vinculo persistido entre comissao CESAD, processo e etapa`](../../architecture/adr/adr-003-cesad-stage-assignment.md).
- Criou o enum/status `CesadStageAssignmentStatus` com `ACTIVE`, `SUPERSEDED` e `CANCELED`.
- Criou o modelo Prisma `CesadStageAssignment`.
- Criou a migration propria `20260511120000_add_cesad_stage_assignment`.
- Modelou relacoes com processo, etapa, comissao CESAD, usuario responsavel pela atribuicao e autorrelacao para supersessao futura.
- Criou ou reutilizou assignment ativa da etapa durante `SEND_TO_CESAD`, dentro do recorte transacional da transicao.
- Bloqueou `SEND_TO_CESAD` quando nao ha comissao ativa inequivoca.
- Bloqueou `SEND_TO_CESAD` quando ha multiplas comissoes ativas.
- Impediu que comissoes `INACTIVE` ou `SUPERSEDED` sejam usadas para nova assignment ordinaria.
- Alterou a autorizacao contextual CESAD para usar assignment ativa da etapa.
- Bloqueou membro de outra comissao e fluxo sem assignment ativa.
- Manteve `COMMISSION_ASSISTANT` restrito a leitura/apoio, sem escrita de parecer nem transicao CESAD.
- Alterou `CesadStageOpinionExpectedSigner` para derivar a comissao da assignment da etapa.
- Ampliou testes backend para criacao de assignment, falhas de comissao, autorizacao por assignment, transicoes CESAD e expected signers.
- Validacoes aprovadas: `npm run prisma:generate --workspace @sadep/backend`, `npm run typecheck --workspace @sadep/backend`, `npm run typecheck:spec --workspace @sadep/backend`, `npm run test --workspace @sadep/backend`, `npx prisma validate --schema apps/backend/prisma/schema.prisma` com `DATABASE_URL` temporaria e `git diff --check`.
- Nao alterou frontend, contracts, roadmaps/status durante o patch funcional, assinatura colegiada completa, quatro etapas, parecer conclusivo final, homologacao, notificacao, ciencia, recursos, cookie `aep_pa_refresh` ou migracao ampla AEP -> SADEP.
- Ressalvas remanescentes: unicidade de assignment `ACTIVE` por etapa garantida em service/transacao; bases locais/dev com processos ja em `EM_ANALISE_CESAD` ou `PARECER_EMITIDO` podem exigir fixture/backfill controlado; metadata de `SENT_TO_CESAD` pode explicitar `assignedAt`/`referenceDate`; teste futuro pode afirmar status inalterado quando a criacao da assignment falha.
- `BE-SEC-03` permanece aberta como guarda-chuva estrutural para workflow completo, parecer final, homologacao/notificacao/ciencia e documentos posteriores.

## BE-CESAD-AUTH-01 — Aplicar autorizacao contextual CESAD aos endpoints sensiveis

- **Status documental:** concluida / auditada / aprovada com ressalvas.
- **Commit funcional aprovado:** `211a4d4 feat(backend): apply contextual CESAD authorization`.
- Aplicou `CesadContextAuthorizationService` aos fluxos sensiveis atuais de processos/CESAD.
- Protegeu workflow e historico para leitores CESAD com validacao contextual.
- Protegeu as transicoes CESAD sensiveis `ISSUE_CESAD_OPINION` e `REQUEST_ADJUSTMENT`.
- Protegeu a leitura consolidada CESAD por etapa.
- Protegeu leitura, rascunho e conclusao do parecer CESAD de etapa.
- Bloqueou `CESAD_MEMBER` e `COMMISSION_ASSISTANT` sem vinculo ativo em comissao CESAD vigente.
- Manteve `COMMISSION_ASSISTANT` vinculado restrito a leitura/apoio, sem escrita de parecer nem transicao CESAD.
- Preservou os fluxos de servidor avaliado, chefia imediata e admin.
- Ampliou testes backend para cenarios positivos e negativos de autorizacao contextual.
- Validacoes aprovadas: `npm run typecheck --workspace @sadep/backend`, `npm run typecheck:spec --workspace @sadep/backend`, `npm run test --workspace @sadep/backend`, `npx prisma validate --schema apps/backend/prisma/schema.prisma` com `DATABASE_URL` temporaria e `git diff --check`.
- Nao alterou schema, migrations, seeds, contracts, frontend, assinatura colegiada, workflow de quatro etapas, parecer conclusivo final, homologacao, notificacao, ciencia, recurso, cookie `aep_pa_refresh` ou documentacao de status durante o patch funcional.
- Ressalvas remanescentes: a politica ainda usa comissao/membresia vigente como referencia transitoria; nao ha vinculo persistido comissao-processo/etapa; testes futuros podem cobrir `COMMISSION_ASSISTANT` tentando `REQUEST_ADJUSTMENT`, comissao `SUPERSEDED` e cobertura HTTP adicional para `REQUEST_ADJUSTMENT`.
- `BE-SEC-03` permanece aberta como guarda-chuva estrutural.

## BE-ARCH-01 — Revisar estrategia de autenticacao web

- **Status documental:** resolvida no recorte planejado de sessao/auth.
- A frente consolidou semantica de sessao, revalidacao de usuario atual, contratos minimos, alinhamento frontend, refresh token opaco, `UserSession`, rotacao, revogacao por familia, cookie `HttpOnly`, access token em memoria, retry silencioso, validacao operacional de env/CORS/cookies e logs/testes estruturados de auth.
- Esta conclusao nao cobre todo o hardening institucional de seguranca HTTP, rate limit, CSRF, SIEM, auditoria persistida formal ou governanca completa de producao.
- Pendencias futuras relacionadas ficam separadas em `SEC-HARD-01` e `BE-AUDIT-AUTH-01`, sem reabrir as subtasks concluidas de `BE-ARCH-01`.

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
- `BE-ARCH-01E4A`, `BE-ARCH-01E4B` e `BE-ARCH-01E4C` foram entregues depois no recorte frontend; `BE-ARCH-01E5` e `BE-ARCH-01F` foram concluidas no recorte backend; a frente maior `BE-ARCH-01` pode ser lida como concluida no recorte planejado de sessao/auth.
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
- A implementacao funcional ficou fora da `BE-ARCH-01E2` e foi entregue depois na `BE-ARCH-01E3`; `BE-ARCH-01E4A`, `BE-ARCH-01E4B` e `BE-ARCH-01E4C` foram entregues posteriormente no frontend; `BE-ARCH-01E5` e `BE-ARCH-01F` foram concluidas no recorte backend; a frente maior `BE-ARCH-01` pode ser lida como concluida no recorte planejado de sessao/auth.

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
- As etapas frontend `BE-ARCH-01E4A`, `BE-ARCH-01E4B` e `BE-ARCH-01E4C` foram entregues depois com access token em memoria, bootstrap via refresh, retry silencioso e remocao dos caminhos legados de token de sessao; `BE-ARCH-01E5` e `BE-ARCH-01F` foram concluidas no recorte backend; a frente maior `BE-ARCH-01` pode ser lida como concluida no recorte planejado de sessao/auth.

## BE-TECH-02 — Revisar worker e cron

- **Status documental:** concluida no recorte de varredura tecnica.
- `apps/worker` e `apps/cron` existem apenas como estrutura reservada para arquitetura futura.
- As duas apps possuem READMEs e diretorios preservados por `.gitkeep`, sem `package.json`, scripts npm, entrypoint executavel, jobs, processors, queues, schedules ou tasks implementadas.
- A decisao registrada e manter worker e cron fora do escopo operacional imediato do MVP, evitando promessa de execucao assincrona ou rotina agendada ja disponivel.
- Nao houve implementacao de notificacoes, assinatura, publicacao, producao, workflow, CESAD ou regras processuais.
- Frontend, dados demonstrativos, fakes, placeholders e fallback visual nao foram alterados.
- Validacoes aprovadas: `npm run backend:build` e `git diff --check`.

## BE-ARCH-02 — Fortalecer pacotes compartilhados do monorepo

- **Status documental:** concluida no recorte estrutural de contracts.
- `@sadep/contracts` passou a expor `main`, `types` e `exports` a partir de `dist/`.
- O `tsconfig.base.json` passou a resolver `@sadep/contracts` pelo build compilado, reduzindo acoplamento direto com `packages/contracts/src`.
- Os tsconfigs backend deixaram de incluir `packages/contracts/src/**/*.ts`, e o Jest backend passou a mapear o pacote para `packages/contracts/dist/index.js`.
- Scripts backend/frontend constroem `@sadep/contracts` antes de typecheck, build ou teste quando necessario.
- Nao foram adicionados novos contratos funcionais, DTOs de auth, refresh token, UX frontend, dados demonstrativos, fakes, placeholders ou fallback visual.
- Validacoes aprovadas: `npm run build --workspace @sadep/contracts`, `node -e "require('@sadep/contracts')"`, `npm run typecheck --workspace @sadep/backend`, `npm run typecheck:spec --workspace @sadep/backend`, `npm run typecheck --workspace @sadep/frontend`, `npm run backend:build`, `npm run frontend:check`, `npm run test --workspace @sadep/backend` e `git diff --check`.

## BE-ARCH-01F — Auditar e testar eventos de autenticacao

- **Status documental:** concluida no recorte backend de eventos estruturados de auth.
- `AuthService` passou a emitir eventos JSON com codigos estaveis para login, refresh, reuso de refresh token, logout e rejeicao de access token.
- Os eventos registram metadados operacionais minimos e nao incluem senha, access token nem refresh token em texto puro.
- `auth.service.spec.ts` cobre sucesso/falha de login, refresh aceito/rejeitado, reuso detectado, logout idempotente e rejeicoes de access token por usuario inexistente, inativo ou role divergente.
- Nao houve alteracao de contracts, schema Prisma, frontend, dados demonstrativos, fakes, placeholders, fallback visual, CESAD, workflow, homologacao, assinatura ou regras processuais.
- Validacoes aprovadas: `npm run test:unit --workspace @sadep/backend -- auth.service.spec.ts`, `npm run typecheck --workspace @sadep/backend`, `npm run typecheck:spec --workspace @sadep/backend`, `npm run test --workspace @sadep/backend`, `npm run backend:build` e `git diff --check`.

## BE-ARCH-01E5 — Hardening operacional de cookies/CORS/env

- **Status documental:** concluida no recorte backend de validacao operacional de ambiente.
- `FRONTEND_ORIGIN` passou a exigir origin `http`/`https` explicita, sem wildcard, path, query, fragmento ou credenciais, e passa a ser normalizada por `URL.origin`.
- Em producao, `FRONTEND_ORIGIN` exige `https` e `COOKIE_SECURE=true` permanece obrigatorio.
- `COOKIE_DOMAIN` passou a rejeitar protocolo, path, wildcard, porta, labels invalidos e `localhost` em producao.
- `COOKIE_PATH` passou a rejeitar whitespace, semicolon, query e fragment.
- `env.validation.spec.ts` cobre os cenarios validos e invalidos de cookie/CORS/env.
- Nao houve alteracao de contracts, schema Prisma, frontend, dados demonstrativos, fakes, placeholders, fallback visual, CESAD, workflow, homologacao, assinatura ou regras processuais.
- O cookie default residual `aep_pa_refresh` nao foi renomeado neste recorte; permanece em `NOM-AEP-COOKIE-01`.
- Validacoes aprovadas: `npm run test:unit --workspace @sadep/backend -- env.validation.spec.ts`, `npm run typecheck --workspace @sadep/backend`, `npm run typecheck:spec --workspace @sadep/backend`, `npm run test --workspace @sadep/backend`, `npm run backend:build` e `git diff --check`.

## Outros concluidos no legado

Os blocos abaixo aparecem como concluidos no tracker legado e devem ser tratados como historico ate a fase de arquivamento:

- `BE-OPS-*`;
- `BE-QUAL-*`;
- `BE-SEC-01/02`;
- `CESAD-DOM-*`;
- `BE-IDENT-01`;
- `BE-STR-01`.

Para a leitura de transicao e links modulares, consultar [`../backend-implementation-tracker.md`](../backend-implementation-tracker.md).
