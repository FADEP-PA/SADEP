# Roadmaps Operacionais — AEP-PA

## Finalidade

Esta pasta reune os documentos operacionais de planejamento, acompanhamento e priorizacao pratica do AEP-PA.

A partir da DOC-R1, os roadmaps passam a ter uma estrutura modular inicial por area, sem mover nem arquivar os documentos legados.

## Estrutura modular

- [`backend/`](./backend/): visao modular do roadmap backend.
- [`frontend/`](./frontend/): visao modular do roadmap frontend.
- [`cross-cutting/`](./cross-cutting/): painel modular de problemas e frentes transversais.

## Fontes de transicao

Os documentos abaixo continuam existindo como indices de compatibilidade durante a modularizacao:

- [`backend-implementation-tracker.md`](./backend-implementation-tracker.md): indice de compatibilidade do antigo tracker backend.
- [`frontend-tasks-roadmap.md`](./frontend-tasks-roadmap.md): indice de compatibilidade do antigo roadmap frontend.
- [`problemas-atuais-do-projeto.md`](./problemas-atuais-do-projeto.md): indice de compatibilidade do antigo painel transversal.

## Regra de convivencia entre os roadmaps

- [`backend/active.md`](./backend/active.md) resume o estado operacional backend;
- [`frontend/active.md`](./frontend/active.md) resume o estado operacional frontend;
- [`cross-cutting/active-problems.md`](./cross-cutting/active-problems.md) resume problemas transversais ativos;
- os indices legados reduzidos nao substituem os paineis modulares;
- problemas transversais so entram no tracker backend quando forem convertidos em task backend explicita;
- tasks frontend so devem ser marcadas como concluidas apos validacao visual e funcional, nao apenas geracao de codigo.

## Fases da modularizacao

- `DOC-R1` — criou a estrutura modular e indices.
- `DOC-R2` — cria arquivos proprios para itens ativos principais.
- `DOC-R3` — separa resolvidos e candidatos a archive, sem mover arquivos legados nem arquivar historicos.
- `DOC-R4` — reduzir arquivos legados e atualizar links.
- `DOC-R5` — validar documentacao final.

## Criterios de ciclo de vida

Criar arquivo de task quando houver escopo proprio, implementacao futura, validacoes proprias, risco relevante ou historico grande demais para permanecer somente em indice.

Manter em `active.md` quando o item exige acao, esta planejado, pausado, retomavel ou bloqueia priorizacao.

Mover para archive somente quando o item estiver implementado, validado, documentado, sem acao imediata e preservavel por link historico.

Criar ADR quando houver decisao duravel de arquitetura, impacto em backend, frontend, contracts ou workflow, e necessidade de preservar a decisao fora do roadmap operacional.

## Quando atualizar cada documento

- atualizar [`backend-implementation-tracker.md`](./backend-implementation-tracker.md) quando houver implementacao backend aprovada, auditoria, mudanca de task ativa autorizada ou consolidacao operacional backend aprovada por humano;
- atualizar [`frontend-tasks-roadmap.md`](./frontend-tasks-roadmap.md) quando houver implementacao frontend validada visual e funcionalmente, sem marcar conclusao apenas por geracao de codigo;
- atualizar [`problemas-atuais-do-projeto.md`](./problemas-atuais-do-projeto.md) quando houver impacto transversal, risco relevante, impedimento amplo ou dependencia estrutural que nao caiba apenas em um roadmap especifico.

## Regra de aprovacao humana

- alteracoes de status devem respeitar aprovacao humana;
- o agente nao deve marcar task backend ou frontend como concluida sem validacao adequada e confirmacao humana;
- ajustes documentais de caminho, indice ou organizacao nao autorizam mudanca de status operacional.

## Relacao com docs/README.md

O indice global da documentacao permanece em [`../README.md`](../README.md).

Este README complementa o indice global com a organizacao especifica dos roadmaps operacionais.
