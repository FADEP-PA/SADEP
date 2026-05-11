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

`BE-SEC-03` permanece pendente como guarda-chuva estrutural porque a politica ainda usa comissao/membresia vigente como referencia transitoria. A evolucao completa deve considerar vinculo persistido entre comissao, processo, etapa e/ou parecer, alem da integracao com assinatura colegiada e fluxos futuros.

## Escopo previsto

- preservar a protecao ja aplicada por `BE-CESAD-AUTH-01`;
- modelar ou integrar vinculo persistido comissao-processo/etapa quando a estrutura processual exigir;
- refinar a politica para comissao vinculada ao processo, e nao apenas comissao vigente;
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
- Ressalvas de `BE-CESAD-AUTH-01`: ausencia de vinculo persistido comissao-processo/etapa; uso transitorio de comissao/membresia vigente; testes futuros para `COMMISSION_ASSISTANT` em `REQUEST_ADJUSTMENT`, comissao `SUPERSEDED` e cobertura HTTP adicional para `REQUEST_ADJUSTMENT`.

## Validacoes esperadas

- testes unitarios ou integrados de autorizacao positiva;
- testes unitarios ou integrados de autorizacao negativa;
- typecheck backend;
- suite backend relevante ao modulo afetado.

## Proxima acao

Planejar a proxima fatia estrutural de autorizacao contextual, priorizando o vinculo persistido comissao-processo/etapa e a compatibilidade com assinatura colegiada, workflow completo de quatro etapas e pareceres futuros.
