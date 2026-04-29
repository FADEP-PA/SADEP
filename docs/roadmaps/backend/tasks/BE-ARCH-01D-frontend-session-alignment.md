# BE-ARCH-01D — Alinhar frontend de sessao

## Status

Retomavel / pendente.

## Area

Backend/frontend, integracao e sessao.

## Fonte de transicao

- [`../../backend-implementation-tracker.md`](../../backend-implementation-tracker.md)
- [`../active.md`](../active.md)
- [`../../frontend-tasks-roadmap.md`](../../frontend-tasks-roadmap.md)
- [`../../problemas-atuais-do-projeto.md`](../../problemas-atuais-do-projeto.md)

## Contexto

A frente `BE-ARCH-01D` continua necessaria para alinhar a sessao do frontend. O ambiente frontend ja foi reconciliado pela `FT-27/DX-01`, entao a tarefa pode ser retomada com escopo reduzido.

## Estado atual

O backend ja revalida usuario vivo em requests autenticadas e os contratos minimos de auth/session ja foram compartilhados. Os achados atuais estao concentrados no comportamento de sessao do frontend.

## Escopo previsto

- bootstrap de sessao;
- consumo de `/auth/me`;
- tratamento idempotente de `401`;
- preservacao de `403`;
- invalidadores de sessao;
- UX minima de sessao expirada;
- evitar limpeza indevida de sessao em falhas nao-401.

## Fora do escopo

- backend;
- contracts;
- refresh token;
- cookies;
- revogacao;
- logout server-side;
- CESAD;
- workflow;
- homologacao;
- regras processuais.

## Evidencias / referencias

- `FT-27/DX-01` regularizou o ambiente frontend com `next@15.5.15`.
- O tracker backend registra a `BE-ARCH-01D` como retomavel e restrita a sessao.
- O painel transversal separa `BE-SEC-03` como problema de autorizacao contextual, nao de sessao.

## Validacoes esperadas

- `npm run frontend:check`;
- `npm run build --workspace @aep-pa/frontend`;
- `npm run typecheck --workspace @aep-pa/frontend`;
- validacao manual minima de login, logout, `/sessao-expirada`, `401` e `403`.

## Proxima acao

Gerar prompt de implementacao da `BE-ARCH-01D` apos a `DOC-R2`, se a frente for priorizada.

