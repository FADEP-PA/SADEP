# Backend — Painel Ativo

Este painel resume os itens backend ativos, retomaveis ou pendentes. O antigo tracker backend permanece como indice de compatibilidade em [`../backend-implementation-tracker.md`](../backend-implementation-tracker.md).

## Concluido recente

### [BE-ARCH-01D — Alinhar frontend de sessao](./tasks/BE-ARCH-01D-frontend-session-alignment.md)

- **Status operacional:** concluida / aprovada.
- **Escopo entregue:** alinhamento minimo de sessao frontend, bootstrap, `/auth/me`, `401` idempotente, preservacao de `403` e falhas nao-401 sem limpeza indevida de sessao.
- **Commit funcional aprovado:** `fix(frontend): align session invalidation`.
- **Ressalva:** validacao manual em navegador ainda recomendada para login, logout, reload autenticado, `401` concorrente, `403` e limpeza dos storages.
- **Observacao:** a frente maior `BE-ARCH-01` ainda nao esta totalmente concluida, pois `BE-ARCH-01E` e `BE-ARCH-01F` permanecem pendentes.

## Pendentes relevantes

- `BE-ARCH-01E` — definir estrategia de producao para refresh/revogacao.
- `BE-ARCH-01F` — auditar e testar eventos de autenticacao.
- [`BE-SEC-03` — fortalecer autorizacao contextual CESAD por processo](./tasks/BE-SEC-03-cesad-contextual-authorization.md).
- [`BE-ARCH-02` — fortalecer pacotes compartilhados do monorepo](./tasks/BE-ARCH-02-shared-packages.md).
- [`BE-TECH-02` — revisar worker e cron](./tasks/BE-TECH-02-worker-cron.md).

## Backlog processual

O tracker legado documenta blocos `BE-FLOW-*`, incluindo formalizacao de documento de parecer CESAD, assinatura do parecer e substituicao por suplente. Nesta fase, esses itens permanecem resumidos aqui e detalhados apenas no tracker legado.
