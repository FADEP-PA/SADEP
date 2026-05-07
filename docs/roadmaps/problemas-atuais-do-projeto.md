# Problemas Atuais do Projeto — Índice de Compatibilidade

## Status deste documento

Este arquivo era o painel transversal principal de problemas do projeto. Durante a modularização documental, ele passou a funcionar como índice de compatibilidade para orientar a leitura da nova estrutura modular.

O painel vivo de problemas ativos agora é [`cross-cutting/active-problems.md`](./cross-cutting/active-problems.md). Problemas resolvidos ou mitigados ficam em [`cross-cutting/resolved-problems.md`](./cross-cutting/resolved-problems.md). Candidatos a arquivamento futuro ficam em [`cross-cutting/archive-candidates.md`](./cross-cutting/archive-candidates.md).

Este índice preserva rastreabilidade para os documentos novos e legados, mas não deve mais concentrar histórico longo, evidências completas ou blocos operacionais extensos.

## Onde consultar agora

| Necessidade | Documento atual |
|---|---|
| Problemas transversais ativos | [`cross-cutting/active-problems.md`](./cross-cutting/active-problems.md) |
| Problemas transversais resolvidos | [`cross-cutting/resolved-problems.md`](./cross-cutting/resolved-problems.md) |
| Candidatos a arquivamento | [`cross-cutting/archive-candidates.md`](./cross-cutting/archive-candidates.md) |
| Roadmap backend modular | [`backend/active.md`](./backend/active.md) |
| Roadmap frontend modular | [`frontend/active.md`](./frontend/active.md) |
| Tracker backend legado | [`backend-implementation-tracker.md`](./backend-implementation-tracker.md) |
| Roadmap frontend legado | [`frontend-tasks-roadmap.md`](./frontend-tasks-roadmap.md) |

## Problemas ativos principais

### Segurança

- [`BE-SEC-03 — Fortalecer autorização contextual CESAD por processo`](./backend/tasks/BE-SEC-03-cesad-contextual-authorization.md): crítico e pendente; ver também [`cross-cutting/active-problems.md`](./cross-cutting/active-problems.md).

### Frontend / integração

- [`FE-CHEFIA-01 — Integração real da chefia imediata`](./frontend/tasks/FE-CHEFIA-01-supervisor-workspace-integration.md): ativo e parcialmente integrado; `/chefia-imediata` consome workspace real por processo informado na tela, com validacao visual concluida e fallback demonstrativo ainda ativo.

### Sessão/auth

- [`BE-ARCH-01D — Alinhar frontend de sessão`](./backend/tasks/BE-ARCH-01D-frontend-session-alignment.md): concluída/mitigada no recorte mínimo de sessão frontend; commit funcional aprovado `fix(frontend): align session invalidation`.
- `BE-ARCH-01E2`: concluída/mitigada no recorte de modelagem persistente `UserSession`; commit funcional aprovado `feat(auth): model user sessions`.
- `BE-ARCH-01E3`: concluida/mitigada no recorte backend de refresh, rotacao e logout server-side; commit funcional aprovado `feat(auth): add refresh token sessions`.
- `BE-ARCH-01E4A`: concluida/mitigada no recorte frontend inicial; access token em memoria, bootstrap via refresh, `credentials: include`, logout best-effort e correção do `401 público` em rotas públicas equivalentes; commits funcionais aprovados `feat(frontend): keep access token in memory` e `fix(frontend): normalize public auth routes`.
- `BE-ARCH-01E5`: pendente; hardening operacional de cookies/CORS/env.
- `BE-ARCH-01F`: pendente; auditoria e testes de eventos de autenticação.

### DX/infra

