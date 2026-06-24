# Backend — Itens Resolvidos

Este arquivo resume itens backend ja concluidos ou resolvidos. O antigo tracker backend foi arquivado em [`docs/archive/roadmaps-legados/backend-implementation-tracker.md`](../../../archive/roadmaps-legados/backend-implementation-tracker.md). Quando aplicavel, arquivos de task detalhados resolvidos foram movidos para [`docs/archive/backend/tasks/`](../../../archive/backend/tasks/); task files ainda usados como referencia de guarda-chuva ou dependencia podem permanecer em [`tasks/`](./tasks/).

Esta separacao nao altera status de tasks, nao move documentos legados e nao arquiva historico. Ela apenas prepara a futura reducao dos roadmaps legados.

## BE-FLOW-4STAGE-01A — Materializar quatro etapas e corrigir resolucao de etapa atual

- **Status documental:** concluida / auditada / aprovada com ressalvas.
- **Commit funcional aprovado:** `84a3419 feat(backend): materialize four process stages`.
- **ADR relacionada:** [`ADR-004 — Progressao formal das quatro etapas avaliativas`](../../architecture/adr/adr-004-four-stage-progression.md).
- Implementou constantes/helpers para as quatro etapas do Caso 2.
- Definiu total de etapas igual a `4`.
- Materializou `stageCode` previsiveis: `ETAPA_1`, `ETAPA_2`, `ETAPA_3` e `ETAPA_4`.
- Implementou a rotina `ensureFourProcessStages`.
- Garantiu materializacao idempotente das quatro etapas por processo.
- Criou etapa 1 ativa por padrao.
- Criou etapas 2 a 4 como futuras.
- Passou a usar `startedAt` e `endedAt` como lifecycle de etapa:
  - futura: `startedAt = null`, `endedAt = null`;
  - ativa: `startedAt != null`, `endedAt = null`;
  - concluida: `startedAt != null`, `endedAt != null`.
- Corrigiu `resolveCurrentStageOrThrow` para escolher somente etapa ativa e ignorar etapas futuras.
- Separou leitura historica/consolidacao por metodo proprio.
- Criou a migration/backfill `20260513143000_materialize_four_process_stages`.
- Preservou documentos, avaliacoes, autoavaliacoes, pareceres, assignments e assinaturas ja stage-bound.
- Bloqueou documentos, parecer CESAD, assinatura/documento CESAD, assignment/supersessao e transicoes operacionais em etapa futura.
- Atualizou test helpers para quatro etapas.
- Ampliou testes backend para materializacao, legados, resolucao de etapa atual, protecao de etapa futura e regressao do ciclo ativo.
- Validacoes aprovadas: `npm run prisma:generate --workspace @sadep/backend`, `npm run typecheck --workspace @sadep/backend`, `npm run typecheck:spec --workspace @sadep/backend`, `npm run test --workspace @sadep/backend`, `npx prisma validate --schema apps/backend/prisma/schema.prisma` com `DATABASE_URL` temporaria e `git diff --check`.
- Ressalvas remanescentes: `createProcessStage` em testes pode ativar outra etapa se o teste nao encerrar a anterior explicitamente; a migration usa IDs por `randomblob(16)` em SQLite no backfill, diferente de `cuid()`, com risco pratico desprezivel; processos legados incoerentes com multiplas etapas ativas passam a falhar explicitamente em vez de escolher uma etapa silenciosamente.
- Nao implementou `COMPLETE_CURRENT_STAGE`, parecer conclusivo final, homologacao, notificacao, ciencia, recursos, avaliacao substitutiva ou frontend; a conclusao formal de etapa foi entregue posteriormente por `BE-FLOW-4STAGE-01B`.

## BE-FLOW-4STAGE-01B — Implementar COMPLETE_CURRENT_STAGE

