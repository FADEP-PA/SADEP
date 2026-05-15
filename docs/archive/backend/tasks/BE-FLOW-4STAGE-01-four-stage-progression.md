# BE-FLOW-4STAGE-01 — Estruturar progressao formal das quatro etapas avaliativas

## Status

Concluida no recorte de progressao formal / auditada / aprovada com ressalvas.

## Area

Backend, workflow, dominio processual e auditoria.

## Contexto

O MVP cobre o Caso 2, com um processo administrativo composto por quatro etapas internas obrigatorias. Esta task existia para impedir que o fluxo reduzido de uma etapa fosse tratado como se fosse o fluxo completo do Caso 2.

A decisao arquitetural esta registrada na [`ADR-004 — Progressao formal das quatro etapas avaliativas`](../../../architecture/adr/adr-004-four-stage-progression.md).

## Decisao de status

`BE-FLOW-4STAGE-01` fica concluida no recorte de progressao formal porque suas duas fatias planejadas foram entregues:

- `BE-FLOW-4STAGE-01A — Materializar quatro etapas e corrigir resolucao de etapa atual`;
- `BE-FLOW-4STAGE-01B — Implementar COMPLETE_CURRENT_STAGE`.

Este fechamento nao inclui parecer conclusivo final, homologacao, notificacao, ciencia, recursos, frontend, portaria ou versionamento documental.

## BE-FLOW-4STAGE-01A — Materializar quatro etapas e corrigir resolucao de etapa atual

- **Status:** concluida / auditada / aprovada com ressalvas.
- **Commit funcional aprovado:** `84a3419 feat(backend): materialize four process stages`.
- **Task file:** [`BE-FLOW-4STAGE-01A-materialize-four-stages.md`](./BE-FLOW-4STAGE-01A-materialize-four-stages.md).
- Entregou constantes/helpers para as quatro etapas do Caso 2.
- Definiu total de etapas igual a `4`.
- Materializou `stageCode` `ETAPA_1`, `ETAPA_2`, `ETAPA_3` e `ETAPA_4`.
- Implementou `ensureFourProcessStages`.
- Criou etapa 1 ativa por padrao e etapas 2 a 4 futuras.
- Preservou lifecycle por `startedAt`/`endedAt`.
- Corrigiu `resolveCurrentStageOrThrow` para usar somente etapa ativa e ignorar etapas futuras.
- Separou leitura historica/consolidacao em metodo proprio.
- Bloqueou documentos, parecer CESAD, assinatura/documento CESAD, assignment/supersessao e transicoes operacionais em etapa futura.
- Criou a migration/backfill `20260513143000_materialize_four_process_stages`.
- Ampliou test helpers e testes backend.

## BE-FLOW-4STAGE-01B — Implementar COMPLETE_CURRENT_STAGE

- **Status:** concluida / auditada / aprovada.
- **Commit funcional aprovado:** `9f6f122 feat(backend): complete current process stage`.
- **Task file:** [`BE-FLOW-4STAGE-01B-complete-current-stage.md`](./BE-FLOW-4STAGE-01B-complete-current-stage.md).
- Adicionou `ProcessAction.COMPLETE_CURRENT_STAGE`.
- Adicionou `AuditEventType.STAGE_COMPLETED`.
- Criou a migration `20260514120000_add_stage_completed_audit_event`.
- Catalogou transicao a partir de `PARECER_EMITIDO`.
- Validou completude documental forte da etapa ativa.
- Nas etapas 1 a 3, encerra a etapa atual, ativa a proxima etapa e retorna o processo para `EM_AVALIACAO`.
- Na etapa 4, encerra a etapa sem criar etapa 5 e preserva `PARECER_EMITIDO`.
- Registra auditoria `STAGE_COMPLETED` robusta.
- Mantem `CESAD_MEMBER` sujeito a autorizacao contextual.
- Permite `ADMIN` com execucao administrativa controlada, apos correcao de gate auditada em follow-up.
- Bloqueia `COMMISSION_ASSISTANT`, chefia imediata, servidor avaliado e autoridade homologadora.
- Ampliou testes backend de sucesso, bloqueios, lifecycle, guardas documentais e regressao.

## Escopo consolidado entregue

- Quatro etapas obrigatorias materializadas para o Caso 2.
- Diferenciacao entre etapa futura, ativa e concluida por `startedAt`/`endedAt`.
- Resolucao operacional da etapa atual restrita a etapa ativa.
- Protecao de etapas futuras contra artefatos stage-bound.
- Conclusao formal da etapa ativa por action de workflow.
- Encerramento das etapas 1 a 3 com abertura sequencial da proxima etapa.
- Retorno para `EM_AVALIACAO` apos as etapas 1 a 3.
- Encerramento da etapa 4 sem criar etapa 5.
- Preservacao de `PARECER_EMITIDO` apos a etapa 4.
- Auditoria da conclusao de etapa.
- Guardas documentais fortes para fechamento de etapa.
- Autorizacao contextual CESAD e execucao administrativa controlada.

## Fora do escopo preservado

- Parecer conclusivo final.
- Homologacao.
- Notificacao.
- Ciencia.
- Recursos.
- Avaliacao substitutiva.
- Portaria.
- Frontend.
- Versionamento documental amplo.
- Nova modelagem de status macro para "quatro etapas concluidas".

## Relacao com BE-CESAD-FINAL-01

`BE-CESAD-FINAL-01` permanece pendente e deve usar a base entregue por esta task:

- quatro etapas existentes;
- quatro etapas formalmente concluidas;
- documentos e pareceres de etapa preservados como historico;
- ausencia de etapa ativa apos a conclusao da quarta etapa.

Como apos a etapa 4 nao ha etapa ativa, o parecer conclusivo final deve usar leitura/consolidacao historica adequada, e nao depender do resolver operacional de etapa ativa.

## Relacao com BE-HOMOLOG-01

`BE-HOMOLOG-01` permanece pendente e dependente de parecer conclusivo final. A conclusao da quarta etapa nao libera homologacao, notificacao, ciencia ou portaria.

## Ressalvas

- Apos a etapa 4, nao ha etapa ativa.
- `BE-CESAD-FINAL-01` deve usar resolver historico/consolidado adequado.
- `COMPLETE_CURRENT_STAGE` nao cria parecer conclusivo final.
- `COMPLETE_CURRENT_STAGE` nao homologa.
- `COMPLETE_CURRENT_STAGE` nao notifica nem registra ciencia.
- Recursos permanecem fora do recorte.
- Frontend nao foi alterado.
- `availableActions` pode listar actions por status/role, mas as guardas reais permanecem no service.

## Validacoes

As fatias 01A e 01B foram validadas com typecheck backend, typecheck de specs, suite backend, validacoes Prisma quando aplicaveis e `git diff --check`, conforme registros dos task files especificos e auditorias tecnicas.

## Proxima acao

Priorizar `BE-CESAD-FINAL-01 — Modelar parecer conclusivo final da CESAD`, preservando `BE-HOMOLOG-01` para depois do parecer final e mantendo recursos/frontend em frentes proprias.
