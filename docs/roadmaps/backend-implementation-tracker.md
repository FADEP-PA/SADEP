# Backend Implementation Tracker — Índice de Compatibilidade

## Status deste documento

Este arquivo era o tracker backend principal do SADEP. Durante a modularização documental, ele passou a funcionar como índice de compatibilidade para orientar a leitura da nova estrutura modular do roadmap backend.

O painel backend ativo agora é [`backend/active.md`](./backend/active.md). Itens backend resolvidos ficam em [`backend/resolved.md`](./backend/resolved.md). As principais frentes backend ativas ou pendentes possuem arquivos próprios em [`backend/tasks/`](./backend/tasks/).

O histórico detalhado anterior foi resumido na nova estrutura modular. Este índice preserva rastreabilidade, mas não deve mais concentrar blocos longos de histórico, evidências extensas ou instruções operacionais completas.

## Onde consultar agora

| Necessidade | Documento atual |
|---|---|
| Painel backend ativo | [`backend/active.md`](./backend/active.md) |
| Itens backend resolvidos | [`backend/resolved.md`](./backend/resolved.md) |
| `BE-ARCH-01D` | [`backend/tasks/BE-ARCH-01D-frontend-session-alignment.md`](./backend/tasks/BE-ARCH-01D-frontend-session-alignment.md) |
| `BE-SEC-03` | [`backend/tasks/BE-SEC-03-cesad-contextual-authorization.md`](./backend/tasks/BE-SEC-03-cesad-contextual-authorization.md) |
| `BE-CESAD-AUTH-01` | [`backend/tasks/BE-CESAD-AUTH-01-apply-contextual-authorization.md`](./backend/tasks/BE-CESAD-AUTH-01-apply-contextual-authorization.md) |
| `BE-DOC-CESAD-SIGN-01` | [`backend/tasks/BE-DOC-CESAD-SIGN-01-collegiate-opinion-signatures.md`](./backend/tasks/BE-DOC-CESAD-SIGN-01-collegiate-opinion-signatures.md) |
| `BE-FLOW-4STAGE-01` | [`backend/tasks/BE-FLOW-4STAGE-01-four-stage-progression.md`](./backend/tasks/BE-FLOW-4STAGE-01-four-stage-progression.md) |
| `BE-CESAD-FINAL-01` | [`backend/tasks/BE-CESAD-FINAL-01-final-opinion.md`](./backend/tasks/BE-CESAD-FINAL-01-final-opinion.md) |
| `BE-HOMOLOG-01` | [`backend/tasks/BE-HOMOLOG-01-homologation-notification-acknowledgement.md`](./backend/tasks/BE-HOMOLOG-01-homologation-notification-acknowledgement.md) |
| `BE-AUDIT-AUTH-01` | [`backend/tasks/BE-AUDIT-AUTH-01-persisted-auth-audit.md`](./backend/tasks/BE-AUDIT-AUTH-01-persisted-auth-audit.md) |
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
- **Etapa frontend seguinte:** `BE-ARCH-01E4A`, `BE-ARCH-01E4B` e `BE-ARCH-01E4C` foram entregues depois com access token em memoria, bootstrap via refresh, retry silencioso e remocao de caminhos legados de token; `BE-ARCH-01F` foi concluida no recorte de eventos estruturados de auth; `BE-ARCH-01E5` foi concluida no recorte de hardening operacional de cookies/CORS/env.

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

Esta frente foi implementada, auditada e aprovada no recorte minimo de sessao frontend. A frente maior `BE-ARCH-01` pode ser lida como concluida no recorte planejado de sessao/auth.

## Frentes backend pendentes e relacionadas

