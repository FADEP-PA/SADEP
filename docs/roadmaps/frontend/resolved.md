# Frontend — Itens Resolvidos

Este arquivo resume itens frontend ja concluidos ou resolvidos. O antigo roadmap frontend permanece como indice de compatibilidade em [`../frontend-tasks-roadmap.md`](../frontend-tasks-roadmap.md).

Esta separacao nao altera status de tasks, nao move documentos legados e nao arquiva historico. Ela apenas prepara a futura reducao dos roadmaps legados.

## FE-UX-01A - Estados institucionais compartilhados para areas autenticadas

- **Status documental:** concluida no recorte frontend.
- Recorte executado: primeira fatia de `FE-UX-01`, limitada a wrappers compartilhados e aplicacao em estados locais ja existentes.
- Criados `EmptyState`, `TemporaryUnavailableState` e `DemonstrationModeState` em `apps/frontend/src/shared/ui/operational-states.tsx`.
- Telas afetadas: `/processos`, `/servidor-estagiario`, `/chefia-imediata`, `/cesad-comissao` e `/homologacao-autoridade`.
- A consulta CESAD de etapa recebeu loading institucional explicito sem alterar a chamada real ja existente.
- Dados demonstrativos, fakes seguros, placeholders de input e fallbacks visuais foram preservados sem mudanca de origem.
- Nao houve alteracao de backend, Prisma, contracts, services/backend, autenticacao backend, endpoints, regras de negocio, dados demonstrativos ou lockfile.
- Limitacao conhecida: a task nao padroniza todos os estados internos de listas, tabelas, modais e formularios; isso deve seguir em `FE-UX-01B` se necessario.
- Dependencias futuras: `FE-PROCESS-LIST-01`, `FE-CHEFIA-02` e `FE-CESAD-01` continuam dependendo de backend/contracts seguros.
- Proxima task recomendada: `FE-UX-01B` para estados internos de listas/tabelas/modais ou `FE-COPY-01` para microcopy institucional.

## FE-ROADMAP-01 - Reconciliar painel ativo frontend

- **Status documental:** concluida no recorte frontend.
- `docs/roadmaps/frontend/active.md` passou a listar apenas pendencias reais do frontend, separando backlog dependente de backend/contracts dos itens ja resolvidos.
- `FE-CHEFIA-01` deixou de aparecer como item ativo; a continuidade correta permanece em `FE-CHEFIA-02`, sem reabrir `FT-24`.
- `BE-ARCH-01D`, `BE-ARCH-01E4A`, `BE-ARCH-01E4B` e `BE-ARCH-01E4C` foram mantidas como referencias resolvidas, nao como backlog ativo frontend.
- Decisao tomada: `FE-PROCESS-LIST-01`, `FE-CHEFIA-02` e `FE-CESAD-01` continuam pendentes, mas nao devem ser implementadas como frontend isolado enquanto faltarem os contratos backend correspondentes.
- Dados demonstrativos, fakes seguros, placeholders de input e fallback visual nao foram alterados nem removidos.
- Nao houve alteracao de backend, Prisma, contracts, services/backend, autenticacao backend, endpoints, codigo frontend ou lockfile.
- Limitacao conhecida: a conclusao desta task e documental; listagem real por perfil, remocao de fallback operacional da chefia e integracao real CESAD seguem dependentes de backend/contracts.
- Proxima task recomendada: aguardar contrato backend seguro para `FE-PROCESS-LIST-01` ou executar novo recorte frontend estritamente visual/documental se os contratos ainda nao estiverem disponiveis.

## FE-A11Y-01 - Acessibilidade basica do shell autenticado

- **Status documental:** concluida no recorte frontend.
- O shell autenticado recebeu link de pular para o conteudo principal, alvo explicito em `main#conteudo-principal` e rotulo acessivel no menu lateral.
- Links de navegacao e o botao de saida passaram a ter nomes acessiveis estaveis mesmo quando a sidebar esta recolhida.
- O estilo de foco do skip link foi criado em `globals.css`, mantendo a interface institucional.
- Arquivos afetados: `apps/frontend/src/shared/ui/app-shell.tsx`, `apps/frontend/src/shared/styles/globals.css` e `docs/roadmaps/frontend/tasks/FE-A11Y-01-authenticated-shell-basic-accessibility.md`.
- Dados demonstrativos, fakes seguros, placeholders de input e fallback visual foram preservados sem alteracao.
- Nao houve alteracao de backend, Prisma, contracts, services/backend, autenticacao backend, endpoints, regras de negocio, dados demonstrativos ou lockfile.
- Limitacao conhecida: a task nao substitui auditoria completa de acessibilidade por tela; componentes internos complexos ainda podem exigir recortes futuros.
- Proxima task recomendada: `FE-UX-01` para padronizar estados vazios, loading e erro nas areas autenticadas.

