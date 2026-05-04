# BE-ARCH-01D — Alinhar frontend de sessao

## Status

Concluida / aprovada.

## Area

Backend/frontend, integracao e sessao.

## Fonte de transicao

- [`../../backend-implementation-tracker.md`](../../backend-implementation-tracker.md)
- [`../active.md`](../active.md)
- [`../../frontend-tasks-roadmap.md`](../../frontend-tasks-roadmap.md)
- [`../../problemas-atuais-do-projeto.md`](../../problemas-atuais-do-projeto.md)

## Contexto

A frente `BE-ARCH-01D` alinhou a sessao do frontend ao comportamento consolidado nas subtasks `BE-ARCH-01A`, `BE-ARCH-01B` e `BE-ARCH-01C`.

Commit funcional aprovado:

```bash
fix(frontend): align session invalidation
```

## Estado atual

Implementada, auditada e aprovada para commit.

O backend ja revalida usuario vivo em requests autenticadas e os contratos minimos de auth/session ja foram compartilhados. O frontend foi ajustado no recorte minimo de sessao, sem introduzir refresh token, cookies, revogacao ou logout server-side.

## Escopo realizado

- bootstrap de sessao sem revalidar `/auth/me` em toda troca de rota;
- consumo de `/auth/me` preservado para atualizar `session.user` com a leitura viva do usuario atual;
- tratamento de `401` centralizado no `http-client`;
- invalidacao de sessao idempotente para evitar multiplos redirects concorrentes no MVP;
- limpeza de `localStorage` e `sessionStorage` via `clearSession()`;
- preservacao de `403` como falta de permissao, sem limpar sessao;
- preservacao da sessao local em falhas nao-401 durante bootstrap/refresh;
- inclusao de `/login` como rota publica defensiva/equivalente futura;
- preservacao de `AuthSession`, `rememberMe`, contratos de auth e storage atual.

## Fora do escopo

- backend;
- contracts;
- Prisma;
- migrations;
- refresh token;
- cookies;
- revogacao;
- logout server-side;
- payload JWT;
- contrato real de `/auth/login`;
- contrato real de `/auth/me`;
- CESAD;
- workflow;
- homologacao;
- regras processuais;
- `/chefia-imediata`.

## Evidencias / referencias

- `FT-27/DX-01` regularizou o ambiente frontend com `next@15.5.15`.
- O tracker backend registra a `BE-ARCH-01D` como frente backend/frontend restrita a sessao.
- O painel transversal separa `BE-SEC-03` como problema de autorizacao contextual, nao de sessao.
- Auditoria tecnica aprovou a implementacao para commit com ressalva operacional de validacao manual em navegador.

## Evidencias da implementacao aprovada

- Bootstrap deixou de depender de `pathname`.
- `/auth/me` continua atualizando `session.user`.
- `401` foi centralizado no `http-client`.
- Invalidacao de sessao tornou-se idempotente para o MVP.
- `clearSession()` limpa `localStorage` e `sessionStorage`.
- `403` preserva a sessao e segue como falta de permissao.
- Falhas nao-401 preservam a sessao local.
- `/login` foi incluida como rota publica defensiva.

## Validacoes executadas

- `npm run typecheck --workspace @sadep/frontend` — passou.
- `npm run build --workspace @sadep/frontend` — passou.
- `npm run frontend:check` — passou.
- `git diff --check` — passou, com apenas avisos de line endings do Git.
- Busca por refresh token, cookies, revogacao e logout server-side — sem implementacao nova.
- `git diff --name-only -- docs/roadmaps` durante a implementacao funcional — vazio.

## Ressalva operacional

Validacao manual em navegador ainda e recomendada para login, logout, reload autenticado, `401` concorrente, `403` e limpeza dos storages. Essa ressalva nao bloqueou a aprovacao tecnica.

## Frentes relacionadas pendentes

- `BE-ARCH-01E4A` — concluida depois no recorte de access token em memoria e bootstrap via refresh.
- `BE-ARCH-01E4B` — retry automatico de `401` e single-flight.
- `BE-ARCH-01E4C` — remover consumidores remanescentes de `session.accessToken` e validar manualmente o fluxo.
- `BE-ARCH-01E5` — hardening operacional de cookies/CORS/env.
- `BE-ARCH-01F` — auditar e testar eventos de autenticacao.

## Proxima acao

Manter `BE-ARCH-01E4B`, `BE-ARCH-01E4C`, `BE-ARCH-01E5` e `BE-ARCH-01F` como proximas frentes pendentes da familia de autenticacao. A frente maior `BE-ARCH-01` nao deve ser tratada como totalmente concluida enquanto essas subtasks permanecerem abertas.
