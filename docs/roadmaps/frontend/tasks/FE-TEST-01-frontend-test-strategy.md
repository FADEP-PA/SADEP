# FE-TEST-01 — Definir estrategia minima de testes frontend

## Status

Futura / melhoria de qualidade.

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

## Proxima acao

Manter como melhoria futura. Apos este recorte FE-TEST-01B, priorizar:

- ampliar cobertura para os demais estados operacionais (`ProcessNotFoundState`, `StageUnavailableState`, `MissingDocumentState`, `ReadNotReleasedState`, `InsufficientHistoryState`, `ClearState`) caso a frente de qualidade frontend ganhe nova janela;
- testar `AuthGuard` apenas quando houver decisao operacional clara sobre como simular sessao sem reabrir contratos backend;
- avaliar gate de testes no pipeline somente quando `CI-GATES-01` existir;
- nao acoplar estes testes a `FE-CHEFIA-02`, `FE-PROCESS-LIST-01` ou `FE-CESAD-01`, que continuam pendentes de backend.