- **Status documental:** concluida / auditada / aprovada.
- **Commit funcional aprovado:** `9f6f122 feat(backend): complete current process stage`.
- **ADR relacionada:** [`ADR-004 — Progressao formal das quatro etapas avaliativas`](../../architecture/adr/adr-004-four-stage-progression.md).
- Adicionou `ProcessAction.COMPLETE_CURRENT_STAGE`.
- Adicionou `AuditEventType.STAGE_COMPLETED`.
- Criou a migration `20260514120000_add_stage_completed_audit_event` para registrar a inclusao do novo evento no datamodel Prisma.
- Catalogou a transicao de workflow com origem `PARECER_EMITIDO`, `requiresComment = false` e roles `ADMIN` e `CESAD_MEMBER`.
- Implementou destino dinamico: etapas 1 a 3 encerram a etapa atual, ativam a proxima etapa e retornam o processo para `EM_AVALIACAO`; etapa 4 encerra a etapa e preserva `PARECER_EMITIDO`.
- Validou completude documental forte da etapa ativa antes do fechamento: avaliacao da chefia `SIGNED`, autoavaliacao `SIGNED`, parecer CESAD funcional `COMPLETED`, expected signers existentes, documento `CESAD_OPINION` stage-bound `SIGNED` e assinaturas CESAD colegiadas completas.
- Reconfirmou em transacao a existencia de exatamente uma etapa ativa e que ela corresponde ao contexto resolvido.
- Exigiu que a proxima etapa esteja futura antes de ativa-la, impedindo pulo de sequencia ou ativacao duplicada.
- Preservou/herdou `responsibleSupervisorUserId` ao abrir a proxima etapa, quando necessario.
- Na quarta etapa, nao criou etapa 5, nao criou parecer conclusivo final, nao homologou, nao notificou e nao registrou ciencia.
- Registrou auditoria `STAGE_COMPLETED` com action, ator, papel, processo, etapa concluida, proxima etapa quando houver, `previousProcessStatus`, `nextProcessStatus`, `isFinalStage`, comentario opcional e resumo da completude documental verificada.
- Manteve `CESAD_MEMBER` sujeito a assignment contextual e permitiu `ADMIN` com execucao administrativa controlada, sem assignment CESAD.
- Bloqueou `COMMISSION_ASSISTANT`, chefia imediata, servidor avaliado e autoridade homologadora.
- Ampliou testes backend para sucesso nas etapas 1 -> 2, 3 -> 4, etapa 4 sem etapa 5, bloqueios por status/role/assignment, lacunas documentais, expected signers, documento CESAD, assinatura CESAD pendente, ausencia/multiplicidade de etapa ativa e regressao de `ISSUE_CESAD_OPINION`.
- A correcao posterior do gate de `ADMIN` foi auditada em follow-up e aprovada.
- Validacoes aprovadas: `npm run typecheck --workspace @sadep/backend`, `npm run typecheck:spec --workspace @sadep/backend`, `npm run test --workspace @sadep/backend` e `git diff --check`; validacoes Prisma/schema da implementacao original tambem foram aprovadas no ciclo de auditoria.
- Ressalvas remanescentes: apos a etapa 4, nao ha etapa ativa; `BE-CESAD-FINAL-01` deve usar resolver historico/consolidado adequado. `availableActions` pode listar actions por status/role, mas as guardas reais permanecem no service.
- Fora do escopo preservado: parecer conclusivo final, homologacao, notificacao, ciencia, recursos, avaliacao substitutiva, portaria, frontend e versionamento documental.

## BE-FLOW-4STAGE-01 — Estruturar progressao formal das quatro etapas avaliativas

- **Status documental:** concluida no recorte de progressao formal / auditada / aprovada com ressalvas.
- **Fatias concluidas:** `BE-FLOW-4STAGE-01A` e `BE-FLOW-4STAGE-01B`.
- A 01A materializou as quatro etapas obrigatorias do Caso 2 e corrigiu a resolucao da etapa atual para usar somente a etapa ativa.
- A 01B implementou `COMPLETE_CURRENT_STAGE`, encerrando formalmente a etapa ativa, abrindo sequencialmente a proxima etapa nas etapas 1 a 3 e encerrando a quarta etapa sem antecipar atos finais.
- O recorte de progressao formal agora cobre quatro etapas materializadas, lifecycle por `startedAt`/`endedAt`, protecao de etapas futuras, completude documental forte para fechamento, auditoria e autorizacao contextual/administrativa controlada.
- Ressalvas: parecer conclusivo final permanece em `BE-CESAD-FINAL-01`; homologacao/notificacao/ciencia permanecem em `BE-HOMOLOG-01`; recursos e frontend permanecem fora deste recorte; apos a etapa 4, `BE-CESAD-FINAL-01` deve usar leitura/consolidacao historica, nao resolver etapa ativa.

## BE-CESAD-FINAL-01C — Envio formal a homologacao

