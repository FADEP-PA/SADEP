# Roadmaps Operacionais — AEP-PA

## Finalidade

Esta pasta reúne os documentos operacionais de planejamento, acompanhamento e priorização prática do AEP-PA.

Ela existe para separar com clareza:

- o tracker backend;
- o roadmap frontend;
- o painel transversal de problemas do projeto.

## Documentos desta pasta

- [`backend-implementation-tracker.md`](./backend-implementation-tracker.md): governa a ordem das tasks backend, suas dependências e a task ativa autorizada.
- [`frontend-tasks-roadmap.md`](./frontend-tasks-roadmap.md): governa a evolução de telas, UX, DX e integração frontend no backlog operacional atual.
- [`problemas-atuais-do-projeto.md`](./problemas-atuais-do-projeto.md): registra problemas amplos do projeto, incluindo backend, frontend, infraestrutura, build e DX.

## Regra de convivência entre os roadmaps

- o tracker backend governa a ordem das tasks backend;
- o roadmap frontend governa a evolução operacional do frontend;
- o painel transversal registra problemas amplos do projeto;
- o painel transversal não substitui os roadmaps operacionais;
- problemas transversais só entram no tracker backend quando forem convertidos em task backend explícita;
- tasks frontend só devem ser marcadas como concluídas após validação visual e funcional, não apenas geração de código.

## Quando atualizar cada documento

- atualizar [`backend-implementation-tracker.md`](./backend-implementation-tracker.md) quando houver implementação backend aprovada, auditoria, mudança de task ativa autorizada ou consolidação operacional backend aprovada por humano;
- atualizar [`frontend-tasks-roadmap.md`](./frontend-tasks-roadmap.md) quando houver implementação frontend validada visual e funcionalmente, sem marcar conclusão apenas por geração de código;
- atualizar [`problemas-atuais-do-projeto.md`](./problemas-atuais-do-projeto.md) quando houver impacto transversal, risco relevante, impedimento amplo ou dependência estrutural que não caiba apenas em um roadmap específico.

## Regra de aprovação humana

- alterações de status devem respeitar aprovação humana;
- o agente não deve marcar task backend ou frontend como concluída sem validação adequada e confirmação humana;
- ajustes documentais de caminho, índice ou organização não autorizam mudança de status operacional.

## Relação com docs/README.md

O índice global da documentação permanece em [`../README.md`](../README.md).

Este README complementa o índice global com a organização específica dos roadmaps operacionais.