## FT-27 / DX-01 — Reconciliar dependencias locais do frontend

- **Status documental:** resolvida operacionalmente.
- `npm install` reconciliou o ambiente local.
- `npm ls next` passou com `next@15.5.15`.
- `frontend:check`, build e typecheck do frontend passaram usando `Next.js 15.5.15`.
- Nao houve diff versionado.
- A pendencia `postcss`/audit permanece separada em [`../cross-cutting/tasks/DX-POSTCSS-01-audit-postcss-next.md`](../cross-cutting/tasks/DX-POSTCSS-01-audit-postcss-next.md).

## FT-22 / FT-23 — DX e gates frontend

- **Status documental:** concluidas no roadmap legado.
- `FT-22` investigou a instabilidade do frontend em modo dev e consolidou o uso de limpeza de artefatos quando necessario.
- `FT-23` consolidou gates minimos de qualidade do frontend, incluindo `frontend:check`.
- A leitura de transicao permanece no indice de compatibilidade do roadmap legado.

## FT-20 — Consistencia visual do shell autenticado

- **Status documental:** concluida no recorte frontend.
- O shell autenticado passou a exibir contexto automatico da rota ativa no header.
- A sidebar passou a exibir o perfil ativo com rotulo institucional curto.
- O menu recolhido preserva acesso visual ao logout por icone.
- Dados demonstrativos, placeholders e fakes das telas foram preservados.
- Validacoes aprovadas: `npm run frontend:typecheck`, `npm run frontend:check` e `git diff --check`.

## FT-19 — Responsividade das telas principais

- **Status documental:** concluida no recorte frontend.
- A tabela demonstrativa da chefia imediata passou a virar cards rotulados em tablet/mobile.
- O header autenticado recebeu ajustes de empilhamento para telas estreitas.
- A lista de processos e o modal de avaliacoes anteriores receberam layout de coluna unica em mobile.
- Dados demonstrativos, placeholders e fakes foram preservados.
- Validacoes aprovadas: `npm run frontend:typecheck`, `npm run frontend:check` e `git diff --check`.

## FT-18 — Consistencia textual e institucional por perfil

- **Status documental:** concluida no recorte frontend.
- Textos de perfis, menus, paginas de apoio e jornadas principais foram revisados para linguagem institucional mais consistente.
- Acentuacao e termos administrativos foram padronizados em areas de servidor, chefia, CESAD, homologacao, administracao, sessao e recursos.
- Dados demonstrativos, placeholders e fakes foram preservados.
- Validacoes aprovadas: `npm run frontend:typecheck`, `npm run frontend:check` e `git diff --check`.

## FT-21 — Validacao dos fluxos principais no recorte servidor/chefia

- **Status documental:** concluida no recorte frontend focado em `/servidor-estagiario` e `/chefia-imediata`.
- A jornada da chefia foi revalidada quanto a consulta manual de processo, modo demonstrativo, linha real quando carregada e acoes condicionadas pelas capacidades do backend.
- A jornada do servidor foi revalidada e recebeu consulta manual de processo para alinhar a tela ao recorte `FT-24` sem remover o modo demonstrativo.
- O modo demonstrativo, placeholders e fakes foram preservados para apresentacao visual.
- Validacoes aprovadas: `npm run frontend:typecheck`, `npm run frontend:check` e `git diff --check`.

## FE-SERVIDOR-01 — Refinar jornada demonstrativa do servidor estagiario