- [`DX-POSTCSS-01 — Audit postcss/next`](./cross-cutting/tasks/DX-POSTCSS-01-audit-postcss-next.md): alerta pendente separado do `DX-01`.
- `DX-DB-SEED-01`: alerta operacional; `db:check` pode falhar quando o banco local existe sem seed minimo, devendo ser preparado por `npm run backend:bootstrap`.
- `NOM-AEP-COOKIE-01`: alerta de nomenclatura tecnica residual; cookie default ainda usa `aep_pa_refresh` e deve ser tratado futuramente em task pequena propria, sem migracao ampla AEP -> SADEP.

## Problemas resolvidos ou mitigados

O resumo operacional dos problemas resolvidos fica em [`cross-cutting/resolved-problems.md`](./cross-cutting/resolved-problems.md).

- `DX-01`: desalinhamento local do Next resolvido operacionalmente.
- `BE-TECH-01`: configuração Prisma depreciada resolvida.
- `BE-ARCH-01B`: risco de confiar apenas no payload do token mitigado.
- `BE-ARCH-01C`: duplicação básica de contratos auth/session mitigada.
- `BE-ARCH-01D`: revalidação excessiva de sessão frontend, `401` não idempotente e falhas não-401 apagando sessão foram mitigadas no recorte mínimo.
- `BE-ARCH-01E2`: gap de modelagem persistente para refresh/revogacao mitigado com `UserSession` e migration `20260430120000_add_user_session`.
- `BE-ARCH-01E3`: gap backend de refresh, rotacao, cookie `HttpOnly` e logout server-side mitigado.
- `BE-ARCH-01E4A`: risco de access token persistido em `localStorage`/`sessionStorage` mitigado; a UX do `401 público` no bootstrap tambem foi mitigada por normalizacao de rotas públicas; retry automatico/single-flight e remocao de consumidores remanescentes foram concluidos em `BE-ARCH-01E4B/C`.
- `BE-ARCH-01E4B`: retry automatico de `401` com refresh silencioso e single-flight concluido no recorte frontend.
- `BE-ARCH-01E4C`: remocao de consumidores de `session.accessToken` concluida no recorte frontend.
- `FT-24`: dependencia frontend de `NEXT_PUBLIC_TECHNICAL_PROCESS_ID` removida no recorte identificado.
- `DOC-AUTH-STATE-01`: inconsistencia documental de `BE-ARCH-01E4B/E4C` reconciliada.
- `DOC-FT24-STATE-01`: inconsistencia documental de `FT-24` reconciliada.

## Candidatos a arquivamento futuro

Os candidatos a arquivamento futuro ficam em [`cross-cutting/archive-candidates.md`](./cross-cutting/archive-candidates.md).

O arquivamento real ocorrerá em fase posterior. Este índice não move documentos, não arquiva históricos e não remove a necessidade de preservar links, fontes de transição e rastreabilidade.

## Regras de leitura

- Problemas ativos devem ser consultados primeiro em [`cross-cutting/active-problems.md`](./cross-cutting/active-problems.md).
- Problemas resolvidos não devem ser tratados como pendências.
- Itens parcialmente resolvidos devem manter ressalva explícita.
- `/chefia-imediata` não deve ser lida como integração backend real concluída.
- `FT-24` resolvida no recorte frontend não equivale a listagem segura de processos por perfil.
- `DX-POSTCSS-01` não deve ser confundido com `DX-01`, que foi resolvido operacionalmente quanto ao ambiente local.
- `BE-ARCH-01D`, `BE-ARCH-01E2`, `BE-ARCH-01E3`, `BE-ARCH-01E4A`, `BE-ARCH-01E4B` e `BE-ARCH-01E4C` estão concluídas/mitigadas, sem encerrar `BE-ARCH-01E5`, `BE-ARCH-01F` ou a frente maior `BE-ARCH-01`.
- `BE-SEC-03` permanece crítica e pendente.

## Fora do escopo deste índice

Este índice não altera:

- status de tasks;
- implementação;
- prioridades;
- decisões de negócio;
- documentação normativa;
- histórico preservado nos arquivos legados e modulares.
