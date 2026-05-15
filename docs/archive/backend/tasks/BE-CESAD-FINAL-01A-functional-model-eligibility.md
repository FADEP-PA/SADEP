# BE-CESAD-FINAL-01A — Modelo funcional, elegibilidade e consolidacao historica

## Status

Concluida / auditada / corrigida / aprovada.

## Area

Backend, CESAD, Prisma, contracts, dominio processual, auditoria e testes.

## Contexto

Esta task foi a primeira fatia de `BE-CESAD-FINAL-01 — Modelar parecer conclusivo final da CESAD`.

No Caso 2, apos a conclusao formal das quatro etapas avaliativas, o processo permanece em `PARECER_EMITIDO`, sem etapa ativa. O parecer conclusivo final exige, portanto, uma entidade funcional process-wide e uma leitura historica das quatro etapas, sem depender de `resolveCurrentStageOrThrow`.

## Relacao com ADR-005

Esta entrega implementou a primeira parte da decisao registrada na [`ADR-005 — Modelagem do parecer conclusivo final da CESAD`](../../../architecture/adr/adr-005-final-cesad-opinion-modeling.md):

- `CesadFinalOpinion` foi modelado como entidade funcional propria, vinculada ao processo e nao a uma etapa;
- `CesadStageOpinion` permaneceu exclusivamente como parecer CESAD de etapa;
- o macrostatus do processo permaneceu enxuto em `PARECER_EMITIDO`;
- a leitura/consolidacao do parecer final passou a ser process-wide.

O ciclo documental, `opinionKind`, expected signers finais, assinatura colegiada do parecer final e envio formal a homologacao ficaram para fatias posteriores.

## Relacao com BE-CESAD-FINAL-01

`BE-CESAD-FINAL-01A` conclui somente a base funcional, de elegibilidade e de consolidacao historica. A frente principal `BE-CESAD-FINAL-01` permanece ativa como guarda-chuva ate a entrega das fatias:

- `BE-CESAD-FINAL-01B — Documento e assinaturas colegiadas do parecer final`;
- `BE-CESAD-FINAL-01C — Envio formal a homologacao`.

## Resultado entregue

- Criada a entidade funcional `CesadFinalOpinion`.
- Criado o enum/status funcional `CesadFinalOpinionStatus`, com `DRAFT` e `COMPLETED`.
- Modelada relacao process-wide com `EvaluationProcess`.
- Modelada relacao com autor `User`.
- Garantida unicidade funcional de um parecer final por processo no recorte atual.
- Adicionado campo `consolidatedSnapshot` para congelar a consolidacao historica no fechamento.
- Preservado `CesadStageOpinion` como parecer de etapa, sem refatoracao estrutural.
- Preservado macrostatus do processo em `PARECER_EMITIDO`.

## Schema e contracts

Entregas de schema/contracts:

- `CesadFinalOpinion`;
- `CesadFinalOpinionStatus`;
- `START_CESAD_FINAL_OPINION`;
- `SAVE_CESAD_FINAL_OPINION_DRAFT`;
- `COMPLETE_CESAD_FINAL_OPINION`;
- `CESAD_FINAL_OPINION_STARTED`;
- `CESAD_FINAL_OPINION_DRAFT_SAVED`;
- `CESAD_FINAL_OPINION_COMPLETED`;
- refs/types minimos do parecer final em `@sadep/contracts`.

## Elegibilidade

A elegibilidade do parecer conclusivo final passou a exigir objetivamente:

- processo existente;
- processo em `PARECER_EMITIDO`;
- exatamente quatro etapas;
- sequencias `1`, `2`, `3` e `4`;
- nenhuma etapa ativa;
- todas as etapas com `startedAt` e `endedAt`;
- avaliacao da chefia `SUBMITTED` por etapa;
- documento `SUPERVISOR_EVALUATION` `SIGNED` por etapa;
- autoavaliacao `SUBMITTED` por etapa;
- documento `SELF_EVALUATION` `SIGNED` por etapa;
- `CesadStageOpinion` `COMPLETED` por etapa;
- documento `CESAD_OPINION` stage-bound `SIGNED` por etapa;
- expected signers CESAD existentes;
- assinaturas CESAD colegiadas completas.

A validacao nao depende de `AuditEvent`.

## Consolidacao historica

Foi implementada consolidacao process-wide das quatro etapas:

- busca por `processId`;
- ordenacao por `sequence`;
- sem uso de `resolveCurrentStageOrThrow`;
- inclusao de dados relevantes de cada etapa;
- inclusao de resultado/conceito de etapa;
- inclusao de status documental;
- inclusao de contagem de expected signers e assinaturas completas;
- congelamento do snapshot no `complete`.

## Fluxo funcional

Foram implementados:

- iniciar parecer final (`start`);
- salvar rascunho (`saveDraft`);
- concluir parecer final (`complete`).

Regras principais:

