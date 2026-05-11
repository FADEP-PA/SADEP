# FE-CHEFIA-02 — Listagem segura de processos da chefia e remocao de fallback demonstrativo

## Status

Pendente alta.

## Area

Frontend, integracao backend/frontend, chefia imediata e autorizacao por perfil.

## Contexto

`FE-CHEFIA-01` entregou integracao inicial da tela `/chefia-imediata` com backend real por processo informado manualmente, mas preservou fallback demonstrativo/local, dados demonstrativos e modo de consulta por ID manual.

Esta task continua a frente da chefia sem reabrir `FT-24`, que permanece resolvida quanto a `NEXT_PUBLIC_TECHNICAL_PROCESS_ID`.

## Escopo previsto

- listar processos reais atribuidos a chefia autenticada;
- remover dependencia de ID manual na jornada principal;
- remover fallback demonstrativo/local da tela operacional;
- remover mocks e `setTimeout` relacionados ao fluxo principal;
- preservar estados de loading, erro, vazio e sem permissao;
- consumir endpoints reais e manter autorizacao no backend;
- manter linguagem institucional e compatibilidade visual com o shell autenticado.

## Fora do escopo

- reabrir `FT-24`;
- criar autorizacao de negocio no frontend;
- implementar endpoints backend sem task propria;
- alterar regras juridicas, workflow, documentos ou assinaturas;
- remover demonstracoes de outras telas nao relacionadas.

## Criterios de aceite

- chefia autenticada ve lista real de processos sob sua responsabilidade;
- a tela nao exige que o usuario informe ID tecnico manualmente para iniciar a jornada principal;
- fallback demonstrativo/local nao e usado no fluxo operacional;
- estados vazio/erro/loading ficam claros e nao mascaram falha de backend;
- acesso indevido continua bloqueado pelo backend.

## Validacoes esperadas

- `npm run frontend:typecheck`;
- `npm run frontend:check`;
- validacao manual em navegador com chefia autenticada;
- `git diff --check`.

## Dependencias

- endpoint backend seguro para listagem de processos da chefia;
- `FE-PROCESS-LIST-01`, se a listagem for abstraida por perfil;
- autorizacao contextual backend adequada.

## Proxima acao

Confirmar o contrato de listagem de processos por chefia antes de remover fallback demonstrativo da jornada principal.
