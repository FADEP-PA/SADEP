# Backend — Itens Resolvidos

Este arquivo resume itens backend ja concluidos ou resolvidos. O antigo tracker backend foi arquivado em [`docs/archive/roadmaps-legados/backend-implementation-tracker.md`](../../../archive/roadmaps-legados/backend-implementation-tracker.md). Quando aplicavel, arquivos de task detalhados resolvidos foram movidos para [`docs/archive/backend/tasks/`](../../../archive/backend/tasks/); task files ainda usados como referencia de guarda-chuva ou dependencia podem permanecer em [`tasks/`](./tasks/).

Esta separacao nao altera status de tasks, nao move documentos legados e nao arquiva historico. Ela apenas prepara a futura reducao dos roadmaps legados.

> Ultima atualizacao: 2026-08-26 — sincronizacao CESAD apos os recortes administrativos e de Presidente/snapshots.

---

## BE-CESAD-REG-01 — Cadastro e gerenciamento formal de comissoes CESAD

- **Status documental:** concluida / estabilizada / expandida pelos recortes posteriores.
- **Epic/task:** `#58 — BE-CESAD-REG-01 — Cadastro e gerenciamento formal de comissoes CESAD`.
- **PRs relacionados:** `#68`, `#69`, `#70`, `#71`, `#72`, `#74`, `#78`, `#86`, `#87`, `#88`, `#94`, `#95`, `#98`.
- **ADRs relacionadas:** [`ADR-006 — Gerenciamento formal da Comissao CESAD e rollover`](../../architecture/adr/adr-006-cesad-commission-management-and-rollover.md) e [`ADR-007 — Supersessao de parecer CESAD de etapa`](../../architecture/adr/adr-007-cesad-stage-opinion-supersession.md).
- **Task file de referencia:** [`BE-CESAD-REG-01-commission-registration-management.md`](./tasks/BE-CESAD-REG-01-commission-registration-management.md).
- Implementou administracao formal de Comissao CESAD por vigencia, ato designativo e composicao.
- A composicao vigente exige exatamente `1 PRESIDENTE`, no minimo `2 TITULARES` e `2 SUPLENTES`; `COMMISSION_ASSISTANT` permanece fora da composicao formal.
- Adicionou `registrationSnapshot`, `bondSnapshot` e `positionSnapshot` em `CesadCommissionMember`, preservando contexto funcional historico.
- `PRESIDENTE` passou a integrar a composicao efetiva e a derivacao de signatarios quando aplicavel.
- Implementou edicao de comissao ainda nao utilizada, preservando historico quando ja houver uso em processo.
- Implementou encerramento e supersessao com DTO formal, motivo administrativo, data efetiva opcional e referencia de sucessora quando suportada, mantendo bloqueios de rollover/historico.
- Exportou payloads de escrita compartilhados por `@sadep/contracts` no PR #87.
- Conectou create/update/close/supersede no frontend administrativo no PR #88 e consolidou o alinhamento final de Presidente/snapshots/nome automatico no PR #98.
- O backend gera o nome da comissao; o frontend nao deve tratar `name` como entrada de negocio.
- Adicionou auditoria administrativa propria de comissoes CESAD por `CesadCommissionAuditEvent`.
- Adicionou seed local minimo de comissao CESAD para testes e validacao de fluxo.
- Implementou rollover temporal de competencia CESAD por etapa para processos sem parecer iniciado.
- Implementou supersessao de parecer CESAD preparatorio, preservando historico e impedindo consolidacao indevida de atos de comissao anterior.
- Corrigiu o alinhamento de autorizacao de leitura administrativa: `GET /cesad/commissions` e `GET /cesad/commissions/:id` permitem `ADMIN` e `HOMOLOGATION_AUTHORITY`.
- **Politica temporal consolidada:** `publishedAt` e obrigatorio no DTO/schema e e a fonte de verdade para derivar o ano; `year` permanece materializado/persistido para compatibilidade e leitura.
- **Divergencia conhecida:** o write contract compartilhado ainda declara `year` obrigatorio e `publishedAt` opcional. Isso e divida de tipagem futura, nao evidencia de que a feature administrativa esteja incompleta.
- **Validacoes registradas nos ciclos funcionais:** build de `@sadep/contracts`, typecheck backend, typecheck specs, testes unitarios/backend aplicaveis, build backend, copy-check frontend, typecheck frontend, testes frontend, build frontend, Prisma validate e `git diff --check` conforme cada PR.
- **Fora do recorte preservado:** alinhamento futuro do write contract temporal, versionamento/supersessao documental amplo, PDF oficial e GOVBR real.

