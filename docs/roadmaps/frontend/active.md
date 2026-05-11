# Frontend — Painel Ativo

Este painel resume itens frontend ativos, pendentes ou resolvidos operacionalmente. O antigo roadmap frontend permanece como indice de compatibilidade em [`../frontend-tasks-roadmap.md`](../frontend-tasks-roadmap.md).

## Ativos / pendentes

### FE-CHEFIA-01 — Integracao inicial da chefia imediata

- **Status operacional:** parcialmente resolvida / integracao inicial entregue.
- `/chefia-imediata` consome backend real quando um processo e informado manualmente.
- O recorte entregue nao deve ser lido como fluxo final da chefia imediata.
- Permanecem pendentes: fallback demonstrativo/local, dados demonstrativos, dependencia de ID manual e ausencia de listagem segura de processos por chefia autenticada.
- A continuidade fica registrada em [`FE-CHEFIA-02`](./tasks/FE-CHEFIA-02-supervisor-process-list-and-demo-removal.md), sem reabrir `FT-24`.

### BE-ARCH-01D — Alinhamento minimo de sessao frontend

- **Status operacional:** concluido / aprovado na frente backend/frontend de sessao.
- O frontend agora nao revalida `/auth/me` em toda troca de rota.
- `401` foi centralizado e tratado com invalidacao idempotente para o MVP.
- `403` preserva sessao e continua como falta de permissao.
- Falhas nao-401 no bootstrap/refresh nao limpam sessao indevidamente.
- Validacao manual em navegador permanece recomendada para login, logout, reload autenticado, `401` concorrente, `403` e limpeza dos storages.

### BE-ARCH-01E4A — Access token em memoria e bootstrap via refresh

- **Status operacional:** concluida / auditada / aprovada; ressalva de UX corrigida.
- **Commit funcional aprovado:** `feat(frontend): keep access token in memory`.
- **Fix funcional aprovado:** `BE-ARCH-01E4A-FIX — fix(frontend): normalize public auth routes`.
- O frontend agora mantem `accessToken` em memoria e deixou de persisti-lo em `localStorage` ou `sessionStorage`.
- O bootstrap da sessao passou a usar `POST /auth/refresh` e restaura a sessao em memoria quando o refresh cookie valido existe.
- Login, refresh e logout usam `credentials: include`; o logout manual chama `POST /auth/logout` em modo best-effort.
- `rememberMe` passou a ser apenas preferencia local nao sensivel.
- `session.accessToken` nao existe mais em `AuthSession`; consumidores remanescentes foram removidos no recorte `BE-ARCH-01E4C`.
- Atualizacao de 2026-05-04: as rotas públicas equivalentes sao normalizadas no helper de auth; `401 público` no bootstrap de `/auth/refresh` deixa o usuario anonimo sem exibir aviso indevido de sessao expirada em `/login/`, `/403/` ou `/sessao-expirada/`.
- Proxima acao tecnica recomendada fora do frontend: seguir para `BE-SEC-03` se a prioridade for seguranca CESAD contextual.

### BE-ARCH-01E4B / BE-ARCH-01E4C — Refresh silencioso frontend resolvido no recorte identificado

- **Status operacional:** `BE-ARCH-01E4B` e `BE-ARCH-01E4C` concluidas no recorte frontend.
- `BE-ARCH-01E4B` implementou retry automatico de `401`, single-flight contra refresh storm e protecao contra loop de refresh.
- O retry reutiliza o access token em memoria quando outra requisicao ja concluiu o refresh, evitando novo `POST /auth/refresh` desnecessario.
- `BE-ARCH-01E4C` removeu o caminho legado de token explicito do servico de auth e manteve chamadas autenticadas usando o access token em memoria por `useStoredAccessToken`.
- A varredura global confirmou `refreshSessionPromise` no `http-client`, ausencia de `session.accessToken` no frontend e ausencia de persistencia de `accessToken` em `localStorage`/`sessionStorage`.
- `BE-ARCH-01E5` e `BE-ARCH-01F` foram concluidas no recorte backend; a frente maior `BE-ARCH-01` pode ser lida como concluida no recorte planejado de sessao/auth.

### Backlog frontend documentado

- [`FE-CHEFIA-02` — listagem segura de processos da chefia e remocao de fallback demonstrativo](./tasks/FE-CHEFIA-02-supervisor-process-list-and-demo-removal.md).
- [`FE-PROCESS-LIST-01` — listagem segura de processos por perfil autenticado](./tasks/FE-PROCESS-LIST-01-authenticated-process-list.md).
- [`FE-CESAD-01` — integracao real das telas CESAD com processos e pareceres](./tasks/FE-CESAD-01-real-cesad-screens.md).

### FE-QUAL-01 — Testes/frontend quality gate

- Candidata futura derivada da varredura documental.
- Nao representa task formal concluida nesta fase.

## Resolvido operacionalmente

### [FT-24 — Remover dependencia de NEXT_PUBLIC_TECHNICAL_PROCESS_ID](./resolved.md#ft-24--remover-dependencia-de-next_public_technical_process_id)

- Resolvida no recorte frontend identificado.
- A ausencia de listagem segura de processos por perfil nao reabre `FT-24`; essa melhoria fica em `FE-PROCESS-LIST-01` e no recorte especifico `FE-CHEFIA-02`.

### [FT-27 / DX-01 — Reconciliar dependencias locais do frontend](./resolved.md#ft-27--dx-01--reconciliar-dependencias-locais-do-frontend)

- Resolvido operacionalmente quanto ao desalinhamento local do Next.
- O resumo operacional fica em [`resolved.md`](./resolved.md), e o historico detalhado permanece no roadmap legado ate fase posterior.
- A pendencia `postcss`/audit permanece separada e nao deve ser confundida com o `DX-01` local ja regularizado.
