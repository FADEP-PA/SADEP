# Roadmap Frontend Modular

Esta pasta concentra a visao modular do roadmap frontend do AEP-PA.

O documento legado [`../frontend-tasks-roadmap.md`](../frontend-tasks-roadmap.md) continua existindo como indice de compatibilidade. A leitura operacional deve comecar por este diretorio modular.

## Arquivos

- [`active.md`](./active.md): painel operacional curto dos itens frontend ativos, pendentes ou resolvidos operacionalmente.
- [`resolved.md`](./resolved.md): resumo dos itens frontend concluidos ou resolvidos.
- [`tasks/`](./tasks/): area que comeca a receber arquivos proprios das tasks ativas principais.

## Pontos de atencao

- `/chefia-imediata` esta demonstrativa/local e precisa de revalidacao antes de qualquer leitura como integracao backend real.
- `FT-24` segue pendente para reduzir dependencia de `NEXT_PUBLIC_TECHNICAL_PROCESS_ID`.
- `BE-ARCH-01D` impactou o frontend e foi concluida/aprovada como alinhamento minimo de sessao; commit funcional aprovado `fix(frontend): align session invalidation`.
- `FT-27/DX-01` foi resolvida operacionalmente quanto ao Next local; a pendencia `postcss`/audit permanece separada.
- Validacao visual/manual continua importante para concluir tarefas frontend.

## Regras de transicao

- Esta fase nao altera status de tasks.
- Tasks concluidas ficam resumidas em [`resolved.md`](./resolved.md) ate fase posterior de arquivamento.
- `resolved.md` resume itens concluidos, com cuidado especial para itens parcialmente resolvidos como `FT-05`/chefia.
- Arquivamento real de historico fica fora da DOC-R3.
- Arquivos detalhados das frentes ativas principais comecam a ser criados na DOC-R2, sem alterar status.