- **Status documental:** concluida / aprovada.
- **Commit funcional:** `a0e5b2d feat(backend): send final CESAD opinion to homologation`.
- **Task file:** [`BE-CESAD-FINAL-01C-send-to-homologation.md`](./tasks/BE-CESAD-FINAL-01C-send-to-homologation.md).
- **ADR relacionada:** [`ADR-005 — Modelagem do parecer conclusivo final da CESAD`](../../architecture/adr/adr-005-final-cesad-opinion-modeling.md).
- Adicionou `ProcessAction.SEND_TO_HOMOLOGATION`.
- Adicionou `AuditEventType.SENT_TO_HOMOLOGATION`.
- Criou a migration `20260522120000_add_final_opinion_homologation_send` com campos `sentToHomologationAt` e `sentToHomologationByUserId` em `CesadFinalOpinion`.
- Implementou o endpoint `POST /processes/:id/cesad-final-opinion/send-to-homologation`.
- Implementou guardas obrigatorias: `CesadFinalOpinion` em `COMPLETED`, `sentToHomologationAt = null` (nao enviada anteriormente), documento final `ProcessDocument` com `documentType = CESAD_OPINION`, `processStageId = null`, `opinionKind = FINAL_CONCLUSIVE` e `documentStatus = SIGNED`, todas as assinaturas de `CesadFinalOpinionExpectedSigner` em `COMPLETED`.
- Persistiu `sentToHomologationAt` e `sentToHomologationByUserId` transacionalmente.
- Registrou auditoria `SENT_TO_HOMOLOGATION` com ator, papel, processo, action e contexto do envio.
- Payload aceita `comment` opcional.
- Nao homologou, nao notificou, nao registrou ciencia e nao alterou conteudo do parecer final.
- Encerrou `BE-CESAD-FINAL-01` como guarda-chuva; homologacao, notificacao e ciencia seguem em `BE-HOMOLOG-01`.

## BE-CESAD-FINAL-01A — Modelo funcional, elegibilidade e consolidacao historica

- **Status documental:** concluida / auditada / corrigida / aprovada.
- **Commit funcional aprovado:** `a3fa203 feat(backend): add final CESAD opinion model`.
- **Task file:** [`BE-CESAD-FINAL-01A-functional-model-eligibility.md`](./tasks/BE-CESAD-FINAL-01A-functional-model-eligibility.md).
- **ADR relacionada:** [`ADR-005 — Modelagem do parecer conclusivo final da CESAD`](../../architecture/adr/adr-005-final-cesad-opinion-modeling.md).
- Criou a entidade funcional `CesadFinalOpinion`, propria do parecer conclusivo final e vinculada ao processo.
- Preservou `CesadStageOpinion` como parecer CESAD de etapa, sem refatoracao estrutural.
- Criou `CesadFinalOpinionStatus` com `DRAFT` e `COMPLETED`.
- Modelou relacao process-wide com `EvaluationProcess`, relacao com autor `User`, unicidade funcional por processo e `consolidatedSnapshot`.
- Adicionou actions `START_CESAD_FINAL_OPINION`, `SAVE_CESAD_FINAL_OPINION_DRAFT` e `COMPLETE_CESAD_FINAL_OPINION`.
- Adicionou audit events `CESAD_FINAL_OPINION_STARTED`, `CESAD_FINAL_OPINION_DRAFT_SAVED` e `CESAD_FINAL_OPINION_COMPLETED`.
- Criou contracts/refs minimos do parecer final.
- Implementou elegibilidade objetiva apos quatro etapas formalmente concluidas, com documentos, pareceres de etapa, expected signers e assinaturas colegiadas de etapa completos.
- Implementou consolidacao historica process-wide das quatro etapas, ordenada por `sequence` e sem depender de etapa ativa.
- Implementou fluxo funcional `start`, `saveDraft` e `complete`.
- A correcao pos-auditoria fez `complete` exigir parecer existente em `DRAFT`, sem criacao direta de `COMPLETED` e sem evento sintetico de start.
- Manteve o macrostatus do processo em `PARECER_EMITIDO`.
- Implementou autorizacao process-wide para CESAD relacionado e `ADMIN`; `COMMISSION_ASSISTANT` le mas nao escreve; chefia, servidor e autoridade homologadora permanecem bloqueados.
- Ampliou testes backend para elegibilidade, consolidacao, fluxo funcional, autorizacao, auditoria, ausencia de `ProcessDocument` e regressao de `complete`.
- Validacoes aprovadas: build de `@sadep/contracts`, `prisma:generate`, typecheck backend, typecheck de specs, suite backend, Prisma validate com `DATABASE_URL` temporaria quando necessario e `git diff --check`.
- Continuidade posterior: `BE-CESAD-FINAL-01B` concluiu a camada documental e de assinatura colegiada final.
- Fora do recorte preservado: `SEND_TO_HOMOLOGATION`, homologacao, notificacao, ciencia, recursos, frontend, GOVBR e versionamento/invalidacao documental.
- `BE-CESAD-FINAL-01` permanece ativa como guarda-chuva/fase principal ate `BE-CESAD-FINAL-01C`.

## BE-CESAD-FINAL-01B — Documento e assinaturas colegiadas do parecer final

