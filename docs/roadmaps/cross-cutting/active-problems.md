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
- `BE-ARCH-01E3` — mitigada/concluida no backend; refresh, rotacao e logout server-side foram implementados, auditados e aprovados.
- `BE-ARCH-01E4A` — mitigada/concluida no frontend; access token em memoria, bootstrap via `POST /auth/refresh`, `credentials: include` em login/refresh/logout e logout server-side best-effort foram implementados, auditados e aprovados; a ressalva de UX do `401 público` foi corrigida pelo `BE-ARCH-01E4A-FIX`.
- `BE-ARCH-01E4B` — mitigada/concluida no frontend; retry automatico de `401`, single-flight contra refresh storm e protecao contra loop de refresh.
- `BE-ARCH-01E4C` — mitigada/concluida no frontend; caminho legado de token explicito removido e chamadas autenticadas preservadas via token em memoria.
- `BE-ARCH-01E5` — pendente; hardening operacional de cookies/CORS/env.
- `BE-ARCH-01F` — futura auditoria e testes de eventos de autenticacao.

Observacao: a estrategia de producao com refresh/revogacao continua fora do escopo da `BE-ARCH-01D`; a ADR da `BE-ARCH-01E1` registra a decisao, a `BE-ARCH-01E2` entregou a modelagem persistente, a `BE-ARCH-01E3` mitigou o gap backend de refresh, rotacao, cookie `HttpOnly` e logout server-side, a `BE-ARCH-01E4A` mitigou o risco de access token persistido em storage web, a `BE-ARCH-01E4B` mitigou o retry silencioso no frontend, e a `BE-ARCH-01E4C` removeu consumidores legados de token de sessao no frontend. Permanecem pendentes `BE-ARCH-01E5` e `BE-ARCH-01F`.

## DX / infra

- [`DX-POSTCSS-01` — alerta de audit `postcss`/`next`](./tasks/DX-POSTCSS-01-audit-postcss-next.md) permanece como pendencia separada.
- `DX-01` foi resolvido operacionalmente e fica resumido em [`resolved-problems.md`](./resolved-problems.md#dx-01--desalinhamento-local-do-next); nao confundir com o alerta ativo `DX-POSTCSS-01`.

## Qualidade

- Ausencia de testes frontend permanece como risco ou candidata futura de quality gate quando formalizada.
