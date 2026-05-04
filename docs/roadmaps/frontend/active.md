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

### BE-ARCH-01E4 — Alinhar frontend ao refresh server-side

- **Status operacional:** pendente.
- O backend agora possui refresh, rotacao e logout server-side implementados e aprovados na `BE-ARCH-01E3`.
- O frontend ainda nao consome esse fluxo e segue preservado no comportamento atual.
- A proxima task relacionada a sessao frontend deve tratar access token em memoria, `credentials: include`, refresh silencioso, single-flight contra refresh storm e logout chamando `POST /auth/logout`.

### [FE-CHEFIA-01 — Integracao real da chefia imediata](./tasks/FE-CHEFIA-01-supervisor-workspace-integration.md)

- **Status operacional:** parcialmente integrada.
- `/chefia-imediata` consome o workspace real por processo informado na tela ou valor inicial de `NEXT_PUBLIC_TECHNICAL_PROCESS_ID`.
- A validacao real de backend passou com rascunho, envio, documento `READY_FOR_SIGNATURE` e assinaturas esperadas.
- A validacao visual em navegador passou na rota `/chefia-imediata` com processo local vinculado a chefia.
- A tela ainda preserva fallback demonstrativo e nao deve ser tratada como integracao backend real concluida enquanto nao houver listagem real de processos por perfil.

### [FT-24 — Reduzir dependencia de `NEXT_PUBLIC_TECHNICAL_PROCESS_ID`](./tasks/FT-24-process-selection-technical-id.md)

- **Status operacional:** parcialmente mitigada nas telas mapeadas.
- `/chefia-imediata`, `/processos` e `/servidor-estagiario` permitem consulta manual de processo.
- `NEXT_PUBLIC_TECHNICAL_PROCESS_ID` fica centralizada como preenchimento inicial opcional de desenvolvimento, sem substituir listagem real por perfil.

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
