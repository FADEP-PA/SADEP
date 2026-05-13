# Frontend — SADEP

## Finalidade

Esta pasta reúne diretrizes e referências vivas ou semivivas para o frontend do SADEP.

Ela funciona como ponto de entrada para leitura frontend sem competir com os roadmaps operacionais nem com os documentos normativos de domínio.

## Roadmap operacional

O roadmap operacional principal do frontend está em:

- [`../roadmaps/frontend-tasks-roadmap.md`](../roadmaps/frontend-tasks-roadmap.md)

Esse documento governa o backlog vivo do frontend e deve prevalecer sobre orientações temporais antigas.

## Princípios obrigatórios

- o frontend não decide regra jurídica ou processual;
- elegibilidade, bloqueios, ações disponíveis, prazos e estados devem vir do backend;
- referências visuais e documentos de apoio não substituem domínio, workflow ou roadmap operacional vivo.

## Autenticacao frontend atual

O frontend autenticado usa access token em memoria, bootstrap por `POST /auth/refresh` e refresh token em cookie `HttpOnly` emitido pelo backend.

`rememberMe` nao deve ser documentado como persistencia de sessao completa em `localStorage` ou `sessionStorage`; no recorte atual ele preserva apenas preferencia local de experiencia. Caminhos legados de storage sao limpos pelo frontend.

O retry silencioso de `401` fica centralizado no `http-client`, com single-flight para evitar refresh concorrente. Falha de refresh leva a `/sessao-expirada`; `403` permanece como falta de permissao.

## Referências arquivadas

Documentos temporais antigos foram arquivados em:

- [`../archive/frontend/`](../archive/frontend/)
- [`../archive/sprints/`](../archive/sprints/)

Em especial:

- [`../archive/frontend/frontend-roadmap-imediato-2026-04-15.md`](../archive/frontend/frontend-roadmap-imediato-2026-04-15.md)
- [`../archive/sprints/sprint-3b-frontend-flow.md`](../archive/sprints/sprint-3b-frontend-flow.md)

Essas referências podem ser consultadas como apoio histórico, mas não devem disputar prioridade com os documentos ativos.

## Regra de prevalência

Em caso de conflito, prevalecem:

1. documentos normativos e processuais do projeto;
2. [`../roadmaps/frontend-tasks-roadmap.md`](../roadmaps/frontend-tasks-roadmap.md);
3. diretrizes frontend vivas desta pasta;
4. referências históricas arquivadas.
