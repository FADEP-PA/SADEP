# Backend — Painel Ativo

Este painel resume os itens backend ativos, retomaveis ou pendentes. O historico completo permanece em [`../backend-implementation-tracker.md`](../backend-implementation-tracker.md).

## Retomavel

### [BE-ARCH-01D — Alinhar frontend de sessao](./tasks/BE-ARCH-01D-frontend-session-alignment.md)

- **Status operacional:** retomavel com escopo reduzido.
- **Escopo:** sessao, bootstrap, `/auth/me`, `401`, `403`, invalidadores e UX minima de sessao expirada.
- **Fora do escopo:** backend, contracts, refresh token, cookies, revogacao, logout server-side, CESAD, workflow e regras processuais.

## Pendentes relevantes

- `BE-ARCH-01E` — definir estrategia de producao para refresh/revogacao.
- `BE-ARCH-01F` — auditar e testar eventos de autenticacao.
- [`BE-SEC-03` — fortalecer autorizacao contextual CESAD por processo](./tasks/BE-SEC-03-cesad-contextual-authorization.md).
- [`BE-ARCH-02` — fortalecer pacotes compartilhados do monorepo](./tasks/BE-ARCH-02-shared-packages.md).
- [`BE-TECH-02` — revisar worker e cron](./tasks/BE-TECH-02-worker-cron.md).

## Backlog processual

O tracker legado documenta blocos `BE-FLOW-*`, incluindo formalizacao de documento de parecer CESAD, assinatura do parecer e substituicao por suplente. Nesta fase, esses itens permanecem resumidos aqui e detalhados apenas no tracker legado.
