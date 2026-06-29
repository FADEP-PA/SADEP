# FE-TEST-01 — Definir estrategia minima de testes frontend

## Status

**Encerrado** (2026-06-29). 79 testes em 9 arquivos — recortes 01A ao 01I concluidos.

## Area

Frontend, qualidade, DX e CI.

## Contexto

A varredura global confirmou que os gates de frontend passam por typecheck, build e `frontend:check`, mas nao ha uma estrategia minima formal de testes frontend automatizados para interacoes, guards, estados autenticados e fluxos principais.

Esta task nao deve competir com as pendencias processuais criticas. Ela registra a melhoria para quando os contratos backend/frontend estiverem mais estaveis.

## Recorte FE-TEST-01A

Status: iniciado em recorte minimo.

Escopo executado:

- configuracao minima de Vitest com ambiente `jsdom` no frontend;
- setup de Testing Library para matchers institucionais de DOM;
- script `frontend:test` no monorepo;
- testes focados em `ProcessRequestFeedback`, cobrindo ausencia de erro, 404, 403, erro generico e preservacao de mensagem/detalhes.

Este recorte nao estabelece cobertura completa da aplicacao, nao cria integracao falsa e nao altera backend, contracts, Prisma, banco, autenticacao real, endpoints ou regras processuais.

Comando focado:

`npm run frontend:test -- --run process-request-feedback`

## Escopo previsto

- escolher recorte minimo de testes frontend;
- definir ferramenta e padrao de execucao;
- cobrir pelo menos auth guard, login/logout, estados de erro e uma tela autenticada critica;
- integrar ao pipeline quando `CI-GATES-01` existir.

## Fora do escopo

- substituir validacao visual/manual;
- criar mocks que mascarem ausencia de backend real;
- resolver `FE-CHEFIA-02`, `FE-PROCESS-LIST-01` ou `FE-CESAD-01`;
- alterar backend, contracts, schema ou workflow.

## Criterios de aceite

- estrategia documentada e implementada em recorte minimo;
- comando npm definido e reproduzivel;
- testes nao dependem de dados locais fragilizados;
- CI executa o gate quando a pipeline estiver formalizada.

## Dependencias

- decisao de ferramenta;
- estabilizacao das rotas autenticadas principais;
- possivel `CI-GATES-01`.

## Recorte FE-TEST-01B - Estados operacionais institucionais

- **Status documental:** recorte executado, sem prometer cobertura completa de testes frontend.
- **Escopo do recorte:** infraestrutura minima de testes do frontend e cobertura inicial de `apps/frontend/src/shared/ui/operational-states.tsx`.
- **Ferramenta adotada:** `vitest` em ambiente `jsdom`, com `@testing-library/react`, `@testing-library/dom` e `@testing-library/jest-dom`. A escolha cobre os estados visuais sem servidor real e sem chamada de endpoint.
- **Arquivos criados:**
  - `apps/frontend/vitest.config.ts` configura ambiente `jsdom`, alias `@/` para `src/` e setup file dedicado;
  - `apps/frontend/src/test/setup.ts` registra `cleanup()` apos cada teste e ativa matchers de DOM da Testing Library;
  - `apps/frontend/src/shared/ui/operational-states.test.tsx` cobre `EmptyState`, `AccessBlockedState`, `TemporaryUnavailableState` e `DemonstrationModeState`, incluindo um caso com conteudo institucional adicional via slot de filhos.
