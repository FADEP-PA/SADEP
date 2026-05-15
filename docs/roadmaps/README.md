# Roadmaps Operacionais — SADEP

## Finalidade

Esta pasta reune os documentos operacionais de planejamento, acompanhamento e priorizacao pratica do SADEP.

A partir da DOC-R1, os roadmaps passam a ter uma estrutura modular inicial por area, sem mover nem arquivar os documentos legados.

## Estrutura modular

- [`backend/`](./backend/): visao modular do roadmap backend.
- [`frontend/`](./frontend/): visao modular do roadmap frontend.
- [`cross-cutting/`](./cross-cutting/): painel modular de problemas e frentes transversais.
- [`seguranca/`](./seguranca/): area de analise, hardening e acompanhamento de seguranca, com relatorios consolidados e tasks de hardening derivadas.

## Fontes de transicao (arquivadas em DOC-R8)

Os indices de compatibilidade legados foram movidos para `docs/archive/roadmaps-legados/` em 2026-05-15:

- [`docs/archive/roadmaps-legados/backend-implementation-tracker.md`](../../archive/roadmaps-legados/backend-implementation-tracker.md): indice do antigo tracker backend.
- [`docs/archive/roadmaps-legados/frontend-tasks-roadmap.md`](../../archive/roadmaps-legados/frontend-tasks-roadmap.md): indice do antigo roadmap frontend.
- [`docs/archive/roadmaps-legados/problemas-atuais-do-projeto.md`](../../archive/roadmaps-legados/problemas-atuais-do-projeto.md): indice do antigo painel transversal.

Os paineis modulares em `backend/active.md`, `frontend/active.md` e `cross-cutting/active-problems.md` sao agora a fonte primaria de informacao.

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
- `DOC-R6` — reconciliacao documental controlada pos-varredura global: consolidar auth/session resolvido no recorte, manter pendencias criticas ativas e criar task files estruturais.
- `DOC-R7` — atualizacao documental pos-ciclo CESAD/frontend: consolidar `BE-CESAD-AUTH-01`, `BE-CESAD-AUTH-02` e `BE-CESAD-ASSIGN-REPLACE-01` como resolvidas com ressalvas, reclassificar `BE-SEC-03` como guarda-chuva residual, atualizar auth frontend e registrar novas tasks de DX, logs, CI e testes frontend.
- `DOC-R8` — arquivamento de tasks resolvidas (backend e frontend), remocao de indices de compatibilidade legados, mapeamento de diretorios de feature com apenas scaffold, limpeza de itens de documentacao reconciliados e atualizacao dos paineis ativos para refletir o estado real do codigo em 2026-05-15.

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
- a atualizacao DOC-R6 foi autorizada como reconciliacao documental controlada, sem alteracao de codigo funcional, packages, Prisma, migrations ou configs de runtime.

## Relacao com docs/README.md

O indice global da documentacao permanece em [`../README.md`](../README.md).

Este README complementa o indice global com a organizacao especifica dos roadmaps operacionais.
