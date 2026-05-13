# FE-TEST-01 — Definir estrategia minima de testes frontend

## Status

Futura / melhoria de qualidade.

## Area

Frontend, qualidade, DX e CI.

## Contexto

A varredura global confirmou que os gates de frontend passam por typecheck, build e `frontend:check`, mas nao ha uma estrategia minima formal de testes frontend automatizados para interacoes, guards, estados autenticados e fluxos principais.

Esta task nao deve competir com as pendencias processuais criticas. Ela registra a melhoria para quando os contratos backend/frontend estiverem mais estaveis.

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

## Proxima acao

Manter como melhoria futura. Priorizar antes as integracoes reais de processos, chefia e CESAD quando os contratos backend estiverem disponiveis.