- **Status documental:** concluida / auditada / corrigida / aprovada.
- **Commit funcional/correcao pos-auditoria auditada:** `55279d3 fix(backend): handle final CESAD opinion P2002 collision`.
- **Task file:** [`BE-CESAD-FINAL-01B-document-signatures.md`](./tasks/BE-CESAD-FINAL-01B-document-signatures.md).
- **ADR relacionada:** [`ADR-005 — Modelagem do parecer conclusivo final da CESAD`](../../architecture/adr/adr-005-final-cesad-opinion-modeling.md).
- Adicionou `CesadOpinionKind` com `STAGE` e `FINAL_CONCLUSIVE`.
- Adicionou `ProcessDocument.opinionKind` para diferenciar parecer CESAD de etapa e parecer CESAD conclusivo final.
- Fez backfill dos documentos `CESAD_OPINION` stage-bound existentes para `opinionKind = STAGE`, mantendo documentos nao-CESAD com `opinionKind = null`.
- Formalizou o documento final como `ProcessDocument` com `documentType = CESAD_OPINION`, `processStageId = null`, `opinionKind = FINAL_CONCLUSIVE`, `documentStatus = READY_FOR_SIGNATURE` e `artifactPath = null`.
- Criou indice unico parcial SQLite para garantir um unico documento final `CESAD_OPINION / FINAL_CONCLUSIVE` por processo.
- Tratou colisao `P2002` no service, preservando a idempotencia da preparacao documental.
- Criou `CesadFinalOpinionExpectedSigner` como entidade propria de expected signers finais, sem reutilizar `CesadStageOpinionExpectedSigner`.
- Adicionou vinculo opcional de `SignatureRecord` com expected signer final.
- Adicionou actions `PREPARE_CESAD_FINAL_OPINION_SIGNATURES` e `SIGN_CESAD_FINAL_OPINION`.
- Adicionou o evento `CESAD_FINAL_OPINION_SIGNED`.
- Implementou `POST /processes/:id/cesad-final-opinion/signatures/prepare`.
- Implementou `GET /processes/:id/cesad-final-opinion/signatures`.
- Implementou `POST /processes/:id/cesad-final-opinion/sign`.
- Derivou signatarios finais a partir da comissao de referencia da etapa 4, excluindo `COMMISSION_ASSISTANT` e `ADMIN`.
- Manteve `ADMIN` autorizado a preparar/ler administrativamente, mas impedido de assinar por membro.
- Manteve `COMMISSION_ASSISTANT` autorizado a leitura vinculada, mas impedido de preparar ou assinar.
- Permitiu assinatura apenas por `CESAD_MEMBER` expected signer.
- Manteve o documento final em `READY_FOR_SIGNATURE` enquanto houver pendencias e passou para `SIGNED` somente apos todas as assinaturas obrigatorias.
- Preservou o processo em `PARECER_EMITIDO`, sem envio a homologacao.
- Ampliou testes backend para `opinionKind`, documento final, expected signers finais, idempotencia, unicidade, autorizacao, bloqueios de assinatura, completude colegiada, auditoria e regressoes de documento de etapa.
- Validacoes tecnicas aprovadas no ciclo de implementacao/auditoria: build de `@sadep/contracts`, `prisma:generate`, typecheck backend, typecheck de specs, suite backend, Prisma validate e `git diff --check`.
- Correcao pos-auditoria de unicidade: indice unico parcial manual na migration porque o Prisma schema nao expressa indice parcial SQLite.
- Correcao pos-auditoria de colisao: o tratamento `P2002` foi movido para o caminho de criacao do documento final; o catch de `SELF_EVALUATION` voltou ao comportamento simples anterior; documento final `INVALIDATED_OR_SUPERSEDED` e bloqueado; `DRAFT` ou `CONSOLIDATED` pode ser normalizado para `READY_FOR_SIGNATURE`; `READY_FOR_SIGNATURE` ou `SIGNED` retorna idempotentemente conforme regra do service.
- Fora do escopo preservado: `SEND_TO_HOMOLOGATION`, homologacao, notificacao, ciencia, recursos, frontend, GOVBR real, portaria/publicacao, geracao PDF real, versionamento documental amplo e invalidacao/supersessao documental ampla.
- `BE-CESAD-FINAL-01` permanece ativa como guarda-chuva/fase principal ate `BE-CESAD-FINAL-01C`.

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
- `BE-FLOW-4STAGE-01` foi concluida posteriormente no recorte de progressao formal; `BE-CESAD-FINAL-01` e `BE-HOMOLOG-01` permanecem pendentes.

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
- `BE-SEC-03` permanece aberta como guarda-chuva para parecer conclusivo final, homologacao/notificacao/ciencia, documentos posteriores e demais integracoes futuras.

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
- `BE-SEC-03` permanece aberta como guarda-chuva estrutural para parecer final, homologacao/notificacao/ciencia, documentos posteriores e demais integracoes futuras.

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
