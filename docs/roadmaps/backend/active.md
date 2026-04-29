# Backend — Painel Ativo

Este painel resume os itens backend ativos, retomaveis ou pendentes. O historico completo permanece em [`../backend-implementation-tracker.md`](../backend-implementation-tracker.md).

## Retomavel

### BE-ARCH-01D — Alinhar frontend de sessao

- **Status operacional:** retomavel com escopo reduzido.
- **Escopo:** sessao, bootstrap, `/auth/me`, `401`, `403`, invalidadores e UX minima de sessao expirada.
- **Fora do escopo:** backend, contracts, refresh token, cookies, revogacao, logout server-side, CESAD, workflow e regras processuais.

## Pendentes relevantes

- `BE-ARCH-01E` — definir estrategia de producao para refresh/revogacao.
- `BE-ARCH-01F` — auditar e testar eventos de autenticacao.
- `BE-SEC-03` — fortalecer autorizacao contextual CESAD por processo.
- `BE-ARCH-02` — fortalecer pacotes compartilhados do monorepo.
- `BE-TECH-02` — revisar worker e cron.

## Backlog processual

O tracker legado documenta blocos `BE-FLOW-*`, incluindo formalizacao de documento de parecer CESAD, assinatura do parecer e substituicao por suplente. Nesta fase, esses itens permanecem resumidos aqui e detalhados apenas no tracker legado.

