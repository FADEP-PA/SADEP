# Frontend — Itens Resolvidos

Este arquivo resume itens frontend ja concluidos ou resolvidos. O antigo roadmap frontend permanece como indice de compatibilidade em [`../frontend-tasks-roadmap.md`](../frontend-tasks-roadmap.md).

Esta separacao nao altera status de tasks, nao move documentos legados e nao arquiva historico. Ela apenas prepara a futura reducao dos roadmaps legados.

## FT-27 / DX-01 — Reconciliar dependencias locais do frontend

- **Status documental:** resolvida operacionalmente.
- `npm install` reconciliou o ambiente local.
- `npm ls next` passou com `next@15.5.15`.
- `frontend:check`, build e typecheck do frontend passaram usando `Next.js 15.5.15`.
- Nao houve diff versionado.
- A pendencia `postcss`/audit permanece separada em [`../cross-cutting/tasks/DX-POSTCSS-01-audit-postcss-next.md`](../cross-cutting/tasks/DX-POSTCSS-01-audit-postcss-next.md).

## FT-22 / FT-23 — DX e gates frontend

- **Status documental:** concluidas no roadmap legado.
- `FT-22` investigou a instabilidade do frontend em modo dev e consolidou o uso de limpeza de artefatos quando necessario.
- `FT-23` consolidou gates minimos de qualidade do frontend, incluindo `frontend:check`.
- A leitura de transicao permanece no indice de compatibilidade do roadmap legado.

## FT-17 — Area de homologacao

- **Status documental:** concluida no roadmap legado como painel preparado.
- A area `/homologacao-autoridade` foi preparada como workspace/painel para expansao.
- Esta conclusao nao deve ser lida como fluxo funcional backend completo de homologacao.

## FT-01 a FT-15 e FT-25

- `FT-01` a `FT-15` aparecem como concluidas no roadmap legado e validadas por gates frontend registrados.
- `FT-25` concluiu a triagem de vulnerabilidades/dependencias que afetam o frontend.
- O alerta residual `next`/`postcss` permanece pendente e separado em `DX-POSTCSS-01`.

## Cuidado especial com FT-05

- `FT-05` pode ser preservada como historico de refinamento visual/estrutural anterior da jornada da chefia.
- Ela nao deve ser interpretada como integracao backend real da chefia.
- A integracao real de `/chefia-imediata` continua pendente em [`./tasks/FE-CHEFIA-01-supervisor-workspace-integration.md`](./tasks/FE-CHEFIA-01-supervisor-workspace-integration.md).

Para a leitura de transicao e links modulares, consultar [`../frontend-tasks-roadmap.md`](../frontend-tasks-roadmap.md).
