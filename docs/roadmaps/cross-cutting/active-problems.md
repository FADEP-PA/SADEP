# Problemas Ativos Transversais

> Ultima atualizacao: 2026-06-24 (BE-CESAD-FINAL-01C — reconciliacao documental pos-implementacao).
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
- **Diretorios de feature com apenas `.gitkeep`** — `features/assinaturas-eletronicas/`, `features/auditoria-historico/`, `features/autoavaliacao/`, `features/avaliacoes/`, `features/cesad-comissao/`, `features/chefia-imediata/`, `features/documentos-oficiais/`, `features/notificacoes-ciencia/`, `features/painel-gerencial-cesad/`, `features/processo-workflow/` e `features/servidor-estagiario/` sao scaffolds sem implementacao. Qualquer trabalho nesses modulos requer contrato backend correspondente.

## Sessao / auth

Sem pendencia ativa dentro da familia `BE-ARCH-01` apos os recortes `BE-ARCH-01E5` e `BE-ARCH-01F`.

Observacao: a estrategia de producao com refresh/revogacao foi tratada incrementalmente em `BE-ARCH-01E2`, `BE-ARCH-01E3`, `BE-ARCH-01E4A`, `BE-ARCH-01E4B`, `BE-ARCH-01E4C`, `BE-ARCH-01E5` e `BE-ARCH-01F`. Novas evolucoes de auth devem nascer como tasks proprias.

## Backend / arquitetura

Sem pendencia estrutural ativa nesta categoria apos o recorte `BE-ARCH-02`. Novos contratos funcionais devem nascer como tasks proprias.

O proximo bloco de implementacao backend prioritario e `BE-HOMOLOG-01` (homologacao, notificacao e ciencia). `BE-CESAD-FINAL-01C` concluiu a ponte formal `SEND_TO_HOMOLOGATION` com o commit `a0e5b2d`.

## DX / infra

- [`DX-POSTCSS-01` — alerta de audit `postcss`/`next`](./tasks/DX-POSTCSS-01-audit-postcss-next.md): permanece como pendencia separada.
- [`DX-DB-SEED-01` — seed minimo local e checagem de banco](./tasks/DX-DB-SEED-01-local-seed-bootstrap.md): alerta operacional; `db:check` pode falhar quando o banco local existe sem seed minimo; usar `npm run backend:bootstrap` para preparar o ambiente local.
- `NOM-AEP-COOKIE-01` — **encerrado** (2026-06-29). Cookie renomeado de `aep_pa_refresh` para `sadep_refresh` em `env.validation.ts`, `.env.example`, `ci.yml` e `auth.endpoint.spec.ts`.
- [`CI-GATES-01` — definir pipeline oficial de validacao](./tasks/CI-GATES-01-validation-pipeline.md): gates locais existem e passam, mas falta pipeline oficial evidente.

## Qualidade

- `FE-TEST-01` encerrado. A expansao de cobertura e o gate oficial de qualidade continuam via `CI-GATES-01`.
