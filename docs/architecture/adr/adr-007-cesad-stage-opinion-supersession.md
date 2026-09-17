# ADR-007 — Supersessão de parecer CESAD de etapa

## Status

Aceita / Decisão arquitetural registrada e implementada na fatia inicial (`BE-CESAD-REG-01E-B`).

Esta ADR registra a decisão de modelagem para permitir que um parecer CESAD de etapa (`CesadStageOpinion`) preparatório seja **supersedido** quando a comissão vigente muda por rollover, sem violar a imutabilidade jurídica do domínio.

## Contexto

A [ADR-006](./adr-006-cesad-commission-management-and-rollover.md) previu o rollover de competência: quando a comissão atribuída a uma etapa perde vigência e ainda não há ato consolidado, a comissão vigente assume. A `BE-CESAD-REG-01E` entregou o rollover apenas para o caso "sem parecer iniciado", bloqueando qualquer etapa que já tivesse `CesadStageOpinion`.

O motivo do bloqueio era estrutural: `CesadStageOpinion` tinha `processStageId` **único** (invariante 1:1 etapa↔parecer), assumido em múltiplos serviços. Permitir que a nova comissão emita um parecer próprio exigia deixar de tratar o parecer como registro único mutável e passar a preservar o anterior como histórico — exatamente o padrão já usado em `CesadStageAssignment`.

A [ADR-005](./adr-005-final-cesad-opinion-modeling.md) havia alertado que mexer nesse invariante era intrusivo (afeta código auditado de leitura consolidada, guarda de fechamento de etapa e elegibilidade/consolidação do parecer final). Esta ADR assume esse custo de forma controlada e verificada.

## Decisão

`CesadStageOpinion` passa a suportar supersessão, espelhando `CesadStageAssignment`:

- `processStageId` deixa de ser `@unique`; passa a ser indexado.
- Novos campos: `supersededAt`, `supersededByOpinionId` (autorrelação opcional) e `supersededReason`.
- Passa a existir **no máximo um parecer ativo por etapa** (`supersededAt = null`), garantido na camada de service/transação, não por constraint de banco (mesma estratégia da assignment).
- Todo acesso ao "parecer da etapa" passa a filtrar `supersededAt: null` (o parecer ativo). Consultas `findUnique({ where: { processStageId } })` viram `findFirst({ where: { processStageId, supersededAt: null } })`, e `update` por `processStageId` vira `update` por `id`.
- A relação reversa em `ProcessStage` passa de singular (`cesadStageOpinion`) para lista (`cesadStageOpinions`); os consumidores selecionam o ativo com `where: { supersededAt: null }`.

No rollover, um parecer preparatório **sem artefatos downstream** (sem expected signers congelados e sem documento CESAD) é marcado como supersedido no mesmo recorte transacional da troca de assignment, liberando a nova comissão vigente a emitir parecer próprio. O parecer anterior é preservado como referência histórica.

## Escopo entregue vs deferido

**Entregue (`BE-CESAD-REG-01E-B`):**

- Modelagem de supersessão + migration.
- Ajuste de todos os read paths (parecer ativo por etapa), incluindo consolidação e elegibilidade do parecer final.
- Rollover supersede parecer preparatório em rascunho (ou completo sem documento/signers).
- Auditoria do rollover inclui `supersededCesadStageOpinionId`.

**Deferido (task documental/supersessão documental própria):**

- Rollover quando já há expected signers congelados, documento CESAD `READY_FOR_SIGNATURE` ou parcialmente assinado. Esses casos exigem supersessão de **documento** e cancelamento de assinaturas pendentes, com impacto no ciclo documental — permanecem **bloqueados** com erro claro.
- Ato consolidado (documento `SIGNED` com assinaturas completas) permanece **imutável** e nunca é supersedido.

## Consequências

Positivas:

- Preserva a imutabilidade: nada é deletado; o parecer anterior vira histórico supersedido.
- Espelha um padrão já existente e auditado (`CesadStageAssignment`).
- Desbloqueia o rollover para o caso mais comum (parecer em rascunho) sem antecipar o ciclo documental.

Custos e riscos:

- Toca código auditado de resultado final (consolidação/elegibilidade do parecer final); mitigado por typecheck exaustivo (cada site quebrou em compilação), testes de unidade verdes e validação contra PostgreSQL real.
- "Um parecer ativo por etapa" depende da camada de service; deve ser preservado em qualquer novo fluxo que crie parecer.

## Validação

- `npx prisma validate`, typecheck backend/frontend, `test:unit` (jest), backend build e frontend copy-check verdes.
- Comportamento provado contra PostgreSQL real: supersessão de rascunho no rollover, liberação do invariante (duas linhas, uma ativa), read path escolhendo o parecer ativo, e bloqueio dos casos com signers/documento.

## Relação com outras ADRs

- Depende de ADR-006 (rollover de competência) e a estende.
- Revisita o alerta da ADR-005 sobre o invariante 1:1: a mudança é adotada de forma controlada e restrita ao necessário para a supersessão de parecer.
