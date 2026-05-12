# BE-CESAD-ASSIGN-REPLACE-01 — Modelar reatribuicao e supersessao formal de comissao CESAD por etapa

## Status

Pendente futura.

## Area

Backend, Prisma, workflow processual, CESAD, autorizacao contextual e auditoria.

## Contexto

`BE-CESAD-AUTH-02` criou `CesadStageAssignment` como vinculo persistido entre comissao CESAD, processo e etapa, com uma assignment `ACTIVE` por etapa garantida inicialmente em service/transacao.

A [`ADR-003`](../../../architecture/adr/adr-003-cesad-stage-assignment.md) previu que substituicoes futuras de comissao devem ocorrer por ato formal de reatribuicao, nao por troca automatica invisivel da comissao vigente. Esta task registra essa pendencia como evolucao futura sem reabrir o recorte ja concluido de `BE-CESAD-AUTH-02`.

## Escopo futuro

- Superseder assignment ativa de uma etapa.
- Registrar motivo da reatribuicao.
- Preservar a assignment anterior como historico.
- Criar nova assignment ativa para a etapa.
- Impedir troca automatica invisivel por alteracao da comissao vigente.
- Auditar o ato de reatribuicao.
- Integrar futuramente com suplentes, substituicao formal e documentos, quando a regra estiver consolidada.

## Fora do escopo

- Implementacao imediata.
- Assinatura colegiada completa.
- Progressao formal das quatro etapas.
- Parecer conclusivo final.
- Homologacao.
- Notificacao.
- Ciencia.
- Recursos.
- Frontend.
- Contracts.
- Migracao ampla AEP -> SADEP.

## Dependencias e relacoes

- Depende da estrutura criada em `BE-CESAD-AUTH-02`.
- Relaciona-se a `BE-SEC-03` como refinamento futuro de autorizacao contextual.
- Deve permanecer compativel com `BE-DOC-CESAD-SIGN-01`, `BE-FLOW-4STAGE-01` e `BE-CESAD-FINAL-01`.

## Criterios futuros de aceite

- Apenas uma assignment `ACTIVE` permanece valida por etapa.
- Assignment anterior e preservada com status de supersessao e motivo.
- Nova assignment ativa nasce por ato formal rastreavel.
- Auditoria registra usuario, perfil, data/hora, processo, etapa, assignment anterior, nova assignment e motivo.
- Autorizacao contextual passa a considerar somente a assignment ativa resultante.

## Proxima acao

Planejar a menor evolucao de dominio e workflow para reatribuicao formal, incluindo eventos/auditoria e testes negativos contra substituicao silenciosa.