## BE-SEC-03 — Guarda-chuva residual de autorizacao contextual CESAD

- **Status documental:** encerrado / revisado / aprovado.
- **Revisao em:** 2026-06-29.
- A revisao confirmou que endpoints de homologacao nao requerem autorizacao contextual CESAD.
- Os atores do fluxo de homologacao sao `HOMOLOGATION_AUTHORITY`, `ADMIN` e o servidor avaliado, portanto o `CesadContextAuthorizationService` nao se aplica a esse recorte.
- As fatias `BE-CESAD-AUTH-01`, `BE-CESAD-AUTH-02`, `BE-CESAD-ASSIGN-REPLACE-01` e `BE-DOC-CESAD-SIGN-01` cobriram os pontos criticos de autorizacao CESAD contextual.
- Guarda-chuva encerrado formalmente; novas integracoes futuras devem nascer como tasks proprias.

## BE-HOMOLOG-01 — Homologacao, notificacao e ciencia do resultado

- **Status documental:** concluida / aprovada.
- **Commits funcionais:** `47d3e8a`, `b41a340`, `94ea40f`, `bc3a5b5`.
- Criou `HomologationRecord`, contracts de homologacao e fluxo completo no `HomologationService`/`HomologationController`.
- Implementou endpoints de status, homologacao, devolucao para regularizacao, notificacao e ciencia.
- Implementou transicoes `PARECER_EMITIDO` -> `HOMOLOGADO` -> `NOTIFICADO` -> `CIENTE`, com retorno para `EM_AVALIACAO` quando houver regularizacao.
- Criou documentos consolidados `HOMOLOGATION_RECORD`, `RESULT_NOTIFICATION` e `ACKNOWLEDGEMENT_RECORD`.
- Registrou auditoria `RESULT_HOMOLOGATED`, `ADJUSTMENT_REQUESTED`, `NOTIFICATION_SENT` e `ACKNOWLEDGEMENT_RECORDED`.
- Testes unitarios cobrem casos felizes e guardas do fluxo.
- Fora do recorte preservado: frontend especifico, portaria/publicacao, PDF real, encerramento formal e recursos.

## BE-FLOW-4STAGE-01 — Estruturar progressao formal das quatro etapas avaliativas

- **Status documental:** concluida no recorte de progressao formal / auditada / aprovada com ressalvas.
- **Fatias concluidas:** `BE-FLOW-4STAGE-01A` e `BE-FLOW-4STAGE-01B`.
- **ADR relacionada:** [`ADR-004 — Progressao formal das quatro etapas avaliativas`](../../architecture/adr/adr-004-four-stage-progression.md).
- A 01A materializou as quatro etapas obrigatorias do Caso 2 e corrigiu a resolucao da etapa atual para usar somente etapa ativa.
- A 01B implementou `COMPLETE_CURRENT_STAGE`, encerrando formalmente a etapa ativa, abrindo sequencialmente as etapas 2 a 4 e encerrando a quarta etapa sem antecipar atos finais.
- O recorte cobre lifecycle por `startedAt`/`endedAt`, protecao de etapas futuras, completude documental forte, auditoria e autorizacao contextual/administrativa controlada.
- Ressalvas: apos a etapa 4 nao ha etapa ativa; parecer final deve usar leitura/consolidacao historica.

## BE-CESAD-FINAL-01 — Parecer conclusivo final da CESAD

