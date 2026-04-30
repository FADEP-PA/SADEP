# Backend Implementation Tracker — Índice de Compatibilidade

## Status deste documento

Este arquivo era o tracker backend principal do AEP-PA. Durante a modularização documental, ele passou a funcionar como índice de compatibilidade para orientar a leitura da nova estrutura modular do roadmap backend.

O painel backend ativo agora é [`backend/active.md`](./backend/active.md). Itens backend resolvidos ficam em [`backend/resolved.md`](./backend/resolved.md). As principais frentes backend ativas ou pendentes possuem arquivos próprios em [`backend/tasks/`](./backend/tasks/).

O histórico detalhado anterior foi resumido na nova estrutura modular. Este índice preserva rastreabilidade, mas não deve mais concentrar blocos longos de histórico, evidências extensas ou instruções operacionais completas.

## Onde consultar agora

| Necessidade | Documento atual |
|---|---|
| Painel backend ativo | [`backend/active.md`](./backend/active.md) |
| Itens backend resolvidos | [`backend/resolved.md`](./backend/resolved.md) |
| `BE-ARCH-01D` | [`backend/tasks/BE-ARCH-01D-frontend-session-alignment.md`](./backend/tasks/BE-ARCH-01D-frontend-session-alignment.md) |
| `BE-SEC-03` | [`backend/tasks/BE-SEC-03-cesad-contextual-authorization.md`](./backend/tasks/BE-SEC-03-cesad-contextual-authorization.md) |
| `BE-ARCH-02` | [`backend/tasks/BE-ARCH-02-shared-packages.md`](./backend/tasks/BE-ARCH-02-shared-packages.md) |
| `BE-TECH-02` | [`backend/tasks/BE-TECH-02-worker-cron.md`](./backend/tasks/BE-TECH-02-worker-cron.md) |
| Problemas transversais ativos | [`cross-cutting/active-problems.md`](./cross-cutting/active-problems.md) |
| Problemas transversais resolvidos | [`cross-cutting/resolved-problems.md`](./cross-cutting/resolved-problems.md) |
| Roadmap frontend modular | [`frontend/active.md`](./frontend/active.md) |
| Roadmap frontend legado | [`frontend-tasks-roadmap.md`](./frontend-tasks-roadmap.md) |

## Frente backend concluida recente

### BE-ARCH-01E3 — Implementar refresh, rotacao e logout server-side

- **Status:** concluida / auditada / aprovada.
- **Commit funcional aprovado:** `feat(auth): add refresh token sessions`.
- **Escopo entregue:** login cria `UserSession`; refresh token opaco em cookie `HttpOnly`; persistencia apenas de `refreshTokenHash` HMAC-SHA-256; `POST /auth/refresh`; rotacao transacional; sessao anterior `ROTATED` com `replacedBySessionId`; reuso revoga sessoes ativas da familia; `POST /auth/logout` idempotente.
- **Preservado:** bearer JWT atual, frontend, contracts, Prisma schema/migrations, workflow, CESAD, permissoes e regras processuais.
- **Proxima etapa:** `BE-ARCH-01E4` — alinhar frontend para access token em memoria e refresh silencioso.

### BE-ARCH-01E2 — Modelar sessao e refresh token

- **Status:** concluida / auditada / aprovada.
- **Commit funcional aprovado:** `feat(auth): model user sessions`.
- **Escopo entregue:** `UserSession`, relacao `User -> sessions`, `refreshTokenHash` unico, `familyId`, campos de expiracao, rotacao, revogacao, uso e metadados, e migration `20260430120000_add_user_session`.
- **Fora do escopo:** refresh real, endpoints, cookies, CORS, frontend, contracts, auditoria formal, revogacao real, rotacao real e logout server-side.
- **Etapa seguinte entregue:** `BE-ARCH-01E3` implementou refresh, rotacao e logout server-side.

## Frente backend/frontend concluida recente

### [`BE-ARCH-01D — Alinhar frontend de sessão`](./backend/tasks/BE-ARCH-01D-frontend-session-alignment.md)

- **Status:** concluída / aprovada.
- **Commit funcional aprovado:** `fix(frontend): align session invalidation`.
- **Escopo entregue:** sessão frontend, bootstrap sem revalidacao por troca de rota, `/auth/me`, `401` idempotente, `403`, invalidadores e UX mínima.
- **Fora do escopo:** backend, contracts, refresh token, cookies, revogação, logout server-side, CESAD, workflow e regras processuais.
- **Ressalva:** validacao manual em navegador ainda recomendada para login, logout, reload autenticado, `401` concorrente, `403` e limpeza dos storages.

