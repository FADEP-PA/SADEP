# Backend — Painel Ativo

> Ultima atualizacao: 2026-06-29 (BE-SEC-03 — revisado e encerrado como guarda-chuva; homologacao nao requer autorizacao CESAD contextual).
> Os arquivos de task ja resolvidos foram movidos para [`../../../../docs/archive/backend/tasks/`](../../../archive/backend/tasks/).
> Os indices de compatibilidade legados foram movidos para [`../../../../docs/archive/roadmaps-legados/`](../../../archive/roadmaps-legados/).

## Proxima prioridade imediata

**`SEC-HARD-01`** — Hardening adicional de seguranca HTTP: rate limiting refinado e protecao CSRF.

---

## Concluido recente

Os itens desta secao estao consolidados em [`resolved.md`](./resolved.md). Quando aplicavel, os arquivos de task detalhados ja resolvidos foram movidos para [`docs/archive/backend/tasks/`](../../../archive/backend/tasks/); task files ainda usados como referencia de guarda-chuva permanecem em [`tasks/`](./tasks/). Permanecem aqui apenas como resumo de transicao; nao compoem o backlog ativo.

### BE-FLOW-4STAGE-01A — Materializar quatro etapas e corrigir resolucao de etapa atual

- **Status operacional:** concluida / auditada / aprovada com ressalvas.
- **Commit funcional aprovado:** `84a3419 feat(backend): materialize four process stages`.
- **ADR relacionada:** [`ADR-004 — Progressao formal das quatro etapas avaliativas`](../../architecture/adr/adr-004-four-stage-progression.md).
- **Escopo entregue:** base estrutural de quatro `ProcessStage` para o Caso 2, com `ETAPA_1` a `ETAPA_4`, total de etapas igual a `4`, rotina `ensureFourProcessStages`, migration/backfill `20260513143000_materialize_four_process_stages` e test helpers ajustados para quatro etapas.
- **Lifecycle de etapa:** etapa futura usa `startedAt = null` e `endedAt = null`; etapa ativa usa `startedAt != null` e `endedAt = null`; etapa concluida usa `startedAt != null` e `endedAt != null`.
- **Resolucao de etapa atual:** `resolveCurrentStageOrThrow` passou a resolver somente etapa ativa e ignorar etapas futuras; leitura historica/consolidacao ficou separada em metodo proprio.
- **Protecoes:** etapas futuras nao recebem documentos, parecer CESAD, assinatura/documento CESAD, assignment/supersessao ou transicoes operacionais.
- **Continuidade:** a progressao formal foi concluida posteriormente pela `BE-FLOW-4STAGE-01B — Implementar COMPLETE_CURRENT_STAGE`.

### BE-FLOW-4STAGE-01B — Implementar COMPLETE_CURRENT_STAGE

- **Status operacional:** concluida / auditada / aprovada.
- **Commit funcional aprovado:** `9f6f122 feat(backend): complete current process stage`.
- **ADR relacionada:** [`ADR-004 — Progressao formal das quatro etapas avaliativas`](../../architecture/adr/adr-004-four-stage-progression.md).
- **Escopo entregue:** `ProcessAction.COMPLETE_CURRENT_STAGE`, `AuditEventType.STAGE_COMPLETED`, migration `20260514120000_add_stage_completed_audit_event`, transicao de workflow a partir de `PARECER_EMITIDO` e conclusao formal da etapa ativa.
- **Destino dinamico:** nas etapas 1 a 3, encerra a etapa atual, ativa sequencialmente a proxima etapa e retorna o processo para `EM_AVALIACAO`; na etapa 4, encerra a etapa sem criar etapa 5 e preserva `PARECER_EMITIDO`.
- **Guarda documental:** exige avaliacao da chefia assinada, autoavaliacao assinada, parecer CESAD funcional `COMPLETED`, expected signers existentes, documento `CESAD_OPINION` stage-bound `SIGNED` e assinaturas CESAD colegiadas completas.
- **Autorizacao:** `CESAD_MEMBER` continua dependente de assignment contextual; `ADMIN` executa de forma administrativa controlada; `COMMISSION_ASSISTANT`, chefia, servidor e autoridade homologadora permanecem bloqueados.
- **Ressalvas:** apos a etapa 4 nao ha etapa ativa; `BE-CESAD-FINAL-01` deve usar leitura/consolidacao historica adequada.

