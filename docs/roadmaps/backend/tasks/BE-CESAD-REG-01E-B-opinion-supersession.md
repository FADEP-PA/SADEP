# BE-CESAD-REG-01E-B — Supersessão de parecer no rollover

**Dev:** Lucas
**Status:** Fatia entregue — supersessão de parecer preparatório (rascunho/sem documento); casos com documento/assinaturas deferidos
**Depende de:** BE-CESAD-REG-01E, ADR-006
**ADR:** [ADR-007](../../../architecture/adr/adr-007-cesad-stage-opinion-supersession.md)

---

## Objetivo

Permitir que o rollover de competência CESAD (BE-CESAD-REG-01E) assuma etapas que já têm parecer **preparatório iniciado**, supersedendo-o de forma imutável, para a comissão vigente emitir parecer próprio.

---

## Decisão de modelagem

Espelhar o padrão de `CesadStageAssignment` em `CesadStageOpinion` (ADR-007):

- `processStageId` deixa de ser `@unique`.
- Novos campos `supersededAt`, `supersededByOpinionId` (autorrelação), `supersededReason`.
- Um parecer ativo por etapa (`supersededAt = null`), garantido em service.
- Relação reversa em `ProcessStage` vira lista (`cesadStageOpinions`); leitura filtra o ativo.

---

## Escopo

- [x] Migration: campos de supersessão + remoção do `@unique` + autorrelação
- [x] Ajustar read paths do parecer ativo (stage-opinions, stage-closure-guard, process-documents, stage-read, intern-workspace)
- [x] Ajustar consolidação e elegibilidade do parecer final para o parecer ativo
- [x] Rollover supersede parecer preparatório (rascunho / completo sem documento)
- [x] Auditoria do rollover inclui `supersededCesadStageOpinionId`
- [x] Manter bloqueio dos casos com expected signers/documento (deferido)
- [x] Manter ato consolidado (`SIGNED`) imutável

---

## Deferido (task própria de supersessão documental)

- Rollover com expected signers congelados, documento `READY_FOR_SIGNATURE` ou parcialmente assinado.
- Invalidação de documento (`INVALIDATED_OR_SUPERSEDED`) + cancelamento de assinaturas pendentes.
- Recriação automática de expected signers para a nova comissão.

---

## Testes

- [x] Rollover supersede parecer DRAFT + libera novo parecer da nova comissão
- [x] Bloqueio com expected signers congelados
- [x] Bloqueio com documento CESAD existente (consolidado imutável)
- [x] Read path escolhe o parecer ativo, ignora o supersedido
- [x] `test:unit` (jest) verde (regressão dos serviços auditados)
- [x] Validação contra PostgreSQL real (5/5 cenários)

---

## Critérios de aceite

- [x] Parecer preparatório supersedido, preservado como histórico (nada deletado)
- [x] Nova comissão vigente consegue emitir parecer próprio
- [x] Consolidação/elegibilidade do parecer final leem o parecer ativo
- [x] Atos consolidados não são alterados
- [x] Gates de CI verdes
