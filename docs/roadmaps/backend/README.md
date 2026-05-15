# Roadmap Backend Modular

Esta pasta concentra a visao modular do roadmap backend do SADEP.

O documento legado foi arquivado em [`docs/archive/roadmaps-legados/backend-implementation-tracker.md`](../../../archive/roadmaps-legados/backend-implementation-tracker.md) (DOC-R8). A leitura operacional deve comecar por este diretorio modular.

## Arquivos

- [`active.md`](./active.md): painel operacional curto dos itens backend ativos, retomaveis ou pendentes.
- [`resolved.md`](./resolved.md): resumo dos itens backend concluidos ou resolvidos.
- [`tasks/`](./tasks/): area que comeca a receber arquivos proprios das tasks ativas principais.

## Itens ativos ou retomaveis

- `BE-SEC-03` — guarda-chuva residual / integracao futura de autorizacao contextual CESAD por processo.
- `BE-CESAD-FINAL-01` — guarda-chuva/fase principal do parecer conclusivo final da CESAD; 01A concluida, 01B/01C pendentes.
- `BE-CESAD-FINAL-01B` — documento e assinaturas colegiadas do parecer final.
- `BE-CESAD-FINAL-01C` — envio formal a homologacao.
- `BE-HOMOLOG-01` — modelar fluxo de homologacao, notificacao e ciencia.
- `BE-AUDIT-AUTH-01` — auditoria persistida de eventos de autenticacao.
- `BE-CONTRACT-CESAD-ASSIGN-01` — task condicional/futura para expor status de assignment CESAD em `@sadep/contracts` se API publica/frontend passarem a consumir esse status diretamente.
- `BE-FLOW-*` — backlog processual documentado no tracker legado e agora gradualmente detalhado em task files modulares.

## Concluido recente

- `BE-FLOW-4STAGE-01A` — materializacao das quatro etapas do Caso 2, lifecycle por `startedAt`/`endedAt`, resolucao de etapa atual ignorando etapas futuras e protecoes contra artefatos em etapa futura; concluida/auditada/aprovada com ressalvas.
- `BE-FLOW-4STAGE-01B` — `COMPLETE_CURRENT_STAGE` implementado com `STAGE_COMPLETED`, guarda documental forte, encerramento das etapas 1 a 3 com abertura sequencial da proxima etapa, fechamento da etapa 4 sem etapa 5, sem parecer final e sem homologacao; concluida/auditada/aprovada.
- `BE-FLOW-4STAGE-01` — concluida no recorte de progressao formal das quatro etapas por meio das fatias 01A + 01B; parecer conclusivo final, homologacao/notificacao/ciencia e recursos permanecem em tasks proprias.
- `BE-CESAD-FINAL-01A` — modelo funcional, elegibilidade e consolidacao historica do parecer conclusivo final; `CesadFinalOpinion`, fluxo `start`/`saveDraft`/`complete`, auditoria e testes concluidos/auditados/corrigidos/aprovados.
- `BE-CESAD-AUTH-01` — autorizacao contextual CESAD aplicada aos endpoints sensiveis atuais, com ressalvas estruturais preservadas em `BE-SEC-03`.
- `BE-CESAD-AUTH-02` — `CesadStageAssignment` implementada como vinculo persistido comissao-processo-etapa.
- `BE-CESAD-ASSIGN-REPLACE-01` — reatribuicao/supersessao formal de assignment CESAD por etapa implementada em recorte seguro.
- `BE-DOC-CESAD-SIGN-01` — assinatura colegiada do parecer CESAD de etapa concluida com `ProcessDocument.CESAD_OPINION` stage-bound e expected signers.
- `BE-ARCH-01D` — alinhamento minimo de sessao frontend concluido/aprovado; commit funcional aprovado `fix(frontend): align session invalidation`.
- `BE-ARCH-01E3` — refresh, rotacao e logout server-side concluidos/aprovados; commit funcional aprovado `feat(auth): add refresh token sessions`.
- `BE-ARCH-01E4A` — access token em memoria e bootstrap via refresh concluidos/aprovados; commit funcional aprovado `feat(frontend): keep access token in memory`.
- `BE-ARCH-01E4B` — retry automatico de `401` e single-flight identificados como implementados pela varredura global documental.
- `BE-ARCH-01E4C` — consumidores/caminhos legados de `session.accessToken` removidos no recorte frontend identificado pela varredura.
- `BE-ARCH-01E5` — hardening operacional de cookies/CORS/env concluido no recorte backend.
- `BE-ARCH-01F` — eventos estruturados de auth e testes unitarios concluidos no recorte backend.
- `BE-ARCH-02` — packages compartilhados estabilizados no recorte de `@sadep/contracts`, com `dist/` como entrypoint de consumo.
- `BE-TECH-02` — worker e cron revisados; `apps/worker` e `apps/cron` permanecem como estrutura reservada, sem execucao no MVP.
- A frente maior `BE-ARCH-01` pode ser lida como concluida no recorte planejado de sessao/auth. Hardening HTTP amplo, CSRF, rate limit e auditoria persistida formal permanecem em tasks proprias futuras.

## Regras de transicao

- Esta fase nao altera status de tasks.
- Tasks concluidas ficam resumidas em [`resolved.md`](./resolved.md).
- Arquivos de task detalhados ja resolvidos foram movidos para [`docs/archive/backend/tasks/`](../../../archive/backend/tasks/) na DOC-R8.
- Arquivos de task das frentes pendentes permanecem em [`tasks/`](./tasks/).