### BE-FLOW-4STAGE-01 — Estruturar progressao formal das quatro etapas avaliativas

- **Status operacional:** concluida no recorte de progressao formal / auditada / aprovada com ressalvas.
- **Fatias concluidas:** `BE-FLOW-4STAGE-01A` materializou as quatro etapas e corrigiu a resolucao da etapa atual; `BE-FLOW-4STAGE-01B` implementou `COMPLETE_CURRENT_STAGE`.
- **Escopo consolidado:** quatro etapas obrigatorias materializadas, etapa atual resolvida somente por lifecycle ativo, artefatos bloqueados em etapa futura, encerramento formal da etapa ativa, abertura sequencial das etapas 2 a 4 e fechamento da quarta etapa sem antecipar atos finais.
- **Fora do recorte preservado:** parecer conclusivo final permanece em `BE-CESAD-FINAL-01`; homologacao/notificacao/ciencia permanecem em `BE-HOMOLOG-01`.

### BE-CESAD-FINAL-01A — Modelo funcional, elegibilidade e consolidacao historica

- **Status operacional:** concluida / auditada / corrigida / aprovada.
- **Commit funcional aprovado:** `a3fa203 feat(backend): add final CESAD opinion model`.
- **ADR relacionada:** [`ADR-005 — Modelagem do parecer conclusivo final da CESAD`](../../architecture/adr/adr-005-final-cesad-opinion-modeling.md).
- **Escopo entregue:** entidade funcional `CesadFinalOpinion`, enum/status `CesadFinalOpinionStatus`, relacoes com `EvaluationProcess` e autor `User`, unicidade funcional por processo, `consolidatedSnapshot`, contracts/refs minimos, actions e audit events do parecer final.
- **Endpoints implementados:** `GET /processes/:id/cesad-final-opinion/eligibility`, `GET /processes/:id/cesad-final-opinion`, `POST /processes/:id/cesad-final-opinion/start`, `PUT /processes/:id/cesad-final-opinion/draft`, `POST /processes/:id/cesad-final-opinion/complete`.
- **Continuidade:** a camada documental e de assinatura colegiada final foi concluida posteriormente em `BE-CESAD-FINAL-01B`; `SEND_TO_HOMOLOGATION`, homologacao, notificacao, ciencia, recursos e frontend permanecem fora do recorte.

### BE-HOMOLOG-01 — Homologacao, notificacao e ciencia do resultado

- **Status operacional:** concluida / aprovada.
- **Commits funcionais:** `47d3e8a`, `b41a340`, `94ea40f`, `bc3a5b5`.
- **Escopo entregue:** modelo `HomologationRecord` com migration `20260629000000_add_homologation_record`; tipos contracts `HomologationStatusRef`, `ApproveHomologationRequest` e `NotifyResultRequest`; `HomologationService` com fluxo completo; `HomologationController` registrado em `ProcessesModule`.
- **Endpoints implementados:** `GET /processes/:id/homologation`, `POST approve`, `POST return-for-regularization`, `POST notify`, `POST acknowledge`.
- **Transicoes de status:** `PARECER_EMITIDO` → `HOMOLOGADO` (approve) → `NOTIFICADO` (notify) → `CIENTE` (acknowledge); `PARECER_EMITIDO` → `EM_AVALIACAO` (return-for-regularization).
- **Guardas implementadas:** HOMOLOGATION_AUTHORITY/ADMIN para approve, notify e return; only evaluated server para acknowledge; CESAD final opinion sentToHomologationAt != null antes de approve; idempotencia por ConflictException em todos os passos.
- **Documentos criados:** HOMOLOGATION_RECORD, RESULT_NOTIFICATION e ACKNOWLEDGEMENT_RECORD como ProcessDocument CONSOLIDATED.
- **Auditoria:** RESULT_HOMOLOGATED, ADJUSTMENT_REQUESTED, NOTIFICATION_SENT e ACKNOWLEDGEMENT_RECORDED registrados.
- **Testes:** 12 testes unitarios cobrindo casos felizes e todas as guardas; jest.config.js atualizado com homologation/ no testMatch.

