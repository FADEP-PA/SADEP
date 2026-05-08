# BE-ARCH-02 — Fortalecer pacotes compartilhados do monorepo

## Status

Concluida no recorte estrutural de contracts e consumo do monorepo.

## Area

Backend, contracts e monorepo.

## Fonte de transicao

- [`../../backend-implementation-tracker.md`](../../backend-implementation-tracker.md)
- [`../active.md`](../active.md)
- [`../../problemas-atuais-do-projeto.md`](../../problemas-atuais-do-projeto.md)

## Contexto

`packages/contracts` ja recebeu contratos minimos de auth/session pela `BE-ARCH-01C`. Ainda permanece divida estrutural no empacotamento e consumo do monorepo, incluindo possivel consumo hibrido entre `src` e `dist`.

## Estado atual

O pacote `@sadep/contracts` passou a expor `main`, `types` e `exports` a partir de `dist/`. O `tsconfig.base.json` tambem passou a resolver `@sadep/contracts` pelo build compilado, reduzindo o acoplamento direto a `packages/contracts/src`.

Os consumidores backend e frontend constroem `@sadep/contracts` antes de typecheck, build ou teste quando necessario. O backend deixou de incluir `packages/contracts/src/**/*.ts` nos tsconfigs de app/spec, e o Jest passou a mapear `@sadep/contracts` para o entrypoint compilado.

## Escopo realizado

- revisado `packages/contracts`;
- revisadas configuracoes de package, `main`, `types` e `exports`;
- estabilizado build CommonJS em `dist/` como entrypoint de consumo;
- reduzido acoplamento direto dos consumidores com `packages/contracts/src`;
- ajustados scripts backend/frontend para construir contracts antes dos gates relevantes;
- mantida a modelagem atual de contratos sem adicionar novos DTOs, schemas ou regras.

## Fora do escopo

- novos contratos de auth ja resolvidos na `BE-ARCH-01C`;
- refresh token;
- UX frontend;
- refactor amplo sem varredura previa.
- dados demonstrativos, fakes, placeholders ou fallback visual do frontend.

## Evidencias / referencias

- `packages/contracts/package.json` aponta `main`, `types` e `exports` para `dist/`.
- `tsconfig.base.json` resolve `@sadep/contracts` pelo build compilado.
- `apps/backend/tsconfig.app.json` e `apps/backend/tsconfig.spec.json` nao incluem mais `packages/contracts/src/**/*.ts`.
- `apps/backend/jest.config.js` mapeia `@sadep/contracts` para `packages/contracts/dist/index.js`.
- `apps/backend/package.json` e `apps/frontend/package.json` constroem contracts antes de typecheck/build/test quando necessario.
- A ADR de sessao [`../../../architecture/adr/adr-002-session-refresh-revocation-strategy.md`](../../../architecture/adr/adr-002-session-refresh-revocation-strategy.md) registra que contratos futuros de refresh/logout/sessao devem ser coordenados com `BE-ARCH-02`, sem bloquear a decisao arquitetural.
- A `BE-ARCH-01E2` modelou `UserSession` e a migration `20260430120000_add_user_session`, mas nao alterou contracts; contratos futuros de refresh/logout/sessao permanecem dependentes de implementacao funcional posterior.

## Validacoes executadas

- `npm run build --workspace @sadep/contracts`;
- `node -e "require('@sadep/contracts')"`;
- `npm run typecheck --workspace @sadep/backend`;
- `npm run typecheck:spec --workspace @sadep/backend`;
- `npm run typecheck --workspace @sadep/frontend`;
- `npm run backend:build`;
- `npm run frontend:check`;
- `npm run test --workspace @sadep/backend`;
- `git diff --check`.

## Proxima acao

Abrir task propria apenas para novos contratos de endpoint, schemas de validacao, eventos de dominio ou futura publicacao formal de packages. Nao reabrir `BE-ARCH-02` para novos DTOs funcionais.
