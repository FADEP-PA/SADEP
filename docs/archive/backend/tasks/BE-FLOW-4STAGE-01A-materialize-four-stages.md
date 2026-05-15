# BE-FLOW-4STAGE-01A — Materializar quatro etapas e corrigir resolucao de etapa atual

## Status

Concluida / auditada / aprovada com ressalvas.

## Area

Backend, Prisma, workflow, dominio processual, documentos stage-bound, CESAD e testes.

## Contexto

Esta task e a primeira fatia de `BE-FLOW-4STAGE-01 — Estruturar progressao formal das quatro etapas avaliativas`.

O objetivo foi implantar a base estrutural definida pela [`ADR-004 — Progressao formal das quatro etapas avaliativas`](../../../architecture/adr/adr-004-four-stage-progression.md), sem implementar ainda a conclusao formal de etapa.

## Relacao com ADR-004

A ADR-004 decidiu que, no Caso 2, o processo administrativo deve possuir quatro `ProcessStage` materializadas, com lifecycle derivado de `startedAt` e `endedAt`, sem novo status de etapa.

Esta fatia implementou a parte estrutural da decisao:

- quatro etapas garantidas por processo;
- etapa 1 ativa por padrao;
- etapas 2 a 4 futuras;
- resolucao de etapa atual ignorando etapas futuras;
- bloqueio de artefatos em etapas futuras.

## Relacao com BE-FLOW-4STAGE-01

`BE-FLOW-4STAGE-01A` nao encerra a task guarda-chuva. Ela entrega a base de materializacao e protecao de etapas futuras.

A progressao formal entre etapas permanece pendente em `BE-FLOW-4STAGE-01B — Implementar COMPLETE_CURRENT_STAGE`.

## Resultado entregue

- Constantes/helpers para as quatro etapas do Caso 2.
- Total de etapas igual a `4`.
- `stageCode` previsiveis:
  - `ETAPA_1`;
  - `ETAPA_2`;
  - `ETAPA_3`;
  - `ETAPA_4`.
- Rotina `ensureFourProcessStages`.
- Materializacao idempotente das quatro etapas.
- Etapa 1 ativa por padrao.
- Etapas 2 a 4 futuras.
- Lifecycle:
  - futura: `startedAt = null`, `endedAt = null`;
  - ativa: `startedAt != null`, `endedAt = null`;
  - concluida: `startedAt != null`, `endedAt != null`.
- Correcao de `resolveCurrentStageOrThrow`.
- Separacao de leitura historica/consolidacao por metodo proprio.
- Migration/backfill `20260513143000_materialize_four_process_stages`.
- Preservacao de documentos, avaliacoes, autoavaliacoes, pareceres, assignments e assinaturas ja stage-bound.
- Bloqueio de documentos, parecer CESAD, assinatura/documento CESAD, assignment/supersessao e transicoes operacionais em etapa futura.
- Atualizacao de test helpers para quatro etapas.
- Testes backend ampliados.

## Escopo entregue

- Materializar/garantir quatro `ProcessStage` por processo.
- Corrigir resolucao da etapa atual para etapa ativa.
- Impedir que etapas futuras sejam tratadas como atuais.
- Proteger artefatos stage-bound contra uso de etapa futura.
- Criar backfill seguro para processos existentes.
- Preservar ciclo documental ja implementado na etapa ativa.

## Fora do escopo preservado

- `COMPLETE_CURRENT_STAGE`.
- `ADVANCE_TO_NEXT_STAGE`.
- Parecer conclusivo final.
- Homologacao.
- Notificacao.
- Ciencia.
- Recursos.
- Avaliacao substitutiva.
- Frontend.
- Mudanca de responsavel por etapa.
- Encerramento da quarta etapa.

## Validacoes executadas

- `npm run prisma:generate --workspace @sadep/backend`;
- `npm run typecheck --workspace @sadep/backend`;
- `npm run typecheck:spec --workspace @sadep/backend`;
- `npm run test --workspace @sadep/backend`;
- `npx prisma validate --schema apps/backend/prisma/schema.prisma` com `DATABASE_URL` temporaria quando necessario;
- `git diff --check`.

## Ressalvas remanescentes

- Helper explicito de etapa concluida pode ser adicionado futuramente para simetria do lifecycle.
- Antes ou junto de `BE-FLOW-4STAGE-01B`, avaliar separacao mais clara entre contexto de leitura e escrita em status de assinatura CESAD.
- `createProcessStage` em testes pode ativar outra etapa se o teste nao encerrar a anterior explicitamente.
- A migration usa IDs por `randomblob(16)` em SQLite no backfill, diferente de `cuid()`, com risco pratico desprezivel.
- Processos legados incoerentes com multiplas etapas ativas passam a falhar explicitamente em vez de escolher uma etapa silenciosamente.

## Proxima acao

Implementar `BE-FLOW-4STAGE-01B — Implementar COMPLETE_CURRENT_STAGE`, validando completude documental da etapa ativa, encerrando etapas 1 a 3 com abertura sequencial da proxima etapa e encerrando a etapa 4 sem homologar nem criar parecer conclusivo final.