### BE-CESAD-FINAL-01C — Envio formal a homologacao

- **Status operacional:** concluida / aprovada.
- **Commit funcional:** `a0e5b2d feat(backend): send final CESAD opinion to homologation`.
- **ADR relacionada:** [`ADR-005 — Modelagem do parecer conclusivo final da CESAD`](../../architecture/adr/adr-005-final-cesad-opinion-modeling.md).
- **Escopo entregue:** `ProcessAction.SEND_TO_HOMOLOGATION`, `AuditEventType.SENT_TO_HOMOLOGATION`, migration `20260522120000_add_final_opinion_homologation_send` com campos `sentToHomologationAt` e `sentToHomologationByUserId` em `CesadFinalOpinion`, endpoint `POST /processes/:id/cesad-final-opinion/send-to-homologation`.
- **Guardas implementadas:** `CesadFinalOpinion` em `COMPLETED`, nao enviada anteriormente, documento final `CESAD_OPINION / FINAL_CONCLUSIVE` em `SIGNED`, todas as assinaturas dos expected signers finais em `COMPLETED`.
- **Fora do recorte preservado:** homologacao, notificacao, ciencia, recursos, frontend, GOVBR real e portaria.
- **Continuidade:** `BE-CESAD-FINAL-01` encerrada; proximo passo e `BE-HOMOLOG-01`.

### BE-CESAD-FINAL-01B — Documento e assinaturas colegiadas do parecer final

- **Status operacional:** concluida / auditada / corrigida / aprovada.
- **Commit funcional/correcao pos-auditoria auditada:** `55279d3 fix(backend): handle final CESAD opinion P2002 collision`.
- **ADR relacionada:** [`ADR-005 — Modelagem do parecer conclusivo final da CESAD`](../../architecture/adr/adr-005-final-cesad-opinion-modeling.md).
- **Escopo entregue:** `CesadOpinionKind`, `ProcessDocument.opinionKind`, diferenciacao entre `STAGE` e `FINAL_CONCLUSIVE`, documento final `CESAD_OPINION` process-wide, `CesadFinalOpinionExpectedSigner`, vinculo final opcional em `SignatureRecord`, preparacao, consulta de status e assinatura colegiada final.
- **Endpoints implementados:** `POST /processes/:id/cesad-final-opinion/signatures/prepare`, `GET /processes/:id/cesad-final-opinion/signatures` e `POST /processes/:id/cesad-final-opinion/sign`.
- **Garantias documentais:** parecer CESAD de etapa permanece `opinionKind = STAGE`; parecer final usa `opinionKind = FINAL_CONCLUSIVE`, `processStageId = null`, `documentStatus = READY_FOR_SIGNATURE` ate completude colegiada e `SIGNED` apenas apos todas as assinaturas obrigatorias.
- **Correcao pos-auditoria:** foi registrado indice unico parcial SQLite para impedir duplicidade do documento final por processo e o tratamento `P2002` foi ajustado no caminho correto do documento final.
- **Fora do recorte preservado:** `SEND_TO_HOMOLOGATION` (entregue em 01C), homologacao, notificacao, ciencia, recursos, frontend, GOVBR real, portaria/publicacao, PDF real e versionamento/invalidacao documental amplo.

### BE-DOC-CESAD-SIGN-01 — Modelar e validar assinatura colegiada do parecer CESAD de etapa