- **Status documental:** concluida no recorte funcional/documental/homologacao-ready.
- **Fatias concluidas:** `BE-CESAD-FINAL-01A`, `BE-CESAD-FINAL-01B` e `BE-CESAD-FINAL-01C`.
- **ADR relacionada:** [`ADR-005 — Modelagem do parecer conclusivo final da CESAD`](../../architecture/adr/adr-005-final-cesad-opinion-modeling.md).
- A 01A criou `CesadFinalOpinion`, elegibilidade objetiva apos quatro etapas e consolidacao historica process-wide.
- A 01B criou documento final `CESAD_OPINION / FINAL_CONCLUSIVE`, expected signers finais e assinatura colegiada final.
- A 01C implementou `SEND_TO_HOMOLOGATION` e persistiu `sentToHomologationAt`/`sentToHomologationByUserId`.
- Garantias documentais: parecer de etapa permanece `opinionKind = STAGE`; parecer final usa `opinionKind = FINAL_CONCLUSIVE`, `processStageId = null` e exige documento `SIGNED` com todas as assinaturas obrigatorias completas antes do envio.
- Fora do recorte preservado: recursos, frontend especifico, GOVBR real, portaria/publicacao, PDF real e versionamento/invalidacao documental amplo.

## BE-DOC-CESAD-SIGN-01 — Modelar e validar assinatura colegiada do parecer CESAD de etapa

- **Status documental:** concluida / auditada / aprovada com ressalvas.
- Implementou o ciclo documental minimo do parecer CESAD de etapa com `ProcessDocument.CESAD_OPINION` stage-bound.
- Criou preparacao idempotente de assinaturas, expected signers de etapa e assinatura colegiada por membros CESAD esperados.
- Bloqueou assinatura por membro nao esperado, `COMMISSION_ASSISTANT` e `ADMIN` assinando por membro.
- `ISSUE_CESAD_OPINION` passou a exigir documento CESAD stage-bound `SIGNED` e todas as assinaturas esperadas `COMPLETED`.
- Fora do recorte preservado: versionamento amplo, invalidacao/supersessao documental, substituicao formal de signatario apos assinatura aberta e assinatura GOVBR real.

## BE-CESAD-ASSIGN-REPLACE-01 — Reatribuicao e supersessao formal de comissao CESAD por etapa

- **Status documental:** concluida / auditada / aprovada com ressalvas.
- Implementou `POST /processes/:id/stages/:sequence/cesad-stage-assignment/supersede`.
- Autorizacao restrita a `ADMIN` e `HOMOLOGATION_AUTHORITY`.
- Preservou assignment antiga como `SUPERSEDED` e criou nova assignment `ACTIVE` em vez de sobrescrever `commissionId`.
- Bloqueou reatribuicao quando ja existe parecer CESAD, expected signers ou documento CESAD da etapa.
- Ressalva: reatribuicao apos atos documentais abertos permanece dependente de versionamento/invalidacao/supersessao documental formal.

## BE-CESAD-AUTH-02 — Implementar CesadStageAssignment

- **Status documental:** concluida / auditada / aprovada com ressalvas.
- **ADR relacionada:** [`ADR-003 — Vinculo persistido entre comissao CESAD, processo e etapa`](../../architecture/adr/adr-003-cesad-stage-assignment.md).
- Criou `CesadStageAssignment` e status `ACTIVE`, `SUPERSEDED` e `CANCELED`.
- Criou/reutilizou assignment ativa da etapa durante `SEND_TO_CESAD`.
- Autorizacao contextual CESAD passou a usar assignment ativa da etapa.
- Expected signers de parecer de etapa passaram a derivar a comissao da assignment.

## BE-CESAD-AUTH-01 — Aplicar autorizacao contextual CESAD aos endpoints sensiveis

- **Status documental:** concluida / auditada / aprovada com ressalvas.
- Implementou `CesadContextAuthorizationService` para proteger fluxos sensiveis de processos/CESAD.
- Protegeu workflow, historico, transicoes CESAD, leitura consolidada e parecer CESAD de etapa.
- Bloqueou membros/assistentes sem vinculo ativo em comissao CESAD vigente.
- A politica foi fortalecida posteriormente por `BE-CESAD-AUTH-02`, `BE-CESAD-ASSIGN-REPLACE-01` e `BE-DOC-CESAD-SIGN-01`.

