# Roadmap Backend Modular

Esta pasta concentra a visao modular do roadmap backend do AEP-PA.

O documento legado [`../backend-implementation-tracker.md`](../backend-implementation-tracker.md) continua sendo a fonte de transicao nesta fase. Ele preserva o historico detalhado, evidencias, validacoes e ordem operacional mais completa.

## Arquivos

- [`active.md`](./active.md): painel operacional curto dos itens backend ativos, retomaveis ou pendentes.
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
- Tasks concluidas continuam no tracker legado ate fase posterior.
- Arquivamento de historico fica fora da DOC-R1.
- Arquivos detalhados das frentes ativas principais comecam a ser criados na DOC-R2, sem alterar status.
