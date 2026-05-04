# Frontend — Painel Ativo

Este painel resume itens frontend ativos, pendentes ou resolvidos operacionalmente. O antigo roadmap frontend permanece como indice de compatibilidade em [`../frontend-tasks-roadmap.md`](../frontend-tasks-roadmap.md).

## Ativos / pendentes

### BE-ARCH-01D — Alinhamento minimo de sessao frontend

- **Status operacional:** concluido / aprovado na frente backend/frontend de sessao.
- O frontend agora nao revalida `/auth/me` em toda troca de rota.
- `401` foi centralizado e tratado com invalidacao idempotente para o MVP.
- `403` preserva sessao e continua como falta de permissao.
- Falhas nao-401 no bootstrap/refresh nao limpam sessao indevidamente.
- Validacao manual em navegador permanece recomendada para login, logout, reload autenticado, `401` concorrente, `403` e limpeza dos storages.

### BE-ARCH-01E4A — Access token em memoria e bootstrap via refresh

- **Status operacional:** concluida / auditada / aprovada com ressalva nao bloqueante.
- **Commit funcional aprovado:** `feat(frontend): keep access token in memory`.
- O frontend agora mantem `accessToken` em memoria e deixou de persisti-lo em `localStorage` ou `sessionStorage`.
- O bootstrap da sessao passou a usar `POST /auth/refresh` e restaura a sessao em memoria quando o refresh cookie valido existe.
- Login, refresh e logout usam `credentials: include`; o logout manual chama `POST /auth/logout` em modo best-effort.
- `rememberMe` passou a ser apenas preferencia local nao sensivel.
- Atualizacao de 2026-05-04: `session.accessToken` foi removido do contexto; telas autenticadas usam o access token em memoria via cliente HTTP.
- Atualizacao de 2026-05-04: em rota publica, `401` no bootstrap de `/auth/refresh` deixa o usuario anonimo sem exibir aviso indevido de sessao expirada no login.
- Proxima acao tecnica recomendada: validacao manual completa de login, reload autenticado, refresh silencioso, `401`, `403` e logout.

### BE-ARCH-01E4B / BE-ARCH-01E4C — Refresh silencioso frontend

- **Status operacional:** `BE-ARCH-01E4B` e `BE-ARCH-01E4C` concluidas no recorte frontend.
- `BE-ARCH-01E4B` implementou retry automatico unico de `401`, single-flight contra refresh storm e protecao contra loop de refresh em rotas `/auth/*`.
- `BE-ARCH-01E4C` removeu `session.accessToken` do contexto e migrou os services/telas de processo para `useStoredAccessToken`.
- A validacao manual completa do fluxo autenticado permanece recomendada em navegador com backend local.
- `BE-ARCH-01E5` e `BE-ARCH-01F` permanecem pendentes; a frente maior `BE-ARCH-01` nao esta totalmente concluida.

### [FE-CHEFIA-01 — Integracao real da chefia imediata](./tasks/FE-CHEFIA-01-supervisor-workspace-integration.md)

- **Status operacional:** parcialmente integrada.
- `/chefia-imediata` consome o workspace real por processo informado na tela ou valor inicial de `NEXT_PUBLIC_TECHNICAL_PROCESS_ID`.
- A validacao real de backend passou com rascunho, envio, documento `READY_FOR_SIGNATURE` e assinaturas esperadas.
- A validacao visual em navegador passou na rota `/chefia-imediata` com processo local vinculado a chefia.
- A tela ainda preserva fallback demonstrativo e nao deve ser tratada como integracao backend real concluida enquanto nao houver listagem real de processos por perfil.

### [FT-24 — Reduzir dependencia de `NEXT_PUBLIC_TECHNICAL_PROCESS_ID`](./tasks/FT-24-process-selection-technical-id.md)

- **Status operacional:** concluida no recorte frontend.
- `/chefia-imediata`, `/processos` e `/servidor-estagiario` permitem consulta manual de processo.
- O codigo frontend nao consome mais `NEXT_PUBLIC_TECHNICAL_PROCESS_ID`.
- Listagem segura por perfil depende de contrato/backend futuro e nao permanece como pendencia frontend desta task.

### Backlog frontend documentado

- `FT-16` — preparar layout base do futuro parecer CESAD de etapa.
- `FT-18` — revisar consistencia textual e institucional das areas por perfil.
- `FT-19` — revisar responsividade das telas principais.
- `FT-20` — revisar consistencia visual do shell autenticado.
- `FT-21` — validar visualmente os fluxos principais com backend local.
- `FT-26` — limpar scaffolds e placeholders legados do frontend.

### FE-QUAL-01 — Testes/frontend quality gate

- Candidata futura derivada da varredura documental.
- Nao representa task formal concluida nesta fase.

## Resolvido operacionalmente

### [FT-27 / DX-01 — Reconciliar dependencias locais do frontend](./resolved.md#ft-27--dx-01--reconciliar-dependencias-locais-do-frontend)

- Resolvido operacionalmente quanto ao desalinhamento local do Next.
- O resumo operacional fica em [`resolved.md`](./resolved.md), e o historico detalhado permanece no roadmap legado ate fase posterior.
- A pendencia `postcss`/audit permanece separada e nao deve ser confundida com o `DX-01` local ja regularizado.