## BE-ARCH-01 — Revisar estrategia de autenticacao web

- **Status documental:** resolvida no recorte planejado de sessao/auth.
- Consolidou semantica de sessao, revalidacao de usuario atual, contratos minimos, alinhamento frontend, refresh token opaco, `UserSession`, rotacao, revogacao por familia, cookie `HttpOnly`, access token em memoria, retry silencioso, validacao operacional de env/CORS/cookies e logs/testes estruturados de auth.
- Esta conclusao nao cobre todo o hardening institucional de seguranca HTTP, rate limit, CSRF, SIEM, auditoria persistida formal ou governanca completa de producao.
- Pendencias futuras relacionadas ficam separadas em `SEC-HARD-01` e `BE-AUDIT-AUTH-01`, sem reabrir as subtasks concluidas de `BE-ARCH-01`.

## BE-TECH-01 — Migrar configuracao Prisma depreciada

- **Status documental:** concluida/aprovada no tracker legado.
- Criou `apps/backend/prisma.config.ts`.
- Removeu a configuracao antiga `package.json#prisma`.
- Preservou os scripts atuais do backend e o fluxo oficial local `backend:bootstrap`.
- A limitacao historica de `prisma:migrate:dev` permanece separada e nao foi resolvida por esta task.

## BE-TECH-02 — Revisar worker e cron

- **Status documental:** concluida no recorte de varredura tecnica.
- `apps/worker` e `apps/cron` existem apenas como estrutura reservada para arquitetura futura.
- As duas apps possuem READMEs e diretorios preservados por `.gitkeep`, sem scripts npm, entrypoint executavel, jobs, processors, queues, schedules ou tasks implementadas.
- A decisao registrada e manter worker e cron fora do escopo operacional imediato do MVP.

## BE-ARCH-02 — Fortalecer pacotes compartilhados do monorepo

- **Status documental:** concluida no recorte estrutural de contracts.
- `@sadep/contracts` passou a expor `main`, `types` e `exports` a partir de `dist/`.
- O `tsconfig.base.json` passou a resolver `@sadep/contracts` pelo build compilado.
- Scripts backend/frontend constroem `@sadep/contracts` antes de typecheck, build ou teste quando necessario.

## BE-ARCH-01F — Auditar e testar eventos de autenticacao

- **Status documental:** concluida no recorte backend de eventos estruturados de auth.
- `AuthService` passou a emitir eventos JSON com codigos estaveis para login, refresh, reuso de refresh token, logout e rejeicao de access token.
- Os eventos nao incluem senha, access token nem refresh token em texto puro.
- `auth.service.spec.ts` cobre sucesso/falha de login, refresh aceito/rejeitado, reuso detectado, logout idempotente e rejeicoes de access token.

## BE-ARCH-01E5 — Hardening operacional de cookies/CORS/env

- **Status documental:** concluida no recorte backend de validacao operacional de ambiente.
- `FRONTEND_ORIGIN` passou a exigir origin `http`/`https` explicita, sem wildcard, path, query, fragmento ou credenciais, e passa a ser normalizada por `URL.origin`.
- Em producao, `FRONTEND_ORIGIN` exige `https` e `COOKIE_SECURE=true` permanece obrigatorio.
- `COOKIE_DOMAIN` e `COOKIE_PATH` passaram a ter validacoes operacionais.
- `env.validation.spec.ts` cobre os cenarios validos e invalidos de cookie/CORS/env.
- O cookie default residual `aep_pa_refresh` nao foi renomeado neste recorte; permanece em `NOM-AEP-COOKIE-01`.

## Outros concluidos no legado

Os blocos abaixo aparecem como concluidos no tracker legado e devem ser tratados como historico ate a fase de arquivamento:

- `BE-OPS-*`;
- `BE-QUAL-*`;
- `BE-SEC-01/02`;
- `CESAD-DOM-*`;
- `BE-IDENT-01`;
- `BE-STR-01`.

Para a leitura de transicao e links modulares, consultar [`docs/archive/roadmaps-legados/backend-implementation-tracker.md`](../../../archive/roadmaps-legados/backend-implementation-tracker.md).