- **Status documental:** concluida no recorte frontend.
- A tela `/servidor-estagiario` passou a diferenciar visualmente modo demonstrativo e processo real carregado.
- O resumo superior mostra o processo em foco, preservando a demonstracao visual quando nenhum processo real foi informado.
- A etapa atual ganhou destaque visual nos cards da jornada.
- Dados demonstrativos, placeholders e fakes foram preservados.
- Validacoes aprovadas: `npm run frontend:typecheck`, `npm run frontend:check` e `git diff --check`.

## FE-CHEFIA-01 — Integracao real da chefia imediata

- **Status documental:** parcialmente resolvida / integracao inicial entregue no recorte frontend seguro.
- `/chefia-imediata` consome o workspace real por processo informado manualmente na tela, sem depender de `NEXT_PUBLIC_TECHNICAL_PROCESS_ID`.
- A tela passou a diferenciar visualmente modo demonstrativo e processo real carregado.
- A linha real carregada ganhou destaque visual, preservando dados demonstrativos, placeholders e fakes para apresentacao.
- A validacao real anterior passou com rascunho, envio, documento `READY_FOR_SIGNATURE` e assinaturas esperadas.
- Este recorte nao conclui o fluxo final da chefia imediata: fallback demonstrativo/local, dados demonstrativos e dependencia de ID manual permanecem.
- A continuidade fica registrada em [`FE-CHEFIA-02`](./tasks/FE-CHEFIA-02-supervisor-process-list-and-demo-removal.md). A ausencia de listagem segura de processos por perfil nao reabre `FT-24`.

## FE-MOBILE-01 — Polimento mobile servidor e chefia

- **Status documental:** concluida no recorte frontend.
- `/servidor-estagiario` e `/chefia-imediata` receberam ajustes mobile de empilhamento, alinhamento e largura de acoes.
- Os cards de etapa do servidor ficaram mais legiveis em telas estreitas.
- Os blocos de modo demonstrativo/processo real foram ajustados para melhor leitura mobile.
- Dados demonstrativos, placeholders e fakes foram preservados.

## FE-DEMO-UX-01 — Refinamento visual dos modos demonstrativos

- **Status documental:** concluida no recorte frontend seguro.
- Os banners de modo demonstrativo/processo real de `/servidor-estagiario` e `/chefia-imediata` ganharam marcador visual lateral e estrutura mais estavel.
- A quebra de texto dos detalhes de modo foi reforcada para evitar estouro visual com identificadores longos de processo.
- Os cards de resumo do servidor receberam altura minima e alinhamento mais previsiveis.
- Dados demonstrativos, placeholders, fakes, fallback visual e modo demonstrativo foram preservados.
- Nao houve alteracao de backend, contracts, workflow, CESAD, homologacao, assinatura ou regras juridicas/processuais.
- Validacoes aprovadas: `npm run frontend:typecheck`, `npm run frontend:check` e `git diff --check`.

## FE-ENV-01 — Documentar variaveis de ambiente do frontend

- **Status documental:** concluida no recorte frontend operacional.
- `NEXT_PUBLIC_API_BASE_URL` foi documentada como a variavel publica que define a origin da API consumida pelo frontend.
- O comportamento local atual foi registrado: quando a variavel nao esta definida, `apps/frontend/src/shared/api/http-client.ts` usa fallback para `http://localhost:3000`.
- Homologacao e producao devem definir `NEXT_PUBLIC_API_BASE_URL` explicitamente com origin HTTPS da API institucional, sem path final, query, fragmento, credenciais ou wildcard.
- `NEXT_PUBLIC_TECHNICAL_PROCESS_ID` permanece removida e nao deve ser reintroduzida como configuracao frontend.
- Nao houve alteracao de codigo, backend, Prisma, contracts, services/backend, autenticacao backend, dados demonstrativos ou lockfile.
- Limitacao conhecida: transformar o fallback local em falha explicita de producao exige task propria de codigo, pois este recorte foi documental/operacional.

## FT-16 — Layout base do parecer CESAD de etapa

- **Status documental:** concluida no recorte frontend.
- `/cesad-comissao` recebeu um shell institucional para o futuro parecer CESAD por etapa.
- O layout cobre parecer ausente, parecer em elaboracao, parecer pronto/consolidado e modo demonstrativo.
- Dados demonstrativos seguros foram isolados em `apps/frontend/src/features/cesad/data/cesad-stage-opinion-demo.ts`.
- O componente `ReadOnlyOpinionShell` permanece sem emissao, assinatura, homologacao, persistencia ou integracao com endpoint inexistente.
- A consulta real de leitura consolidada da etapa foi preservada sem alterar backend, Prisma, contracts, autenticacao backend ou dados demonstrativos existentes.
- Limitacoes conhecidas: elaboracao real, assinatura colegiada, autorizacao contextual e remocao de fallback dependem de tasks backend e de `FE-CESAD-01`.

