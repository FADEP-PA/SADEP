# Problemas Ativos Transversais

Este painel resume problemas ativos ou alertas transversais. O historico completo permanece em [`../problemas-atuais-do-projeto.md`](../problemas-atuais-do-projeto.md).

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
- `DX-01` — desalinhamento local do Next foi resolvido operacionalmente e nao deve ser confundido com o alerta `postcss`.

## Qualidade

- Ausencia de testes frontend permanece como risco ou candidata futura de quality gate quando formalizada.
