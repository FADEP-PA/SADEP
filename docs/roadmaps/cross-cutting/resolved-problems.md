# Problemas Transversais Resolvidos

Este arquivo resume problemas transversais resolvidos ou mitigados. O antigo painel transversal permanece como indice de compatibilidade em [`../problemas-atuais-do-projeto.md`](../problemas-atuais-do-projeto.md).

Esta separacao nao altera status, nao move documentos legados e nao arquiva historico. Problemas ativos continuam em [`./active-problems.md`](./active-problems.md).

## DX-01 — Desalinhamento local do Next

- **Status documental:** resolvido operacionalmente.
- Antes: `package.json`/lock declaravam `next@15.5.15`, mas o ambiente executava `next@15.3.0`.
- Depois: `npm install` alinhou o ambiente local e `npm ls next` passou com `next@15.5.15`.
- `frontend:check`, build e typecheck do frontend passaram com `Next.js 15.5.15`.
- Nao houve alteracao versionada.
- O alerta `postcss`/audit permanece pendente em [`./tasks/DX-POSTCSS-01-audit-postcss-next.md`](./tasks/DX-POSTCSS-01-audit-postcss-next.md).

## BE-TECH-01 — Configuracao Prisma depreciada

- **Status documental:** resolvida no painel transversal e no tracker backend.
- A configuracao baseada em `package.json#prisma` foi removida.
- `apps/backend/prisma.config.ts` foi criado.
- Scripts, `backend:bootstrap`, seed com `DEV_SEED_PASSWORD` e fluxo local oficial foram preservados.
- A limitacao historica de `prisma:migrate:dev` permanece separada.

## BE-ARCH-01B — Revalidacao de usuario atual no backend

- **Status documental:** resolvida/concluida.
- O risco de o backend confiar apenas no payload do token ate a expiracao foi mitigado.
- Requests autenticadas passaram a revalidar usuario vivo e sessao invalida passou a ser tratada com `401`.

## BE-ARCH-01C — Contratos minimos de auth/session

- **Status documental:** resolvida/concluida.
- A duplicacao basica de contratos de auth/session entre backend e frontend foi mitigada.
- `AuthenticatedUserRef`, `LoginRequest` e `LoginResponse` foram introduzidos em `packages/contracts`.

## Problemas antigos resolvidos

Os indices modulares tambem registram grupos de problemas resolvidos, incluindo identidade canonica, signatarios esperados, bootstrap local, preflight de banco, guard operacional do Prisma no Windows, build/start de producao e hardening de credenciais de desenvolvimento.

Para a leitura de transicao e links modulares, consultar [`../problemas-atuais-do-projeto.md`](../problemas-atuais-do-projeto.md).
