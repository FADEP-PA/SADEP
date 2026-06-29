# Problemas Ativos Transversais

> Ultima atualizacao: 2026-06-29 (BE-CONTRACT-CESAD-ASSIGN-01 e scaffolds — fechamento de todas as tasks abertas).
> O indice de compatibilidade legado foi movido para [`docs/archive/roadmaps-legados/problemas-atuais-do-projeto.md`](../../../archive/roadmaps-legados/problemas-atuais-do-projeto.md).

## Seguranca

- `BE-SEC-03` — **encerrado** (2026-06-29). Revisao confirmou que os endpoints de homologacao nao requerem autorizacao CESAD contextual; guards de role sao suficientes. Todas as fatias executivas anteriores cobriram os pontos criticos. Novas integracoes futuras devem nascer como tasks proprias.
- `SEC-HARD-01` — **encerrado** (2026-06-29). Helmet com CSP por ambiente, rate limit por endpoint (10/30/20 req/min), CSRF por Origin em endpoints cookie-based, cookie `sadep_refresh` configuravel por env. `upgradeInsecureRequests` agora condicional a producao em `main.ts`.
- `SEC-LOG-PII-01` — **encerrado** (2026-06-29). E-mails ja mascarados via `maskEmail()` em `auth.service.ts`; `GlobalExceptionFilter` corrigido para logar 5xx como `error` com stack, 401/403 como `debug` e demais 4xx como `warn` sem stack.
- `BE-AUDIT-AUTH-01` — **encerrado** (2026-06-29). Modelo `AuthAuditEvent` + enum `AuthAuditEventType`; `AuthAuditService.persistAsync()` fire-and-forget; `AuthService` instrumentado em login, refresh, reuso e logout; 7 testes unitarios.

## Frontend / integracao

- `FE-CHEFIA-01` — **encerrado** (2026-06-29). Continuidade era `FE-CHEFIA-02`, concluida nesta sessao. Lista real de processos carregada ao montar; fallback demonstrativo (`DASHBOARD_ROWS`) removido. Nenhuma pendencia residual.
- `FE-PROCESS-LIST-01` — **encerrado** (2026-06-29). `GET /processes` criado no backend com filtro por perfil; servidor estagiario auto-carrega o unico processo ao montar o workspace.
- `FE-CHEFIA-02` — **encerrado** (2026-06-29). Supervisor carrega lista real de processos via API ao montar workspace; fallback demonstrativo removido; `DASHBOARD_ROWS` substituido por dados reais mapeados de `ProcessListItemRef`.
- `FE-CESAD-01` — **encerrado** (2026-06-29). Editor de parecer CESAD integrado (`CesadStageOpinionEditor`); API calls para draft e complete adicionadas; workspace auto-seleciona o primeiro processo `EM_ANALISE_CESAD` da lista. Leitura consolidada existente preservada como fallback quando parecer ja esta concluido.
- `FE-TEST-01` — **encerrado** (2026-06-29). 79 testes em 9 arquivos (01A–01I). Recortes finais: LoginPage (01G), getProcessList/getCesadStageOpinion/saveDraft/complete em processes-service (01H), CesadStageOpinionEditor (01I). Proxima expansao de qualidade via CI-GATES-01.
- **Scaffolds** — **encerrado** (2026-06-29, verificado). Nenhum `.gitkeep` remanescente; todas as rotas autenticadas (`servidor-estagiario`, `chefia-imediata`, `cesad-comissao`, `homologacao-autoridade`, `admin`, `perfil`, `processos`) possuem `page.tsx` com componentes reais ou paginas de acesso restrito.

## Sessao / auth

Sem pendencia ativa dentro da familia `BE-ARCH-01` apos os recortes `BE-ARCH-01E5` e `BE-ARCH-01F`.

Observacao: a estrategia de producao com refresh/revogacao foi tratada incrementalmente em `BE-ARCH-01E2`, `BE-ARCH-01E3`, `BE-ARCH-01E4A`, `BE-ARCH-01E4B`, `BE-ARCH-01E4C`, `BE-ARCH-01E5` e `BE-ARCH-01F`. Novas evolucoes de auth devem nascer como tasks proprias.

## Backend / arquitetura

Sem pendencia estrutural ativa nesta categoria apos o recorte `BE-ARCH-02`. Novos contratos funcionais devem nascer como tasks proprias.

- `BE-HOMOLOG-01` — **encerrado** (2026-06-29, verificado). `HomologationService` + `HomologationController` implementados com endpoints `/approve`, `/return-for-regularization`, `/notify`, `/acknowledge`; `HomologationRecord` no schema; documentos gerados por fase; 17 testes em `homologation.service.spec.ts`. Bloco recursal (`ENCERRADO`, recurso por etapa) sem implementacao — task propria quando necessario.
- `FE-CESAD-READ-01` — **encerrado** (2026-06-29). Leitura consolidada operacional; pendencias registradas no doc foram resolvidas por `FE-CESAD-01` e `FE-PROCESS-LIST-01`. Parecer conclusivo final aguarda frontend separado apos evolucao de `BE-HOMOLOG-01`.
- `BE-CONTRACT-CESAD-ASSIGN-01` — **encerrado** (2026-06-29) sem implementacao. Criterio condicional (consumo frontend de `CesadStageAssignmentStatus`) nao foi atingido. Supersessao ja tratada por `SUPERSEDE_CESAD_STAGE_ASSIGNMENT`.

## DX / infra

- `DX-POSTCSS-01` — **encerrado** (2026-06-29). `qs` corrigido via `npm audit fix`; `next` atualizado para `15.5.19`. `postcss` via `next` e `multer` via `@nestjs/platform-express` nao tem fix sem breaking change — monitorar Next.js 16+ e NestJS.
- `DX-DB-SEED-01` — **encerrado** (2026-06-29). `local-setup.md` atualizado: PostgreSQL via Docker documentado, referencias a SQLite removidas, `DATABASE_URL` explicitada, bootstrap atualizado para `prisma migrate deploy`.
- `NOM-AEP-COOKIE-01` — **encerrado** (2026-06-29). Cookie renomeado de `aep_pa_refresh` para `sadep_refresh`.
- `CI-GATES-01` — **encerrado** (2026-06-29). Gates de `git diff --check`, `prisma validate` e `frontend:copy-check` adicionados ao `ci.yml`.

## Qualidade

- `FE-TEST-01` encerrado. A expansao de cobertura e o gate oficial de qualidade continuam via `CI-GATES-01`.