## FT-26 — Limpeza de scaffolds e placeholders legados

- **Status documental:** concluida no recorte frontend.
- Componentes antigos sem uso em `apps/frontend/src/features/home/components/` foram removidos.
- Textos visiveis e documentacao do frontend deixaram de tratar as telas atuais como placeholders genericos.
- CSS orfao de placeholders operacionais antigos foi removido.
- Marcador vazio na tabela da chefia foi refinado para "Nao aplicavel".
- Dados demonstrativos uteis, fakes seguros, fallbacks visuais e modos demonstrativos foram preservados.
- Nao houve alteracao de backend, Prisma, contracts, autenticacao backend, endpoints ou integracao real inexistente.

## FE-QUAL-01 — Quality gate frontend de texto e scaffolds legados

- **Status documental:** concluida no recorte frontend.
- Criado `scripts/check-frontend-copy.mjs` para varrer `apps/frontend/src` e `apps/frontend/README.md`.
- Adicionado `frontend:copy-check` na raiz e `copy-check` no workspace `@sadep/frontend`.
- `npm run frontend:check` passou a executar o gate antes de typecheck/build.
- O gate bloqueia regressao de `AEP-PA` em texto frontend atual, `Lorem ipsum`, `TODO`, `em breve`, placeholders genericos e referencias a scaffolds legados.
- Dados demonstrativos, fallbacks visuais e placeholders de input foram preservados.
- Nao houve alteracao de backend, Prisma, contracts, autenticacao backend, endpoints ou integracao real inexistente.

## BE-ARCH-01D — Alinhamento minimo de sessao frontend

- **Status documental:** concluida/aprovada na frente backend/frontend de sessao.
- **Commit funcional aprovado:** `fix(frontend): align session invalidation`.
- O frontend deixou de revalidar `/auth/me` em toda troca de rota.
- `401` foi centralizado e tratado com invalidacao idempotente para o MVP.
- `403` preserva sessao e continua como falta de permissao.
- Falhas nao-401 no bootstrap/refresh nao limpam sessao indevidamente.
- `AuthSession`, `rememberMe`, contratos de auth e storage atual foram preservados.
- Validacao manual em navegador ainda e recomendada para login, logout, reload autenticado, `401` concorrente, `403` e limpeza dos storages.

## BE-ARCH-01E4A — Access token em memoria e bootstrap via refresh

- **Status documental:** concluida / auditada / aprovada; ressalva de UX corrigida.
- **Commit funcional aprovado:** `feat(frontend): keep access token in memory`.
- **Fix funcional aprovado:** `BE-ARCH-01E4A-FIX — fix(frontend): normalize public auth routes`.
- Criou store em memoria para `accessToken`.
- Removeu a persistencia de access token em `localStorage` e `sessionStorage`.
- Alterou o bootstrap para `POST /auth/refresh`, restaurando sessao em memoria quando o refresh cookie e valido.
- Login, refresh e logout usam `credentials: include`.
- Logout manual chama `POST /auth/logout` em modo best-effort e preserva limpeza local.
- `rememberMe` virou preferencia local nao sensivel.
- `session.accessToken` foi removido do contexto; consumidores remanescentes foram tratados no recorte `BE-ARCH-01E4C`.
- O `http-client` ficou preparado para uso do token do store em memoria.
- Nao alterou backend, contracts, Prisma, migrations, workflow, CESAD, permissoes ou regras processuais.
- Validacoes aprovadas: `npm run typecheck --workspace @sadep/frontend`, `npm run build --workspace @sadep/frontend`, `npm run frontend:check` e `git diff --check`.
- Ressalva nao bloqueante tratada pelo commit `fix(frontend): normalize public auth routes`: rotas públicas equivalentes sao normalizadas e `401 público` no bootstrap de `/auth/refresh` permanece como anonimo silencioso em rota publica.
- `BE-ARCH-01E4B` e `BE-ARCH-01E4C` foram concluidas posteriormente; `BE-ARCH-01E5` e `BE-ARCH-01F` foram concluidas no recorte backend; a frente maior `BE-ARCH-01` pode ser lida como concluida no recorte planejado de sessao/auth.

