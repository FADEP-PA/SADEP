# Backend — Itens Resolvidos

Este arquivo resume itens backend ja concluidos ou resolvidos, sem substituir o historico completo em [`../backend-implementation-tracker.md`](../backend-implementation-tracker.md).

Esta separacao nao altera status de tasks, nao move documentos legados e nao arquiva historico. Ela apenas prepara a futura reducao dos roadmaps legados.

## BE-TECH-01 — Migrar configuracao Prisma depreciada

- **Status documental:** concluida/aprovada no tracker legado.
- Criou `apps/backend/prisma.config.ts`.
- Removeu a configuracao antiga `package.json#prisma`.
- Preservou os scripts atuais do backend.
- Preservou `npm run backend:bootstrap` como fluxo oficial local.
- Preservou `DEV_SEED_PASSWORD` como requisito do seed local.
- Validacoes backend, bootstrap, Prisma e build passaram conforme registro legado.
- A limitacao historica de `prisma:migrate:dev` permanece separada e nao foi resolvida por esta task.

## BE-ARCH-01A — Fechar semantica de sessao web

- **Status documental:** decisao documental concluida.
- Consolidou bearer JWT temporario como estrategia incremental.
- Manteve expiracao de `1h`.
- Registrou que `/auth/me` deveria evoluir para leitura viva.
- Manteve refresh token, cookies, revogacao e logout server-side fora do escopo imediato.

## BE-ARCH-01B — Revalidar usuario atual no backend

- **Status documental:** concluida/aprovada no tracker legado.
- Backend passou a revalidar usuario vivo em requests autenticadas.
- Usuario inexistente, inativo ou com role divergente passa a produzir `401`.
- `/auth/me` passou a refletir estado persistido.
- Nao implementou refresh token, cookies, revogacao nem logout server-side.

## BE-ARCH-01C — Compartilhar contratos de auth/session

- **Status documental:** concluida/aprovada no tracker legado.
- Criou contratos minimos `AuthenticatedUserRef`, `LoginRequest` e `LoginResponse`.
- Backend e frontend passaram a reutilizar contratos minimos de auth/session.
- `AuthSession` e `rememberMe` permaneceram locais no frontend.
- `JwtPayload` permaneceu local no backend.

## Outros concluidos no legado

Os blocos abaixo aparecem como concluidos no tracker legado e devem ser tratados como historico ate a fase de arquivamento:

- `BE-OPS-*`;
- `BE-QUAL-*`;
- `BE-SEC-01/02`;
- `CESAD-DOM-*`;
- `BE-IDENT-01`;
- `BE-STR-01`.

Para detalhes, commits associados e validacoes completas, consultar [`../backend-implementation-tracker.md`](../backend-implementation-tracker.md).

