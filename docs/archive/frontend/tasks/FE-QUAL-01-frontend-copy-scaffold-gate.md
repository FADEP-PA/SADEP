# FE-QUAL-01 — Quality gate frontend de texto e scaffolds legados

## Status

Concluida no recorte frontend.

## Area

Frontend, DX, qualidade visual e consistencia institucional.

## Objetivo

Adicionar um gate local, sem novas dependencias, para detectar regressao de textos/scaffolds legados no frontend do SADEP.

## Entrega

- Criado `scripts/check-frontend-copy.mjs`.
- Adicionado script `copy-check` no workspace `@sadep/frontend`.
- Adicionado script raiz `frontend:copy-check`.
- Integrado o gate ao `npm run frontend:check`.
- O gate varre `apps/frontend/src` e `apps/frontend/README.md`.

## O que o gate bloqueia

- `AEP-PA` ou `AEP PA` em texto frontend atual.
- `Lorem ipsum`.
- `TODO`.
- Texto generico `em breve`.
- Referencias a placeholder generico ou scaffolds legados ja removidos.
- Documentacao frontend que volte a tratar areas atuais como paginas placeholder.

## Dados demonstrativos

- Nenhum dado demonstrativo foi removido.
- O gate nao bloqueia `placeholder` de input usado como orientacao de formulario.
- O gate nao bloqueia dados demonstrativos seguros ou arquivos `demo`, desde que nao prometam integracao real.

## Decisoes tomadas

- O recorte foi escolhido porque as tasks `FE-PROCESS-LIST-01`, `FE-CHEFIA-02` e `FE-CESAD-01` dependem de backend/contratos para conclusao real.
- A verificacao foi implementada com Node.js nativo para nao adicionar dependencia.
- O gate foi integrado ao `frontend:check` para rodar junto do typecheck/build frontend.

## Limitacoes conhecidas

- Este gate nao substitui testes de interacao, acessibilidade automatizada ou validacao visual em navegador.
- A futura listagem segura por perfil continua dependente de backend e permanece em `FE-PROCESS-LIST-01`.
- A remocao de fallbacks demonstrativos operacionais continua dependente de contratos reais.

## Validacoes

- `npm run frontend:copy-check`
- `npm run frontend:typecheck`
- `npm run frontend:check`
- `npm run frontend:build`
- `git diff --check`

## Proxima task recomendada

Aguardar contrato backend seguro antes de executar `FE-PROCESS-LIST-01`, ou abrir novo recorte frontend estritamente visual/documental se os endpoints ainda nao estiverem disponiveis.
