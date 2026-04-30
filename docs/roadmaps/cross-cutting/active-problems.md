# Problemas Ativos Transversais

Este painel resume problemas ativos ou alertas transversais. O antigo painel transversal permanece como indice de compatibilidade em [`../problemas-atuais-do-projeto.md`](../problemas-atuais-do-projeto.md).

## Seguranca

- `BE-SEC-03` — autorizacao contextual CESAD por processo.

## Frontend / integracao

- `FE-CHEFIA-01` — `/chefia-imediata` parcialmente integrada ao workspace real por processo informado na tela ou `NEXT_PUBLIC_TECHNICAL_PROCESS_ID`; validacao visual concluida e fallback demonstrativo ainda ativo.
- `FT-24` — dependencia operacional de process id tecnico foi mitigada em `/chefia-imediata`, mas ainda deve ser reduzida nas demais rotas.

## Sessao / auth

- `BE-ARCH-01D` — mitigada/concluida no recorte minimo de sessao frontend; bootstrap, `/auth/me`, `401` idempotente, `403` e falhas nao-401 foram alinhados.
- `BE-ARCH-01E2` — modelagem persistente `UserSession` concluida/aprovada; o gap de banco para refresh/revogacao foi mitigado com `refreshTokenHash`, `familyId`, campos de expiracao, rotacao, revogacao e migration `20260430120000_add_user_session`.
- `BE-ARCH-01E3` — pendente; implementar refresh, rotacao e logout server-side.
- `BE-ARCH-01E4` — pendente; alinhar frontend para access token em memoria e refresh silencioso.
- `BE-ARCH-01E5` — pendente; hardening operacional de cookies/CORS/env.
- `BE-ARCH-01F` — futura auditoria e testes de eventos de autenticacao.

Observacao: a estrategia de producao com refresh/revogacao continua fora do escopo da `BE-ARCH-01D`; a ADR da `BE-ARCH-01E1` registra a decisao e a `BE-ARCH-01E2` entregou apenas a modelagem persistente. Refresh funcional, revogacao, rotacao, cookies e logout server-side continuam pendentes em `BE-ARCH-01E3`/`BE-ARCH-01E5`. Auditoria/testes de eventos de autenticacao continuam pendentes em `BE-ARCH-01F`.

## DX / infra

- [`DX-POSTCSS-01` — alerta de audit `postcss`/`next`](./tasks/DX-POSTCSS-01-audit-postcss-next.md) permanece como pendencia separada.
- `DX-01` foi resolvido operacionalmente e fica resumido em [`resolved-problems.md`](./resolved-problems.md#dx-01--desalinhamento-local-do-next); nao confundir com o alerta ativo `DX-POSTCSS-01`.

## Qualidade

- Ausencia de testes frontend permanece como risco ou candidata futura de quality gate quando formalizada.
