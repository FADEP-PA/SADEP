# BE-SEC-03 — Fortalecer autorizacao contextual CESAD por processo

## Status

Pendente critico.

## Area

Backend, seguranca e autorizacao.

## Fonte de transicao

- [`../../backend-implementation-tracker.md`](../../backend-implementation-tracker.md)
- [`../active.md`](../active.md)
- [`../../problemas-atuais-do-projeto.md`](../../problemas-atuais-do-projeto.md)

## Contexto

A varredura de autenticacao identificou que endpoints CESAD sensiveis podem depender de role global combinada com status. Isso nao e problema de sessao, mas de autorizacao contextual por processo, com risco juridico e operacional.

## Estado atual

O problema esta registrado como frente separada da familia `BE-ARCH-01`. A primeira fatia executiva, `BE-CESAD-AUTH-01`, foi concluida, auditada e aprovada com ressalvas no commit `211a4d4 feat(backend): apply contextual CESAD authorization`.

Com esse recorte, os endpoints sensiveis atuais deixaram de depender apenas de role global/status e passaram a usar `CesadContextAuthorizationService` para workflow, historico, transicoes CESAD sensiveis, leitura consolidada e parecer CESAD de etapa.

A segunda fatia executiva, `BE-CESAD-AUTH-02`, foi concluida, auditada e aprovada com ressalvas no commit `8ffd804 feat(backend): persist CESAD stage assignments`.

Com esse recorte, o backend passou a persistir o vinculo formal entre comissao CESAD, processo e etapa por meio de `CesadStageAssignment`, conforme a [`ADR-003`](../../../architecture/adr/adr-003-cesad-stage-assignment.md). A assignment ativa da etapa e criada ou reutilizada em `SEND_TO_CESAD`, a autorizacao contextual CESAD passou a consultar esse vinculo persistido, e `CesadStageOpinionExpectedSigner` passou a derivar a comissao da assignment da etapa.

`BE-SEC-03` permanece pendente como guarda-chuva estrutural, mas nao mais pela ausencia do vinculo persistido basico comissao-processo-etapa. As pendencias remanescentes sao refinamentos futuros: reatribuicao/supersessao formal de assignment, integracao com assinatura colegiada, integracao com workflow completo de quatro etapas e regras futuras de parecer final quando aplicavel.

## Escopo previsto

- preservar a protecao ja aplicada por `BE-CESAD-AUTH-01`;
- preservar o vinculo persistido comissao-processo-etapa entregue por `BE-CESAD-AUTH-02`;
- refinar a politica para reatribuicao/supersessao formal de assignment, sem troca automatica invisivel;
- integrar a autorizacao contextual com assinatura colegiada do parecer CESAD;
- integrar a autorizacao contextual com pareceres futuros e workflow completo;
- manter testes positivos e negativos de autorizacao a cada novo ponto sensivel.

## Fora do escopo

- refresh token;
- frontend;
- UX;
- assinatura;
- parecer final;
- homologacao;
- refactor amplo de workflow.

## Evidencias / referencias

- O indice backend e o painel ativo registram `BE-SEC-03` como pendente critico.
- O painel transversal registra o achado CESAD separadamente da estrategia de sessao.
- `BE-CESAD-AUTH-01` concluiu a aplicacao executiva da autorizacao contextual aos endpoints sensiveis atuais, sem substituir nem encerrar este guarda-chuva.
- `BE-CESAD-AUTH-02` concluiu a modelagem persistida do vinculo comissao-processo-etapa por `CesadStageAssignment`, sem substituir nem encerrar este guarda-chuva.
- Ressalvas remanescentes de `BE-CESAD-AUTH-02`: unicidade de assignment `ACTIVE` por etapa garantida em service/transacao; bases locais/dev com processos ja em `EM_ANALISE_CESAD` ou `PARECER_EMITIDO` podem exigir fixture/backfill controlado; metadata de `SENT_TO_CESAD` pode explicitar `assignedAt`/`referenceDate`; teste futuro pode afirmar status inalterado quando a criacao da assignment falha; substituicao/supersessao formal deve virar task propria.
- Assinatura colegiada permanece em `BE-DOC-CESAD-SIGN-01`, workflow completo de quatro etapas permanece em `BE-FLOW-4STAGE-01`, parecer conclusivo final permanece em `BE-CESAD-FINAL-01`, e homologacao/notificacao/ciencia permanecem em `BE-HOMOLOG-01`.

## Validacoes esperadas

- testes unitarios ou integrados de autorizacao positiva;
- testes unitarios ou integrados de autorizacao negativa;
- typecheck backend;
- suite backend relevante ao modulo afetado.

## Proxima acao

Planejar a proxima fatia estrutural de autorizacao contextual, priorizando `BE-CESAD-ASSIGN-REPLACE-01` para reatribuicao/supersessao formal de comissao CESAD por etapa e mantendo a compatibilidade com assinatura colegiada, workflow completo de quatro etapas e pareceres futuros.
