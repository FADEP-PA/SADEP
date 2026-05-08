# Problemas Ativos Transversais

Este painel resume problemas ativos ou alertas transversais. O antigo painel transversal permanece como indice de compatibilidade em [`../problemas-atuais-do-projeto.md`](../problemas-atuais-do-projeto.md).

## Seguranca

- `BE-SEC-03` — autorizacao contextual CESAD por processo.

## Frontend / integracao

- `FE-CHEFIA-01` — `/chefia-imediata` parcialmente integrada ao workspace real por processo informado na tela; validacao visual concluida e fallback demonstrativo/local ainda ativo.
- Listagem segura de processos por perfil permanece melhoria futura propria e nao reabre `FT-24`, que foi resolvida no recorte frontend.

## Sessao / auth

- `BE-ARCH-01E5` — pendente; hardening operacional de cookies/CORS/env.
- `BE-ARCH-01F` — futura auditoria e testes de eventos de autenticacao.

Observacao: a estrategia de producao com refresh/revogacao continua fora do escopo da `BE-ARCH-01D`; a ADR da `BE-ARCH-01E1` registra a decisao, a `BE-ARCH-01E2` entregou a modelagem persistente, a `BE-ARCH-01E3` mitigou o gap backend de refresh, rotacao, cookie `HttpOnly` e logout server-side, a `BE-ARCH-01E4A` mitigou o risco de access token persistido em storage web, a `BE-ARCH-01E4B` mitigou o retry silencioso no frontend, e a `BE-ARCH-01E4C` removeu consumidores legados de token de sessao no frontend. Permanecem pendentes `BE-ARCH-01E5` e `BE-ARCH-01F`; a frente maior `BE-ARCH-01` nao esta concluida.

## Backend / arquitetura

Sem pendencia estrutural ativa nesta categoria apos o recorte `BE-ARCH-02`. Novos contratos funcionais devem nascer como tasks proprias.

## DX / infra

- [`DX-POSTCSS-01` — alerta de audit `postcss`/`next`](./tasks/DX-POSTCSS-01-audit-postcss-next.md) permanece como pendencia separada.
- `DX-DB-SEED-01` — alerta operacional: `db:check` pode falhar quando o banco local existe, mas nao recebeu o seed minimo; usar `npm run backend:bootstrap` para preparar o ambiente local quando necessario.
- `NOM-AEP-COOKIE-01` — nomenclatura tecnica residual: o cookie default ainda usa `aep_pa_refresh`; tratar futuramente em task pequena propria, sem migracao ampla AEP -> SADEP.
- `DX-01` foi resolvido operacionalmente e fica resumido em [`resolved-problems.md`](./resolved-problems.md#dx-01--desalinhamento-local-do-next); nao confundir com o alerta ativo `DX-POSTCSS-01`.

## Documentacao

- `DOC-AUTH-STATE-01` — inconsistencia documental de `BE-ARCH-01E4B/E4C` reconciliada nesta atualizacao documental; mantida aqui apenas como referencia de rastreabilidade.
- `DOC-FT24-STATE-01` — inconsistencia documental de `FT-24` reconciliada nesta atualizacao documental; mantida aqui apenas como referencia de rastreabilidade.

## Qualidade

- Ausencia de testes frontend permanece como risco ou candidata futura de quality gate quando formalizada.