Esta frente foi implementada, auditada e aprovada no recorte minimo de sessao frontend. A frente maior `BE-ARCH-01` nao deve ser lida como totalmente concluida, pois `BE-ARCH-01E4`, `BE-ARCH-01E5` e `BE-ARCH-01F` permanecem pendentes.

## Frentes backend pendentes

- [`BE-SEC-03 — Fortalecer autorização contextual CESAD por processo`](./backend/tasks/BE-SEC-03-cesad-contextual-authorization.md): pendente crítico; não é problema de sessão, mas de autorização contextual por processo, comissão e etapa.
- [`BE-ARCH-02 — Fortalecer pacotes compartilhados do monorepo`](./backend/tasks/BE-ARCH-02-shared-packages.md): pendente; `BE-ARCH-01C` resolveu contratos mínimos de auth/session, mas não encerrou a dívida estrutural dos packages.
- [`BE-TECH-02 — Revisar worker e cron`](./backend/tasks/BE-TECH-02-worker-cron.md): pendente / arquitetura futura; decidir se haverá escopo mínimo real ou se a promessa deve sair da arquitetura imediata.
- `BE-ARCH-01E4`: pendente; alinhar frontend para access token em memoria e refresh silencioso.
- `BE-ARCH-01E5`: pendente; hardening operacional de cookies/CORS/env.
- `BE-ARCH-01F`: pendente; auditar e testar eventos de autenticação.
- `BE-FLOW-*`: backlog processual; consultar [`backend/active.md`](./backend/active.md) para o resumo atual sem detalhamento nesta fase.

## Itens backend resolvidos

O resumo operacional dos itens backend resolvidos fica em [`backend/resolved.md`](./backend/resolved.md).

Itens principais já registrados como resolvidos ou concluídos:

- `BE-TECH-01`;
- `BE-ARCH-01A`;
- `BE-ARCH-01B`;
- `BE-ARCH-01C`;
- `BE-ARCH-01E2`;
- `BE-ARCH-01E3`;
- grupos concluídos no legado: `BE-OPS-*`, `BE-QUAL-*`, `BE-SEC-01/02`, `CESAD-DOM-*`, `BE-IDENT-01` e `BE-STR-01`.

Este índice não repete o histórico completo desses itens.

## Relação com problemas transversais

- [`cross-cutting/active-problems.md`](./cross-cutting/active-problems.md) concentra problemas transversais ativos.
- [`cross-cutting/resolved-problems.md`](./cross-cutting/resolved-problems.md) concentra problemas transversais resolvidos ou mitigados.
- [`problemas-atuais-do-projeto.md`](./problemas-atuais-do-projeto.md) agora é índice de compatibilidade transversal.

Relações principais:

- `BE-SEC-03` permanece problema ativo crítico.
- `BE-ARCH-01D` foi concluida/mitigada no recorte minimo de sessao frontend.
- `BE-ARCH-01E2` foi concluida/mitigada no recorte de modelagem persistente de sessao/refresh.
- `BE-ARCH-01E3` foi concluida/mitigada no recorte backend de refresh, rotacao e logout server-side.
- `BE-TECH-01`, `BE-ARCH-01B` e `BE-ARCH-01C` aparecem como resolvidos/mitigados nos documentos transversais.
- `DX-POSTCSS-01` não é item backend, mas pode afetar a cadência frontend.

## Regras de leitura

- Consultar primeiro [`backend/active.md`](./backend/active.md) para o estado operacional backend.
- Consultar [`backend/resolved.md`](./backend/resolved.md) para itens concluídos ou resolvidos.
- Consultar [`backend/tasks/`](./backend/tasks/) para frentes ativas específicas.
- Não tratar `BE-SEC-03`, `BE-ARCH-02` ou `BE-TECH-02` como concluídas.
- Não confundir `BE-ARCH-01C` concluída com encerramento da `BE-ARCH-02`.
- Não confundir `BE-ARCH-01E3` concluida com encerramento da frente maior `BE-ARCH-01`; `BE-ARCH-01E4`, `BE-ARCH-01E5` e `BE-ARCH-01F` permanecem pendentes.
- O histórico detalhado anterior foi substituído por links de transição e resumos modulares.

## Fora do escopo deste índice

Este índice não altera:

- status de tasks;
- implementação;
- prioridades;
- decisões de negócio;
- documentação normativa;
- histórico preservado nos arquivos modulares;
- ordem futura do roadmap.