- [`BE-SEC-03 — Fortalecer autorização contextual CESAD por processo`](./backend/tasks/BE-SEC-03-cesad-contextual-authorization.md): pendente crítico; não é problema de sessão, mas de autorização contextual por processo, comissão e etapa.
- [`BE-CESAD-AUTH-01 — Aplicar autorizacao contextual CESAD aos endpoints sensiveis`](./backend/tasks/BE-CESAD-AUTH-01-apply-contextual-authorization.md): subtask executiva de `BE-SEC-03`, sem encerrar o guarda-chuva.
- [`BE-DOC-CESAD-SIGN-01 — Modelar e validar assinatura colegiada do parecer CESAD`](./backend/tasks/BE-DOC-CESAD-SIGN-01-collegiate-opinion-signatures.md): pendente alta de documentos/assinaturas.
- [`BE-FLOW-4STAGE-01 — Estruturar progressao formal das quatro etapas avaliativas`](./backend/tasks/BE-FLOW-4STAGE-01-four-stage-progression.md): pendente alta de workflow Caso 2.
- [`BE-CESAD-FINAL-01 — Modelar parecer conclusivo final da CESAD`](./backend/tasks/BE-CESAD-FINAL-01-final-opinion.md): pendente alta e pre-condicao de homologacao.
- [`BE-HOMOLOG-01 — Modelar fluxo de homologacao, notificacao e ciencia`](./backend/tasks/BE-HOMOLOG-01-homologation-notification-acknowledgement.md): pendente futura dependente de parecer final.
- [`BE-AUDIT-AUTH-01 — Auditoria persistida de eventos de autenticacao`](./backend/tasks/BE-AUDIT-AUTH-01-persisted-auth-audit.md): melhoria futura separada de `BE-ARCH-01F`.
- [`BE-ARCH-02 — Fortalecer pacotes compartilhados do monorepo`](./backend/tasks/BE-ARCH-02-shared-packages.md): concluida no recorte estrutural de `@sadep/contracts`; `dist/` passou a ser entrypoint de consumo e os consumidores constroem contracts antes dos gates.
- [`BE-TECH-02 — Revisar worker e cron`](./backend/tasks/BE-TECH-02-worker-cron.md): concluida no recorte de varredura tecnica; `apps/worker` e `apps/cron` permanecem como estrutura reservada sem execucao no MVP.
- [`BE-ARCH-01E5 — Hardening operacional de cookies/CORS/env`](./backend/tasks/BE-ARCH-01E5-cookie-cors-env-hardening.md): concluida no recorte backend de validacao operacional de ambiente.
- [`BE-ARCH-01F — Auditar e testar eventos de autenticação`](./backend/tasks/BE-ARCH-01F-auth-event-audit.md): concluida no recorte backend de eventos estruturados de auth e testes unitarios.
- `BE-FLOW-*`: backlog processual; consultar [`backend/active.md`](./backend/active.md) para o resumo atual sem detalhamento nesta fase.

Frentes relacionadas ja concluidas no recorte identificado:

- `BE-ARCH-01E4A`: concluida/aprovada/mitigada; access token em memoria, bootstrap via refresh, `credentials: include` e logout best-effort no frontend; commit `feat(frontend): keep access token in memory`.
- `BE-ARCH-01E4B`: concluida no recorte frontend; retry automatico de `401` e single-flight.
- `BE-ARCH-01E4C`: concluida no recorte frontend; removeu consumidores/caminhos legados de `session.accessToken` e validou por gates frontend.

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
- `BE-ARCH-01E4A` foi concluida/mitigada no recorte frontend inicial de access token em memoria e bootstrap via refresh.
- `BE-ARCH-01E4B` foi concluida/mitigada no recorte frontend de retry automatico e single-flight.
- `BE-ARCH-01E4C` foi concluida/mitigada no recorte frontend de remocao de consumidores de `session.accessToken`.
- `BE-TECH-01`, `BE-ARCH-01B` e `BE-ARCH-01C` aparecem como resolvidos/mitigados nos documentos transversais.
- `DX-POSTCSS-01` não é item backend, mas pode afetar a cadência frontend.

## Regras de leitura

- Consultar primeiro [`backend/active.md`](./backend/active.md) para o estado operacional backend.
- Consultar [`backend/resolved.md`](./backend/resolved.md) para itens concluídos ou resolvidos.
- Consultar [`backend/tasks/`](./backend/tasks/) para frentes ativas específicas.
- Não tratar `BE-SEC-03` como concluída.
- Não confundir `BE-ARCH-02` concluida no recorte estrutural com novos contratos funcionais de endpoint, schemas de validacao ou eventos de dominio.
- `BE-ARCH-01E3`, `BE-ARCH-01E4A`, `BE-ARCH-01E4B`, `BE-ARCH-01E4C`, `BE-ARCH-01E5` e `BE-ARCH-01F` estao concluidas no recorte planejado de sessao/auth.
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
