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

O problema esta registrado como frente separada da familia `BE-ARCH-01`. A varredura global confirmou que ha estrutura auxiliar de autorizacao contextual CESAD e testes parciais, mas a politica ainda precisa ser efetivamente aplicada aos endpoints e fluxos sensiveis.

Enquanto a autorizacao depender apenas de role global como `CESAD_MEMBER` ou `COMMISSION_ASSISTANT`, mesmo combinada com status do processo, a task continua pendente. A autorizacao deve considerar vinculo contextual com comissao, processo, etapa e/ou parecer.

## Escopo previsto

- revisar leitura consolidada CESAD;
- revisar parecer CESAD por etapa;
- mapear endpoints CESAD sensiveis e transicoes relacionadas;
- aplicar service, policy ou guard contextual nos pontos de entrada;
- exigir vinculo contextual real com comissao, processo e etapa;
- bloquear acesso baseado apenas em role global sem vinculo contextual;
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
- `BE-CESAD-AUTH-01` detalha a aplicacao executiva da autorizacao contextual aos endpoints sensiveis, sem substituir nem encerrar este guarda-chuva.

## Validacoes esperadas

- testes unitarios ou integrados de autorizacao positiva;
- testes unitarios ou integrados de autorizacao negativa;
- typecheck backend;
- suite backend relevante ao modulo afetado.

## Proxima acao

Executar `BE-CESAD-AUTH-01` como primeira fatia tecnica, mantendo esta task ativa ate a autorizacao contextual estar aplicada, testada e compatibilizada com a modelagem documental/processual.
