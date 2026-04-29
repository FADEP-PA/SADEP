# Roadmap Backend Modular

Esta pasta concentra a visao modular do roadmap backend do AEP-PA.

O documento legado [`../backend-implementation-tracker.md`](../backend-implementation-tracker.md) continua existindo como indice de compatibilidade. A leitura operacional deve comecar por este diretorio modular.

## Arquivos

- [`active.md`](./active.md): painel operacional curto dos itens backend ativos, retomaveis ou pendentes.
- [`resolved.md`](./resolved.md): resumo dos itens backend concluidos ou resolvidos.
- [`tasks/`](./tasks/): area que comeca a receber arquivos proprios das tasks ativas principais.

## Itens ativos ou retomaveis

- `BE-ARCH-01D` — alinhar frontend de sessao.
- `BE-ARCH-01E` — definir estrategia de producao para refresh/revogacao.
- `BE-ARCH-01F` — auditar e testar eventos de autenticacao.
- `BE-SEC-03` — fortalecer autorizacao contextual CESAD por processo.
- `BE-ARCH-02` — fortalecer pacotes compartilhados do monorepo.
- `BE-TECH-02` — revisar estrutura de workspaces, worker e cron.
- `BE-FLOW-*` — backlog processual documentado no tracker legado.

## Regras de transicao

- Esta fase nao altera status de tasks.
- Tasks concluidas ficam resumidas em [`resolved.md`](./resolved.md) ate fase posterior de arquivamento.
- `resolved.md` resume itens concluidos, mas nao substitui o tracker legado.
- Arquivamento real de historico fica fora da DOC-R3.
- Arquivos detalhados das frentes ativas principais comecam a ser criados na DOC-R2, sem alterar status.
