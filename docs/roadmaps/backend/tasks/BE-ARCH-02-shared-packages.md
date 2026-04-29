# BE-ARCH-02 — Fortalecer pacotes compartilhados do monorepo

## Status

Pendente.

## Area

Backend, contracts e monorepo.

## Fonte de transicao

- [`../../backend-implementation-tracker.md`](../../backend-implementation-tracker.md)
- [`../active.md`](../active.md)
- [`../../problemas-atuais-do-projeto.md`](../../problemas-atuais-do-projeto.md)

## Contexto

`packages/contracts` ja recebeu contratos minimos de auth/session pela `BE-ARCH-01C`. Ainda permanece divida estrutural no empacotamento e consumo do monorepo, incluindo possivel consumo hibrido entre `src` e `dist`.

## Estado atual

O build de contracts foi ajustado o suficiente para runtime compilado, mas o refinamento amplo de exports, build e consumo segue associado a `BE-ARCH-02`.

## Escopo previsto

- revisar `packages/contracts`;
- revisar configuracoes de package quando aplicavel;
- revisar build e exports;
- reduzir acoplamento direto em `src`;
- estabilizar consumo backend/frontend.

## Fora do escopo

- novos contratos de auth ja resolvidos na `BE-ARCH-01C`;
- refresh token;
- UX frontend;
- refactor amplo sem varredura previa.

## Evidencias / referencias

- O tracker backend preserva `BE-ARCH-02` como frente planejada.
- O painel transversal associa a frente a qualidade estrutural de packages e consumo.

## Validacoes esperadas

- `npm run build --workspace @aep-pa/contracts`;
- `node -e "require('@aep-pa/contracts')"`;
- typecheck backend;
- typecheck frontend;
- build dos consumidores afetados.

## Proxima acao

Executar varredura especifica de packages, exports e consumo antes da implementacao.

