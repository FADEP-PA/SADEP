# Problemas Ativos Transversais

Este painel resume problemas ativos ou alertas transversais. O antigo painel transversal permanece como indice de compatibilidade em [`../problemas-atuais-do-projeto.md`](../problemas-atuais-do-projeto.md).

## Seguranca

- `BE-SEC-03` — autorizacao contextual CESAD por processo.

## Frontend / integracao

- `FE-CHEFIA-01` — `/chefia-imediata` parcialmente integrada ao workspace real por processo informado na tela; validacao visual concluida e fallback demonstrativo/local ainda ativo.
- Listagem segura de processos por perfil permanece melhoria futura propria e nao reabre `FT-24`, que foi resolvida no recorte frontend.

## Sessao / auth

Sem pendencia ativa nesta categoria apos o recorte `BE-ARCH-01E5`.

Observacao: a estrategia de producao com refresh/revogacao foi tratada incrementalmente em `BE-ARCH-01E2`, `BE-ARCH-01E3`, `BE-ARCH-01E4A`, `BE-ARCH-01E4B`, `BE-ARCH-01E4C`, `BE-ARCH-01E5` e `BE-ARCH-01F`. Novas evolucoes de auth devem nascer como tasks proprias.

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