- **Status operacional:** concluida / auditada / aprovada com ressalvas.
- **Escopo entregue:** ciclo documental minimo do parecer CESAD de etapa, com `ProcessDocument.CESAD_OPINION` stage-bound e assinatura colegiada derivada de `CesadStageOpinionExpectedSigner`.
- **Endpoints entregues:** `POST /processes/:id/stages/:sequence/cesad-stage-opinion/signatures/prepare`, `GET /processes/:id/stages/:sequence/cesad-stage-opinion/signatures` e `POST /processes/:id/stages/:sequence/cesad-stage-opinion/sign`.
- **Workflow:** `ISSUE_CESAD_OPINION` passou a exigir documento CESAD `SIGNED` e todas as assinaturas esperadas `COMPLETED`.
- **Ressalvas:** versionamento, invalidacao/supersessao documental, substituicao formal de signatario apos assinatura aberta e assinatura externa GOVBR real seguem fora do recorte.

### BE-CESAD-ASSIGN-REPLACE-01 — Reatribuicao e supersessao formal de comissao CESAD por etapa

- **Status operacional:** concluida / auditada / aprovada com ressalvas.
- **Endpoint entregue:** `POST /processes/:id/stages/:sequence/cesad-stage-assignment/supersede`.
- **Politica de autorizacao:** restrita a `ADMIN` e `HOMOLOGATION_AUTHORITY`.
- **Guardas processuais:** exige processo em `EM_ANALISE_CESAD`, exatamente uma assignment `ACTIVE`, nova comissao diferente, `ACTIVE` e vigente.
- **Guardas documentais/CESAD:** bloqueia reatribuicao quando ja houver `CesadStageOpinion`, `CesadStageOpinionExpectedSigner` ou `ProcessDocument.CESAD_OPINION` para a etapa.

### BE-CESAD-AUTH-02 — Implementar CesadStageAssignment

- **Status operacional:** concluida / auditada / aprovada com ressalvas.
- **Commit funcional aprovado:** `8ffd804 feat(backend): persist CESAD stage assignments`.
- **Decisao arquitetural:** implementa a [`ADR-003`](../../architecture/adr/adr-003-cesad-stage-assignment.md).
- **Escopo entregue:** `CesadStageAssignment` como vinculo persistido comissao-processo-etapa; assignment criada/reutilizada durante `SEND_TO_CESAD`; autorizacao contextual CESAD passou a usar assignment ativa da etapa.

### BE-CESAD-AUTH-01 — Aplicar autorizacao contextual CESAD aos endpoints sensiveis

- **Status operacional:** concluida / auditada / aprovada com ressalvas.
- **Commit funcional aprovado:** `211a4d4 feat(backend): apply contextual CESAD authorization`.
- **Escopo entregue:** `CesadContextAuthorizationService` protege fluxos sensiveis de workflow, historico, transicoes CESAD, leitura consolidada e parecer CESAD de etapa.
- **Ressalvas:** a politica foi fortalecida por `BE-CESAD-AUTH-02`, `BE-CESAD-ASSIGN-REPLACE-01` e `BE-DOC-CESAD-SIGN-01`. `BE-SEC-03` permanece ativo como guarda-chuva.

### BE-ARCH-01E3 — Implementar refresh, rotacao e logout server-side

- **Status operacional:** concluida / auditada / aprovada.
- **Commit funcional aprovado:** `feat(auth): add refresh token sessions`.
- **Escopo entregue:** login cria `UserSession`; refresh token opaco em cookie `HttpOnly`; `POST /auth/refresh`; rotacao transacional; reuso revoga sessoes ativas da familia; `POST /auth/logout` idempotente.
- **Continuidade:** `BE-ARCH-01E4A/B/C` concluidos no frontend; `BE-ARCH-01E5` e `BE-ARCH-01F` concluidos no backend.

### BE-ARCH-01E2 — Modelar sessao e refresh token