## BE-ARCH-01E4B — Retry 401 com refresh silencioso

- **Status documental:** concluida no recorte frontend.
- O `http-client` faz retry automatico uma unica vez apos `401` em rotas autenticadas nao-`/auth`.
- O refresh usa single-flight por meio de promise compartilhada para evitar storm de `POST /auth/refresh`.
- Se outra requisicao ja atualizou o access token em memoria, a requisicao falhada reutiliza esse token sem disparar novo refresh.
- Rotas `/auth/*` nao entram no retry, preservando protecao contra loop de refresh.
- A varredura global confirmou `refreshSessionPromise`, `POST /auth/refresh` com `credentials: include`, preservacao de `403` como falta de permissao e ausencia de persistencia de `accessToken` em storage web.
- Permanece recomendada validacao manual ampla de UX, mas isso nao reabre a task no recorte tecnico identificado.
- `BE-ARCH-01E4C` foi concluida posteriormente; `BE-ARCH-01E5` e `BE-ARCH-01F` foram concluidas no recorte backend.

## BE-ARCH-01E4C — Remocao de consumidores de access token da sessao

- **Status documental:** concluida no recorte frontend.
- A varredura de codigo nao encontrou `session.accessToken` em uso no frontend.
- O caminho legado `getAuthenticatedUser(accessToken)` foi removido do servico de auth.
- O `http-client` deixou de aceitar token explicito em `RequestOptions`; chamadas autenticadas usam o access token em memoria via `useStoredAccessToken`.
- A validacao automatizada do fluxo frontend fica registrada pelos gates `frontend:typecheck`, `frontend:check` e `git diff --check`.
- A varredura global posterior confirmou novamente ausencia de `session.accessToken`; validacao manual ampla permanece nao bloqueante.
- `BE-ARCH-01E5` e `BE-ARCH-01F` foram concluidas no recorte backend.

## FT-24 — Remover dependencia de NEXT_PUBLIC_TECHNICAL_PROCESS_ID

- **Status documental:** resolvida no recorte frontend.
- A varredura global nao encontrou `NEXT_PUBLIC_TECHNICAL_PROCESS_ID` no codigo frontend.
- `/chefia-imediata`, `/processos` e `/servidor-estagiario` dependem de consulta manual/selecao explicita na UI, sem preenchimento por env tecnica.
- A ausencia de listagem segura por perfil nao reabre `FT-24`; deve ser tratada em task futura propria, alinhada a contrato/backend.
- `FE-CHEFIA-01` permanece parcial no recorte de fluxo final; a continuidade fica em [`FE-CHEFIA-02`](./tasks/FE-CHEFIA-02-supervisor-process-list-and-demo-removal.md).

## FT-17 — Area de homologacao

- **Status documental:** concluida no roadmap legado como painel preparado.
- A area `/homologacao-autoridade` foi preparada como workspace/painel para expansao.
- Esta conclusao nao deve ser lida como fluxo funcional backend completo de homologacao.

## FT-01 a FT-15 e FT-25

- `FT-01` a `FT-15` aparecem como concluidas no roadmap legado e validadas por gates frontend registrados.
- `FT-25` concluiu a triagem de vulnerabilidades/dependencias que afetam o frontend.
- O alerta residual `next`/`postcss` permanece pendente e separado em `DX-POSTCSS-01`.

## Cuidado especial com FT-05

- `FT-05` pode ser preservada como historico de refinamento visual/estrutural anterior da jornada da chefia.
- Ela nao deve ser interpretada como integracao backend real da chefia.
- A integracao backend plena de `/chefia-imediata` com listagem segura por perfil continua fora do recorte arquivado de [`FE-CHEFIA-01`](../../archive/frontend/tasks/FE-CHEFIA-01-supervisor-workspace-integration.md).

Para a leitura de transicao e links modulares, consultar [`../frontend-tasks-roadmap.md`](../frontend-tasks-roadmap.md).
