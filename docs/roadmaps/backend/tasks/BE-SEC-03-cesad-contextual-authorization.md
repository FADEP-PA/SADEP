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

O problema esta registrado como frente separada da `BE-ARCH-01D`. A autorizacao deve considerar vinculo real da comissao ou assistente com processo e etapa.

## Escopo previsto

- revisar leitura consolidada CESAD;
- revisar parecer CESAD por etapa;
- exigir vinculo contextual real com comissao, processo e etapa;
- adicionar testes positivos e negativos de autorizacao.

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

## Validacoes esperadas

- testes unitarios ou integrados de autorizacao positiva;
- testes unitarios ou integrados de autorizacao negativa;
- typecheck backend;
- suite backend relevante ao modulo afetado.

## Proxima acao

Executar varredura tecnica especifica dos endpoints CESAD sensiveis antes de qualquer implementacao.
