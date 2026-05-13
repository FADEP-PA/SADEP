# BE-FLOW-4STAGE-01 — Estruturar progressao formal das quatro etapas avaliativas

## Status

Ativa / parcialmente entregue.

Primeira fatia estrutural concluida em `BE-FLOW-4STAGE-01A — Materializar quatro etapas e corrigir resolucao de etapa atual`.

Fatia seguinte pendente: `BE-FLOW-4STAGE-01B — Implementar COMPLETE_CURRENT_STAGE`.

## Area

Backend, workflow, dominio processual e auditoria.

## Contexto

O MVP cobre o Caso 2, com um processo administrativo composto por quatro etapas internas obrigatorias. A varredura global confirmou que o backend ja implementa partes do ciclo de uma etapa, mas ainda nao representa a progressao formal completa das quatro etapas ate a consolidacao.

Esta task existe para evitar que o fluxo reduzido atual seja tratado como o fluxo completo do Caso 2.

Desde `BE-FLOW-4STAGE-01A`, o backend ja materializa/garante quatro `ProcessStage` por processo, com etapa 1 ativa por padrao e etapas 2 a 4 futuras. A resolucao da etapa atual foi corrigida para ignorar etapas futuras, e artefatos stage-bound foram protegidos contra uso em etapa futura.

Ainda falta a progressao formal entre etapas, especialmente a action `COMPLETE_CURRENT_STAGE`, o fechamento da etapa ativa e a abertura sequencial da proxima etapa.

## Entrega parcial concluida

### BE-FLOW-4STAGE-01A — Materializar quatro etapas e corrigir resolucao de etapa atual

- **Status:** concluida / auditada / aprovada com ressalvas.
- **Commit funcional aprovado:** `84a3419 feat(backend): materialize four process stages`.
- **Task file:** [`BE-FLOW-4STAGE-01A-materialize-four-stages.md`](./BE-FLOW-4STAGE-01A-materialize-four-stages.md).
- **ADR relacionada:** [`ADR-004 — Progressao formal das quatro etapas avaliativas`](../../../architecture/adr/adr-004-four-stage-progression.md).
- Entregou constantes/helpers para as quatro etapas do Caso 2, total `4`, `stageCode` `ETAPA_1` a `ETAPA_4`, `ensureFourProcessStages`, migration/backfill `20260513143000_materialize_four_process_stages`, etapa 1 ativa por padrao, etapas 2 a 4 futuras e lifecycle por `startedAt`/`endedAt`.
- Corrigiu `resolveCurrentStageOrThrow` para usar somente etapa ativa e ignorar etapas futuras.
- Separou leitura historica/consolidacao em metodo proprio.
- Preservou documentos, avaliacoes, autoavaliacoes, pareceres, assignments e assinaturas ja stage-bound.
- Bloqueou documentos, parecer CESAD, assinatura/documento CESAD, assignment/supersessao e transicoes operacionais em etapa futura.
- Ampliou test helpers e testes backend.

## Fatia pendente

### BE-FLOW-4STAGE-01B — Implementar COMPLETE_CURRENT_STAGE

- **Status:** pendente alta.
- **Task file:** [`BE-FLOW-4STAGE-01B-complete-current-stage.md`](./BE-FLOW-4STAGE-01B-complete-current-stage.md).
- Deve adicionar `ProcessAction.COMPLETE_CURRENT_STAGE`.
- Deve adicionar `AuditEventType.STAGE_COMPLETED`, se necessario.
- Deve permitir execucao a partir de `PARECER_EMITIDO`.
- Deve validar completude documental da etapa ativa.
- Nas etapas 1 a 3, deve definir `endedAt` na etapa atual, definir `startedAt` na proxima etapa e retornar o processo para `EM_AVALIACAO`.
- Na etapa 4, deve definir `endedAt`, nao criar etapa 5, nao homologar, nao criar parecer conclusivo final e deixar caminho preparado para `BE-CESAD-FINAL-01`.
- Deve registrar auditoria robusta da conclusao de etapa.

## Escopo previsto

- representar a progressao entre as quatro etapas avaliativas;
- explicitar pre-condicoes para iniciar, concluir ou avancar etapa;
- preservar ciclo documental por etapa;
- manter transicoes dentro da workflow-engine;
- registrar auditoria de avancos, bloqueios e ajustes;
- documentar estados intermediarios sem inflar indevidamente o estado macro do processo;
- preservar compatibilidade com status e modelos ja existentes quando possivel.

## Fora do escopo

- implementar homologacao final;
- implementar recurso administrativo;
- implementar publicacao de portaria;
- implementar parecer conclusivo final, salvo integracao minima de pre-condicao futura;
- alterar frontend demonstrativo;
- criar decisao juridica no frontend.

## Ressalvas herdadas da 01A

- Helper explicito de etapa concluida pode ser adicionado futuramente para simetria do lifecycle.
- Antes ou junto de `BE-FLOW-4STAGE-01B`, avaliar separacao mais clara entre contexto de leitura e escrita em status de assinatura CESAD.
- `createProcessStage` em testes pode ativar outra etapa se o teste nao encerrar a anterior explicitamente.
- A migration `20260513143000_materialize_four_process_stages` usa IDs por `randomblob(16)` em SQLite no backfill, diferente de `cuid()`, com risco pratico desprezivel.
- Processos legados incoerentes com multiplas etapas ativas passam a falhar explicitamente em vez de escolher uma etapa silenciosamente.

## Criterios de aceite

- o backend diferencia claramente etapa atual, etapas concluidas e etapas pendentes;
- a proxima etapa so fica disponivel apos conclusao documental e workflow da etapa anterior;
- a quarta etapa concluida habilita o caminho para parecer conclusivo final, mas nao homologa automaticamente;
- transicoes relevantes passam pela workflow-engine;
- auditoria registra usuario, perfil, data/hora, acao, processo e etapa afetada.

## Validacoes esperadas

- `npm run typecheck --workspace @sadep/backend`;
- `npm run typecheck:spec --workspace @sadep/backend`;
- testes backend de workflow/processos;
- `npm run test --workspace @sadep/backend`;
- `git diff --check`.

## Dependencias

- `docs/skills/workflow-engine-skill.md`;
- `docs/workflow/four-stage-flow-and-appeals.md`;
- ciclo documental de avaliacao da chefia, autoavaliacao e parecer CESAD por etapa.

## Proxima acao

Implementar `BE-FLOW-4STAGE-01B — Implementar COMPLETE_CURRENT_STAGE`, sem marcar `BE-FLOW-4STAGE-01` como concluida integralmente enquanto faltar o encerramento formal da etapa ativa, a abertura sequencial da proxima etapa, o tratamento especial da quarta etapa e a auditoria da conclusao de etapa.
