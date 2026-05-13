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
| `SEC-HARD-01` | [`cross-cutting/tasks/SEC-HARD-01-http-rate-limit-csrf.md`](./cross-cutting/tasks/SEC-HARD-01-http-rate-limit-csrf.md) |
| `SEC-LOG-PII-01` | [`cross-cutting/tasks/SEC-LOG-PII-01-auth-logs-pii-noise.md`](./cross-cutting/tasks/SEC-LOG-PII-01-auth-logs-pii-noise.md) |
| `DX-DB-SEED-01` | [`cross-cutting/tasks/DX-DB-SEED-01-local-seed-bootstrap.md`](./cross-cutting/tasks/DX-DB-SEED-01-local-seed-bootstrap.md) |
| `DX-FE-ENV-EXAMPLE-01` | [`cross-cutting/tasks/DX-FE-ENV-EXAMPLE-01-frontend-env-example.md`](./cross-cutting/tasks/DX-FE-ENV-EXAMPLE-01-frontend-env-example.md) |
| `CI-GATES-01` | [`cross-cutting/tasks/CI-GATES-01-validation-pipeline.md`](./cross-cutting/tasks/CI-GATES-01-validation-pipeline.md) |
| `NOM-AEP-COOKIE-01` | [`cross-cutting/tasks/NOM-AEP-COOKIE-01-refresh-cookie-name.md`](./cross-cutting/tasks/NOM-AEP-COOKIE-01-refresh-cookie-name.md) |
| Tracker backend legado | [`backend-implementation-tracker.md`](./backend-implementation-tracker.md) |
| Roadmap frontend legado | [`frontend-tasks-roadmap.md`](./frontend-tasks-roadmap.md) |

## Problemas ativos principais

### Segurança

- [`BE-SEC-03 — Guarda-chuva residual / integracao futura de autorizacao contextual CESAD`](./backend/tasks/BE-SEC-03-cesad-contextual-authorization.md): permanece aberto como guarda-chuva residual; o risco critico imediato foi reduzido por `BE-CESAD-AUTH-01`, `BE-CESAD-AUTH-02`, `BE-CESAD-ASSIGN-REPLACE-01` e `BE-DOC-CESAD-SIGN-01`. Ver também [`cross-cutting/active-problems.md`](./cross-cutting/active-problems.md).
- [`SEC-HARD-01 — Hardening adicional de seguranca HTTP, rate limit e CSRF`](./cross-cutting/tasks/SEC-HARD-01-http-rate-limit-csrf.md): melhoria futura separada de `BE-ARCH-01E5`.
- [`SEC-LOG-PII-01 — Reduzir PII e ruido em logs`](./cross-cutting/tasks/SEC-LOG-PII-01-auth-logs-pii-noise.md): subtarefa de hardening para logs de auth e filtro global.
- [`BE-AUDIT-AUTH-01 — Auditoria persistida de eventos de autenticacao`](./backend/tasks/BE-AUDIT-AUTH-01-persisted-auth-audit.md): melhoria futura separada de `BE-ARCH-01F`.

### Sessão/auth

- [`BE-ARCH-01D — Alinhar frontend de sessão`](./backend/tasks/BE-ARCH-01D-frontend-session-alignment.md): concluída/mitigada no recorte mínimo de sessão frontend; commit funcional aprovado `fix(frontend): align session invalidation`.
- `BE-ARCH-01E2`: concluída/mitigada no recorte de modelagem persistente `UserSession`; commit funcional aprovado `feat(auth): model user sessions`.
- `BE-ARCH-01E3`: concluida/mitigada no recorte backend de refresh, rotacao e logout server-side; commit funcional aprovado `feat(auth): add refresh token sessions`.
- `BE-ARCH-01E4A`: concluida/mitigada no recorte frontend inicial; access token em memoria, bootstrap via refresh, `credentials: include`, logout best-effort e correção do `401 público` em rotas públicas equivalentes; commits funcionais aprovados `feat(frontend): keep access token in memory` e `fix(frontend): normalize public auth routes`.
- `BE-ARCH-01E5`: concluida/mitigada no recorte backend de hardening operacional de cookies/CORS/env.
- `BE-ARCH-01F`: concluida/mitigada no recorte backend de eventos estruturados de auth e testes unitarios.

### DX/infra

