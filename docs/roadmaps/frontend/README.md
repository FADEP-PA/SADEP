# Roadmap Frontend Modular

Esta pasta concentra a visao modular do roadmap frontend do SADEP.

O documento legado foi arquivado em [`docs/archive/roadmaps-legados/frontend-tasks-roadmap.md`](../../../archive/roadmaps-legados/frontend-tasks-roadmap.md) (DOC-R8). A leitura operacional deve comecar por este diretorio modular.

## Arquivos

- [`active.md`](./active.md): painel operacional curto dos itens frontend ativos, pendentes ou resolvidos operacionalmente.
- [`resolved.md`](./resolved.md): resumo dos itens frontend concluidos ou resolvidos.
- [`tasks/`](./tasks/): area que comeca a receber arquivos proprios das tasks ativas principais.

## Pontos de atencao

- `/chefia-imediata` possui integracao inicial real por processo informado manualmente, mas `FE-CHEFIA-01` permanece parcial porque ainda ha fallback demonstrativo/local, dados demonstrativos e ausencia de listagem segura por chefia autenticada.
- `FE-CHEFIA-02` registra a continuidade para listagem segura de processos da chefia e remocao de fallback demonstrativo.
- `FE-PROCESS-LIST-01` registra a frente geral de listagem segura de processos por perfil autenticado, sem reabrir `FT-24`.
- `FT-24` foi resolvida no recorte frontend: a varredura global nao encontrou consumo de `NEXT_PUBLIC_TECHNICAL_PROCESS_ID` no codigo frontend.
- `BE-ARCH-01D` impactou o frontend e foi concluida/aprovada como alinhamento minimo de sessao; commit funcional aprovado `fix(frontend): align session invalidation`.
- `BE-ARCH-01E4B` e `BE-ARCH-01E4C` foram reclassificadas como concluidas no recorte identificado pela varredura global.
- `FE-DOC-AUTH-README-01` atualizou a documentacao frontend para refletir access token em memoria, bootstrap por refresh e cookie `HttpOnly`, sem persistir sessao completa em `localStorage`/`sessionStorage`.
- `FT-27/DX-01` foi resolvida operacionalmente quanto ao Next local; a pendencia `postcss`/audit permanece separada.
- Validacao visual/manual continua importante para concluir tarefas frontend.

## Regras de transicao

- Esta fase nao altera status de tasks.
- Tasks concluidas ficam resumidas em [`resolved.md`](./resolved.md).
- Arquivos de task detalhados ja resolvidos foram movidos para [`docs/archive/frontend/tasks/`](../../../archive/frontend/tasks/) na DOC-R8.
- Arquivos de task das frentes pendentes permanecem em [`tasks/`](./tasks/).