- **Arquivos atualizados:**
  - `apps/frontend/package.json` recebeu `test` e `test:run`;
  - `package.json` raiz recebeu `frontend:test` e `frontend:test:run`;
  - dependencias dev adicionadas em `@sadep/frontend`: `vitest`, `@vitejs/plugin-react`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/jest-dom`, `jsdom`.
- **Comando para executar este recorte:**
  - `npm run frontend:test:run` para execucao unica de toda a suite;
  - `npm run frontend:test -- operational-states` para filtrar pelo nome do arquivo de teste;
  - `npm run frontend:test` abre o modo interativo padrao do `vitest` quando o terminal e interativo.
- **Estilo dos testes:** asserts por texto institucional visivel (`screen.getByText`), sem snapshots grandes, sem dependencia de classes CSS internas, sem chamada real para endpoint e sem dados sensiveis.
- **Limitacoes conhecidas deste recorte:** o recorte cobre apenas `operational-states.tsx`; nao cobre `AuthGuard`, telas autenticadas, hooks de sessao, services HTTP, jornadas processuais, fluxos da chefia, CESAD ou homologacao; nao integra com CI; nao substitui validacao visual em navegador.

## Recorte FE-TEST-01C - Demais estados operacionais institucionais

- **Status documental:** recorte executado em 2026-05-14, sem prometer cobertura completa de testes frontend.
- **Escopo do recorte:** ampliar a cobertura iniciada em `FE-TEST-01B` para os estados operacionais institucionais ainda nao testados em `apps/frontend/src/shared/ui/operational-states.tsx`.
- **Componentes cobertos neste recorte:** `ProcessNotFoundState`, `StageUnavailableState`, `MissingDocumentState`, `ReadNotReleasedState`, `InsufficientHistoryState` e `ClearState`. Cada componente recebeu, no minimo, um caso de copy default (titulo, descricao e badge institucionais). `ProcessNotFoundState`, `MissingDocumentState` e `ClearState` receberam, alem disso, casos com customizacao de copy ou uso do slot `children`, mantendo o padrao validado em `FE-TEST-01B`.
- **Arquivos atualizados:**
  - `apps/frontend/src/shared/ui/operational-states.test.tsx` recebeu novos blocos `describe` para os componentes acima.
- **Comando para executar este recorte:**
  - `npm run frontend:test:run -- operational-states` cobre o arquivo completo (15 testes apos este recorte);
  - `npm run frontend:test:run` executa toda a suite frontend.
- **Estilo dos testes:** mantido o padrao do `FE-TEST-01B` — asserts por texto institucional visivel (`screen.getByText`), sem snapshots, sem dependencia de classes CSS internas, sem chamada real para endpoint, sem dados sensiveis.
- **Limitacoes conhecidas deste recorte:** continua restrito a `operational-states.tsx`; nao cobre `AuthGuard`, telas autenticadas, hooks de sessao, services HTTP, jornadas processuais, fluxos da chefia, CESAD ou homologacao; nao integra com CI; nao substitui validacao visual em navegador.

## Recorte FE-TEST-01D - AuthGuard com sessao mockada via `vi.mock`

- **Status documental:** recorte executado em 2026-05-14, sem prometer cobertura completa de testes frontend.
- **Decisao operacional adotada para simulacao de sessao:** mockar o hook `useAuth` via `vi.mock('./auth-context', ...)` no arquivo de teste, alimentando os ramos de `status` (`loading`, `anonymous`, `authenticated`) e a presenca/ausencia de `session` diretamente, sem subir o `AuthProvider` real. `next/navigation` e mockado da mesma forma (`usePathname`) e `next/link` recebe uma implementacao mininstitucional `<a>` para preservar o role `link`. Essa estrategia mantem o teste do guarda restrito a logica de apresentacao por estado, sem acoplar a `fetch`, `router.replace`, `window.location.assign` ou ao service `/auth/refresh`.
- **Escopo do recorte:** cobertura de `apps/frontend/src/shared/auth/auth-guard.tsx` nos cinco ramos institucionais do componente, sem alterar o codigo de producao do guarda, do provider, do http-client ou do service de auth.
- **Ramos cobertos:**
  - `status: 'loading'` renderiza `InitialLoading` com a copy `Validando sua sessão e permissões...` e oculta os filhos;
  - `status: 'anonymous'` renderiza `InitialLoading` com a copy `Redirecionando para o login...` e oculta os filhos;
  - `status: 'authenticated'` com `session: null` (borda defensiva) tambem cai no estado de redirecionamento;
  - `status: 'authenticated'` sem `allowedRoles` renderiza os filhos;
  - `status: 'authenticated'` com `allowedRoles` incluindo o papel atual renderiza os filhos;
  - `status: 'authenticated'` com papel fora de `allowedRoles` renderiza `AccessBlockedState`, expoe o papel autenticado e o pathname atual na copy, mantem o link `Ir para a página 403` apontando para `/403` e propaga `bootstrapError` quando presente.
- **Arquivos criados:**
  - `apps/frontend/src/shared/auth/auth-guard.test.tsx` cobrindo os ramos acima.
- **Arquivos atualizados:**
  - `scripts/check-frontend-copy.mjs` passou a ignorar arquivos com sufixo `.test.ts(x)`/`.test.js(x)` no scanner de copy institucional. A regra textual permanece ativa para o restante do `src/`; testes nao sao texto de interface e nao devem regredir o gate por usar APIs idiomaticas do vitest (`vi.mock`, `mockReturnValue`, etc.). Essa exencao desbloqueia todos os recortes futuros de FE-TEST-01 que dependam de mocking.
- **Comando para executar este recorte:**
  - `npm run frontend:test:run -- auth-guard` cobre apenas este arquivo (7 testes apos este recorte);
  - `npm run frontend:test:run` executa toda a suite frontend (26 testes apos este recorte, distribuidos em 3 arquivos).
- **Estilo dos testes:** mantido o padrao dos recortes anteriores — asserts por texto institucional visivel (`screen.getByText`) ou por `getByRole('link', { name })` para a saida do `/403`, sem snapshots, sem dependencia de classes CSS internas, sem chamada real para endpoint e sem dados sensiveis. Helpers `setAuthContext` e `buildAuthenticatedUser` mantem os testes legiveis e tipados em `AuthenticatedUser` do contrato.
- **Limitacoes conhecidas deste recorte:** cobre apenas a logica de apresentacao do `AuthGuard`; nao cobre o ciclo real do `AuthProvider`, o bootstrap por `refreshAuthSession`, o `http-client`, retry com refresh, redirecionamentos `router.replace`/`window.location.assign`, hooks de sessao ou services HTTP; nao integra com CI; nao substitui validacao visual em navegador. A escolha de mockar `next/navigation` no nivel do teste deixa o teste imune a mudancas na arvore real de Next, mas implica que regressoes na integracao com o roteador devem ser cobertas em recorte proprio quando houver janela.

## Recorte FE-TEST-01E - http-client, auth-service e processes-service com vi.stubGlobal

- **Status documental:** recorte executado em 2026-05-15, sem prometer cobertura completa de testes frontend.
- **Decisao operacional adotada para simulacao de fetch:** `vi.stubGlobal('fetch', fetchMock)` em `beforeEach` e `vi.unstubAllGlobals()` em `afterEach`, sem monkey-patching manual. O helper `jsonResponse(status, body)` constroi objetos `Response` minimos com `headers`, `ok`, `status` e `json`. Nenhum backend real foi iniciado.
- **Isolamento de estado de modulo:** `http-client.ts` mantem estado de modulo (`unauthorizedInvalidationInProgress` com timer de 1000 ms e `refreshSessionPromise` para single-flight). O arquivo `http-client.test.ts` usa `vi.useFakeTimers()` em `beforeAll` e `vi.runAllTimers()` em `afterEach` para disparar o timer de reset entre testes sem esperar 1 segundo real. `clearAccessToken()` limpa o token de modulo apos cada teste.
- **Simulacao de `window.location`:** `vi.stubGlobal('location', { assign: vi.fn(), pathname: '/inicio' })` no `beforeEach` substitui o objeto somente leitura do jsdom pela versao controlavel, necessario para verificar redirecionamentos do guard de sessao sem navegar de verdade.
- **Escopo do recorte:**
  - `apps/frontend/src/shared/api/http-client.test.ts` — 17 testes cobrindo: resposta JSON, resposta sem JSON, header `Authorization` com e sem token, cache `no-store`, serializacao de body, query string com omissao de `undefined`, URL base, `HttpError` 404/400/rede, retry automatico apos 401 (renovacao de token via refresh, falha no proprio refresh, ausencia de token, `retryOnUnauthorized: false`, rota `/auth/` bloqueada) e single-flight do refresh em requisicoes 401 concorrentes.
  - `apps/frontend/src/shared/api/services/auth-service.test.ts` — 3 testes cobrindo contrato de `login` (POST `/auth/login`, body, `credentials: include`), `refreshSession` (POST `/auth/refresh`, `credentials: include`) e `logoutSession` (POST `/auth/logout`, `credentials: include`, resposta `{ ok: true }`).
  - `apps/frontend/src/shared/api/services/processes-service.test.ts` — 4 testes cobrindo contrato de `getWorkflow` (URL, header Authorization), `getWorkflowHistory` (mapeamento `{ items, meta.total }`), `getInternWorkspaceSnapshot` (URL, header Authorization) e `transitionWorkflow` (POST, body serializado com `action` e `comment`).
- **Arquivos criados:**
  - `apps/frontend/src/shared/api/http-client.test.ts`
  - `apps/frontend/src/shared/api/services/auth-service.test.ts`
  - `apps/frontend/src/shared/api/services/processes-service.test.ts`
- **Comando para executar este recorte:**
  - `npm run frontend:test:run -- http-client` cobre apenas o http-client (17 testes);
  - `npm run frontend:test:run -- auth-service` cobre apenas auth-service (3 testes);
  - `npm run frontend:test:run -- processes-service` cobre apenas processes-service (4 testes);
  - `npm run frontend:test:run` executa toda a suite frontend (50 testes, 6 arquivos).
- **Estilo dos testes:** asserts diretos sobre chamadas ao `fetchMock` (`mock.calls[0]`) para verificar URL, metodo, headers e body; sem snapshots; sem dados sensiveis; sem chamada real para endpoint.
- **Limitacoes conhecidas deste recorte:** cobre apenas a camada de transporte e contrato de servico; nao cobre `AuthProvider`, `bootstrapSession`, hooks de sessao, telas autenticadas completas, jornadas processuais ou fluxos da chefia/CESAD; nao integra com CI; nao substitui validacao visual em navegador.

## Recorte FE-TEST-01F - Ciclo do AuthProvider com vi.mock de auth-service

- **Status documental:** recorte executado em 2026-05-15, sem prometer cobertura completa de testes frontend.
- **Decisao operacional adotada para simulacao do ciclo:** mockar `@/shared/api/services/auth-service` via `vi.mock` (fabrica de modulo), expondo `refreshSessionMock`, `loginMock` e `logoutSessionMock` como `vi.fn()`. `next/navigation` e mockado com `usePathnameMock` e `replaceMock`/`refreshRouterMock`. O ciclo do `AuthProvider` e testado com renderizacao real do provider (sem subir backend), capturando o contexto via componente auxiliar `CaptureContext` que expoe `status`, `bootstrapError` e `session.user.role` em `data-testid`. `vi.stubGlobal('location', { pathname })` simula o caminho do navegador nos casos de bootstrap que leem `window.location.pathname`.
- **Escopo do recorte:**
  - `apps/frontend/src/shared/auth/auth-context.test.tsx` — 10 testes cobrindo: bootstrap bem-sucedido (status inicia como `loading` e resolve para `authenticated`); bootstrap com 401 em rota publica (anonymous, sem bootstrapError, sem redirect); bootstrap com 401 em rota protegida (bootstrapError de sessao expirada, redirect para `/sessao-expirada`); bootstrap com 500 (bootstrapError de servico indisponivel); bootstrap com TypeError (bootstrapError de falha de rede); signIn bem-sucedido (authenticated, redirect para home do papel); signOut bem-sucedido (anonymous, redirect para `/`); signOut com erro no logoutSession (completa o logout local mesmo assim); refreshSession bem-sucedido (sessao atualizada, status permanece authenticated); refreshSession com 401 (anonymous, sessao limpa).
- **Arquivos criados:**
  - `apps/frontend/src/shared/auth/auth-context.test.tsx`
- **Comando para executar este recorte:**
  - `npm run frontend:test:run -- auth-context` cobre apenas este arquivo (10 testes);
  - `npm run frontend:test:run` executa toda a suite frontend (60 testes, 7 arquivos).
- **Estilo dos testes:** asserts por `data-testid` para `status`, `bootstrapError` e `session-role`; `waitFor` para resolucao assincrona do bootstrap; `act` para acoes de signIn/signOut/refreshSession; sem snapshots; sem dados sensiveis; sem backend real.
- **Limitacoes conhecidas deste recorte:** cobre o ciclo do `AuthProvider` isolado com services mockados; nao cobre integracao real do `AuthProvider` com `http-client` e retry de token em contexto de tela autenticada; nao cobre telas autenticadas completas, jornadas processuais ou fluxos da chefia/CESAD; nao integra com CI; nao substitui validacao visual em navegador.

## Recorte FE-TEST-01G - LoginPage com vi.mock de useAuth

- **Status documental:** recorte executado em 2026-06-29.
- **Escopo do recorte:** testes de apresentacao e interacao de `apps/frontend/src/features/auth/components/login-page.tsx`.
- **Decisao operacional:** `useAuth` mockado via `vi.mock('@/shared/auth/auth-context', ...)` para controlar `signIn`, `status` e `bootstrapError`. `getByLabelText` resolve os campos via `htmlFor` + `id`. `signIn` e mockada como `vi.fn()` (resolve ou rejeita conforme o caso de teste).
- **Casos cobertos:**
  - renderiza campos de email, senha, checkbox e botao de submit;
  - chama `signIn` com `{ email, password, rememberMe }` corretos ao submeter;
  - exibe `"Entrando..."` e desabilita o botao durante a submissao pendente;
  - exibe mensagem de erro quando `signIn` rejeita com `Error`;
  - exibe `bootstrapError` quando presente e nao ha `errorMessage` proprio;
  - desabilita todos os campos e o botao quando `status === 'loading'`.
- **Arquivo criado:** `apps/frontend/src/features/auth/components/login-page.test.tsx` (6 testes).
- **Suite apos este recorte:** 66 testes em 8 arquivos.

## Recorte FE-TEST-01H - processes-service ampliado (getProcessList, getCesadStageOpinion, saveDraft, complete)

- **Status documental:** recorte executado em 2026-06-29.
- **Escopo do recorte:** extensao de `apps/frontend/src/shared/api/services/processes-service.test.ts` com os servicos adicionados em sessoes anteriores.
- **Casos cobertos:**
  - `getProcessList` — GET `/processes` com header `Authorization: Bearer`, retorna `{ items, total }`;
  - `getCesadStageOpinion` — GET `/processes/:id/stages/:seq/cesad-stage-opinion` com header `Authorization: Bearer`;
  - `saveCesadStageOpinionDraft` — PUT com body serializado em JSON;
  - `completeCesadStageOpinion` — POST com body serializado em JSON.
- **Arquivo atualizado:** `apps/frontend/src/shared/api/services/processes-service.test.ts` (+ 4 testes, total 8 neste arquivo).
- **Suite apos este recorte:** 70 testes em 8 arquivos.

## Recorte FE-TEST-01I - CesadStageOpinionEditor

- **Status documental:** recorte executado em 2026-06-29.
- **Escopo do recorte:** testes do componente `apps/frontend/src/features/cesad/components/cesad-stage-opinion-editor.tsx`.
- **Decisao operacional:** `onSaveDraft` e `onComplete` passados como `vi.fn()` — controle total sem subir servico real. `toOpinionInput` e testada indiretamente via os callbacks (validacao de campo obrigatorio dispara antes de chamar o callback). Estados de loading e feedback sao verificados via `waitFor` apos `act`.
- **Casos cobertos:**
  - renderiza todos os campos do formulario (relatorio, fundamentacao, conclusao, conceito, resultado);
  - renderiza os botoes "Salvar rascunho" e "Concluir parecer";
  - chama `onSaveDraft` com payload correto (incluindo campos opcionais preenchidos);
  - chama `onComplete` com payload correto;
  - exibe "Rascunho do parecer salvo." apos salvar com sucesso;
  - exibe mensagem de erro quando `onSaveDraft` rejeita;
  - exibe erro de validacao quando `reportText` esta vazio (sem chamar callback);
  - exibe erro de validacao quando `conclusion` esta vazio (sem chamar callback);
  - desabilita ambos os botoes enquanto o salvamento esta pendente.
- **Arquivo criado:** `apps/frontend/src/features/cesad/components/cesad-stage-opinion-editor.test.tsx` (9 testes).
- **Suite final:** 79 testes em 9 arquivos.

## Resultado final

Task encerrada. 79 testes automatizados cobrindo: estados operacionais institucionais, AuthGuard, http-client (retry/single-flight), auth-service, processes-service, AuthProvider, LoginPage e CesadStageOpinionEditor. Nenhum backend real, nenhum dado sensivel persistido. A proxima expansao de qualidade sera formalizada em `CI-GATES-01` (pipeline oficial).