- [`DX-POSTCSS-01 — Audit postcss/next`](./cross-cutting/tasks/DX-POSTCSS-01-audit-postcss-next.md): alerta pendente separado do `DX-01`.
- [`DX-DB-SEED-01`](./cross-cutting/tasks/DX-DB-SEED-01-local-seed-bootstrap.md): alerta operacional; `db:check` pode falhar quando o banco local existe sem seed minimo, devendo ser preparado por `npm run backend:bootstrap`.
- [`DX-FE-ENV-EXAMPLE-01`](./cross-cutting/tasks/DX-FE-ENV-EXAMPLE-01-frontend-env-example.md): criar `.env.example` do frontend e alinhar setup/deploy para `NEXT_PUBLIC_API_BASE_URL`.
- [`CI-GATES-01`](./cross-cutting/tasks/CI-GATES-01-validation-pipeline.md): formalizar pipeline oficial para gates que ja passam localmente.
- [`NOM-AEP-COOKIE-01`](./cross-cutting/tasks/NOM-AEP-COOKIE-01-refresh-cookie-name.md): alerta de nomenclatura tecnica residual; cookie default ainda usa `aep_pa_refresh` e deve ser tratado futuramente em task pequena propria, sem migracao ampla AEP -> SADEP.

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
- `BE-ARCH-01E5`: hardening operacional de cookies/CORS/env concluido no recorte backend.
- `BE-ARCH-01F`: eventos estruturados de auth e testes unitarios concluidos no recorte backend.
- `BE-DOC-CESAD-SIGN-01`: assinatura colegiada do parecer CESAD de etapa concluida no recorte backend/documental, com documento `CESAD_OPINION` stage-bound, assinaturas derivadas de expected signers e bloqueio de `ISSUE_CESAD_OPINION` ate completude.
- `FT-24`: dependencia frontend de `NEXT_PUBLIC_TECHNICAL_PROCESS_ID` removida no recorte identificado.
- `FE-CHEFIA-01`: integracao inicial da chefia imediata entregue no recorte frontend seguro, mas permanece parcial como fluxo final; listagem segura por perfil segue por `FE-CHEFIA-02` e/ou `FE-PROCESS-LIST-01`.
- `DOC-AUTH-STATE-01`: inconsistencia documental de `BE-ARCH-01E4B/E4C` reconciliada.
- `DOC-FT24-STATE-01`: inconsistencia documental de `FT-24` reconciliada.

## Candidatos a arquivamento futuro

Os candidatos a arquivamento futuro ficam em [`cross-cutting/archive-candidates.md`](./cross-cutting/archive-candidates.md).

O arquivamento real ocorrerá em fase posterior. Este índice não move documentos, não arquiva históricos e não remove a necessidade de preservar links, fontes de transição e rastreabilidade.

## Regras de leitura

- Problemas ativos devem ser consultados primeiro em [`cross-cutting/active-problems.md`](./cross-cutting/active-problems.md).
- Problemas resolvidos não devem ser tratados como pendências.
- Itens parcialmente resolvidos devem manter ressalva explícita.
- `/chefia-imediata` não deve ser lida como integração backend plena com listagem segura por perfil concluída.
- `FE-CHEFIA-01` não deve ser tratada como fluxo final concluído enquanto houver fallback demonstrativo/local, dados demonstrativos ou dependencia de ID manual.
- `FT-24` resolvida no recorte frontend não equivale a listagem segura de processos por perfil.
- `DX-POSTCSS-01` não deve ser confundido com `DX-01`, que foi resolvido operacionalmente quanto ao ambiente local.
- `BE-ARCH-01D`, `BE-ARCH-01E2`, `BE-ARCH-01E3`, `BE-ARCH-01E4A`, `BE-ARCH-01E4B`, `BE-ARCH-01E4C`, `BE-ARCH-01E5` e `BE-ARCH-01F` estão concluídas/mitigadas no recorte planejado de sessão/auth.
- `BE-SEC-03` permanece aberto como guarda-chuva residual / integracao futura, nao como lacuna imediata de autorizacao contextual basica, assignment, supersessao ou assinatura colegiada do parecer CESAD de etapa.

## Fora do escopo deste índice

Este índice não altera:

- status de tasks;
- implementação;
- prioridades;
- decisões de negócio;
- documentação normativa;
- histórico preservado nos arquivos legados e modulares.
