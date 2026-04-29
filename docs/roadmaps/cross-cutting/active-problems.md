# Problemas Ativos Transversais

Este painel resume problemas ativos ou alertas transversais. O antigo painel transversal permanece como indice de compatibilidade em [`../problemas-atuais-do-projeto.md`](../problemas-atuais-do-projeto.md).

## Seguranca

- `BE-SEC-03` — autorizacao contextual CESAD por processo.

## Frontend / integracao

- `FE-CHEFIA-01` — `/chefia-imediata` demonstrativa/local; nao tratar como integracao backend real concluida sem nova validacao.
- `FT-24` — dependencia operacional de process id tecnico ainda deve ser reduzida.

## Sessao / auth

- `BE-ARCH-01D` — frente ativa/retomavel de sessao frontend, restrita a bootstrap, `/auth/me`, `401`, `403`, invalidadores e UX minima.
- `BE-ARCH-01E` — futura estrategia de producao para refresh/revogacao.
- `BE-ARCH-01F` — futura auditoria e testes de eventos de autenticacao.

## DX / infra

- [`DX-POSTCSS-01` — alerta de audit `postcss`/`next`](./tasks/DX-POSTCSS-01-audit-postcss-next.md) permanece como pendencia separada.
- `DX-01` foi resolvido operacionalmente e fica resumido em [`resolved-problems.md`](./resolved-problems.md#dx-01--desalinhamento-local-do-next); nao confundir com o alerta ativo `DX-POSTCSS-01`.

## Qualidade

- Ausencia de testes frontend permanece como risco ou candidata futura de quality gate quando formalizada.