- **Status operacional:** concluida / auditada / aprovada.
- **Commit funcional aprovado:** `feat(auth): model user sessions`.
- **Escopo entregue:** `UserSession`, migration `20260430120000_add_user_session`, `refreshTokenHash` unico, `familyId`, campos de expiracao, rotacao e revogacao.

### BE-ARCH-01D — Alinhar frontend de sessao

- **Status operacional:** concluida / aprovada.
- **Commit funcional aprovado:** `fix(frontend): align session invalidation`.
- **Arquivo de task arquivado em:** [`docs/archive/backend/tasks/BE-ARCH-01D-frontend-session-alignment.md`](../../../archive/backend/tasks/BE-ARCH-01D-frontend-session-alignment.md).
- **Escopo entregue:** alinhamento minimo de sessao frontend, bootstrap, `/auth/me`, `401` idempotente, preservacao de `403` e falhas nao-401 sem limpeza indevida de sessao.

---

## Pendentes relevantes

- [`BE-AUDIT-AUTH-01` — auditoria persistida de eventos de autenticacao](./tasks/BE-AUDIT-AUTH-01-persisted-auth-audit.md): melhoria futura; nao reabre `BE-ARCH-01F`.
- [`BE-CONTRACT-CESAD-ASSIGN-01` — expor status de assignment CESAD em contracts](./tasks/BE-CONTRACT-CESAD-ASSIGN-01-cesad-assignment-contract-status.md): condicional/futura.
- [`BE-AUDIT-AUTH-01` — auditoria persistida de eventos de autenticacao](./tasks/BE-AUDIT-AUTH-01-persisted-auth-audit.md): melhoria futura; nao reabre `BE-ARCH-01F`.
- [`BE-CONTRACT-CESAD-ASSIGN-01` — expor status de assignment CESAD em contracts](./tasks/BE-CONTRACT-CESAD-ASSIGN-01-cesad-assignment-contract-status.md): condicional/futura; so deve ser executada se API publica ou frontend passarem a consumir diretamente o status de `CesadStageAssignment`.

---

## Resolvidos por varredura global

- `BE-ARCH-01E4B` — retry automatico de `401`, refresh silencioso com single-flight e protecao contra loop identificados no `http-client` do frontend.
- `BE-ARCH-01E4C` — varredura confirmou consumo autenticado via access token em memoria; `session.accessToken` removido.
- `BE-ARCH-01E5` — hardening operacional de cookies/CORS/env concluido no recorte backend.
- `BE-ARCH-01` — frente maior concluida no recorte planejado de sessao/auth.
- `BE-ARCH-01F` — eventos estruturados de auth e testes unitarios concluidos no recorte backend.
- `BE-ARCH-02` — `@sadep/contracts` expoe `dist/` como entrypoint; consumidores constroem contracts antes dos gates.
- `BE-TECH-02` — `apps/worker` e `apps/cron` permanecem como estrutura reservada sem execucao no MVP.

---

## Backlog processual

O tracker legado foi movido para [`docs/archive/roadmaps-legados/backend-implementation-tracker.md`](../../../archive/roadmaps-legados/backend-implementation-tracker.md). As pendencias estruturais acima possuem arquivos proprios neste diretorio em [`tasks/`](./tasks/).

## Ressalvas de recorte

- `BE-ARCH-01` esta concluida no recorte planejado de sessao/auth; isso nao encerra hardening HTTP amplo, CSRF, rate limit ou auditoria persistida formal.
- `BE-ARCH-01E5` esta concluida no recorte de validacao operacional de env/CORS/cookies; hardening adicional fica em `SEC-HARD-01`.
- `BE-ARCH-01F` esta concluida no recorte de logs estruturados e testes de autenticacao; auditoria persistida formal fica em `BE-AUDIT-AUTH-01`.
- Homologacao, notificacao, ciencia e recursos nao devem ser tratados como implementados ate haver parecer conclusivo final, workflow e documentos correspondentes.