- `start` valida elegibilidade, autoriza, cria `DRAFT` e audita `CESAD_FINAL_OPINION_STARTED`;
- `saveDraft` cria ou atualiza rascunho, mantem `DRAFT`, bloqueia `COMPLETED` e audita `CESAD_FINAL_OPINION_DRAFT_SAVED`;
- `complete` exige parecer final existente, exige status `DRAFT`, revalida elegibilidade, valida campos obrigatorios, gera snapshot fresco, atualiza para `COMPLETED`, preenche `completedAt` e audita `CESAD_FINAL_OPINION_COMPLETED`;
- `complete` nao cria parecer final diretamente como `COMPLETED`;
- `complete` nao emite evento sintetico `CESAD_FINAL_OPINION_STARTED`.

## Autorizacao

Foi adicionada autorizacao process-wide para parecer final:

- `CESAD_MEMBER` relacionado ao processo pode operar;
- `COMMISSION_ASSISTANT` relacionado pode ler, mas nao escrever;
- `ADMIN` pode ler/escrever como operador administrativo;
- chefia imediata, servidor avaliado e autoridade homologadora ficam bloqueados;
- a regra prefere a assignment ativa da etapa 4 ou a mais recente por sequencia/atribuicao.

## Auditoria

Foram registrados eventos auditaveis para:

- inicio do parecer final;
- salvamento de rascunho;
- conclusao do parecer final.

A auditoria inclui ator, papel, processo, parecer final, status, contagens de etapas, metadados de snapshot e resumo de resultado quando aplicavel.

## Testes e validacoes

Testes backend foram ampliados para cobrir:

- elegibilidade positiva;
- bloqueio por status;
- bloqueio por etapa ativa;
- bloqueio por etapa sem `endedAt`;
- bloqueio por artefatos faltantes;
- consolidacao ordenada das quatro etapas;
- `start`;
- `saveDraft`;
- `complete`;
- bloqueio de edicao apos `COMPLETED`;
- ausencia de `ProcessDocument` do parecer final nesta fatia;
- macrostatus inalterado em `PARECER_EMITIDO`;
- autorizacao de CESAD relacionado;
- bloqueio de CESAD nao relacionado;
- assistente lendo mas nao escrevendo;
- admin operando;
- chefia, servidor e autoridade homologadora bloqueados;
- auditoria de start/draft/complete;
- regressao de `complete` sem `DRAFT`.

Validacoes tecnicas aprovadas no ciclo de auditoria:

- `npm run build --workspace @sadep/contracts`;
- `npm run prisma:generate --workspace @sadep/backend`;
- `npm run typecheck --workspace @sadep/backend`;
- `npm run typecheck:spec --workspace @sadep/backend`;
- `npm run test --workspace @sadep/backend`;
- `npx prisma validate --schema apps/backend/prisma/schema.prisma` com `DATABASE_URL` temporaria quando necessario;
- `git diff --check`.

## Correcao pos-auditoria

A auditoria inicial retornou "Requer ajustes" porque `complete` permitia criar um `CesadFinalOpinion` diretamente como `COMPLETED`.

O follow-up corrigiu o fluxo:

- `complete` exige parecer final existente;
- apenas parecer em `DRAFT` pode ser concluido;
- parecer ja `COMPLETED` permanece bloqueado;
- nao ha criacao direta como `COMPLETED`;
- nao ha evento sintetico `CESAD_FINAL_OPINION_STARTED` dentro de `complete`;
- auditoria normal ficou coerente: `STARTED` no `start`, `DRAFT_SAVED` no `saveDraft` e `COMPLETED` no `complete`.

O follow-up foi auditado e aprovado.

## Commit funcional aprovado

`a3fa203 feat(backend): add final CESAD opinion model`.

## Ressalvas remanescentes

- `ProcessDocument` do parecer final ainda nao foi criado.
- `opinionKind` em `ProcessDocument` fica para `BE-CESAD-FINAL-01B`.
- `CesadFinalOpinionExpectedSigner` fica para `BE-CESAD-FINAL-01B`.
- Assinatura colegiada do parecer final fica para `BE-CESAD-FINAL-01B`.
- `PREPARE_CESAD_FINAL_OPINION_SIGNATURES` e `SIGN_CESAD_FINAL_OPINION` ficam para `BE-CESAD-FINAL-01B`.
- `SEND_TO_HOMOLOGATION` fica para `BE-CESAD-FINAL-01C`.
- Homologacao, notificacao e ciencia permanecem em `BE-HOMOLOG-01`.
- Recursos permanecem fora do recorte.
- Frontend permanece fora do recorte.
- GOVBR real permanece fora do recorte.
- Versionamento/invalidacao documental permanece fora do recorte.

## Fora do escopo preservado

- Documento processual do parecer final.
- `opinionKind`.
- Expected signers finais.
- Assinatura colegiada final.
- `SEND_TO_HOMOLOGATION`.
- Homologacao.
- Notificacao.
- Ciencia.
- Recursos.
- Frontend.
- GOVBR.
- Versionamento, invalidacao ou supersessao documental.

## Proxima acao

Priorizar `BE-CESAD-FINAL-01B — Documento e assinaturas colegiadas do parecer final`, preservando `BE-CESAD-FINAL-01C` e `BE-HOMOLOG-01` como frentes posteriores.
