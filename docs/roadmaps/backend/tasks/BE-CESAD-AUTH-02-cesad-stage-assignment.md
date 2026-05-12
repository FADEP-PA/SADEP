# BE-CESAD-AUTH-02 — Implementar CesadStageAssignment

## Status

Concluida / auditada / aprovada com ressalvas.

## Area

Backend, Prisma, workflow processual, CESAD, autorizacao contextual e testes.

## Contexto

`BE-CESAD-AUTH-02` da continuidade a `BE-SEC-03` apos a conclusao de `BE-CESAD-AUTH-01`.

`BE-CESAD-AUTH-01` aplicou `CesadContextAuthorizationService` aos endpoints sensiveis CESAD atuais, mas ainda dependia de comissao/membresia vigente como referencia transitoria. A [`ADR-003`](../../../architecture/adr/adr-003-cesad-stage-assignment.md) decidiu que o SADEP deve persistir o vinculo formal entre comissao CESAD, processo e etapa por meio de `CesadStageAssignment`.

## Resultado entregue

- Criado o enum/status `CesadStageAssignmentStatus`.
- Criado o modelo Prisma `CesadStageAssignment`.
- Criada a migration propria `20260511120000_add_cesad_stage_assignment`.
- Modeladas relacoes com processo, etapa, comissao, usuario responsavel pela atribuicao e supersessao futura.
- Criada ou reutilizada assignment ativa durante `SEND_TO_CESAD`.
- Bloqueado `SEND_TO_CESAD` quando nao ha comissao ativa.
- Bloqueado `SEND_TO_CESAD` quando ha multiplas comissoes ativas.
- Bloqueada comissao `INACTIVE` ou `SUPERSEDED` para nova assignment ordinaria.
- Alterada a autorizacao contextual CESAD para usar assignment ativa da etapa.
- Bloqueado membro de outra comissao.
- Bloqueado fluxo sem assignment ativa.
- Mantido `COMMISSION_ASSISTANT` apenas para leitura/apoio.
- Alterada a derivacao de `CesadStageOpinionExpectedSigner` para usar a comissao atribuida na assignment.
- Ampliados testes backend positivos e negativos.

## Escopo entregue

- Schema Prisma e migration de `CesadStageAssignment`.
- Criacao transacional da assignment no workflow `SEND_TO_CESAD`.
- Autorizacao contextual por assignment em workflow, historico, leitura consolidada CESAD, leitura de parecer, rascunho de parecer, conclusao de parecer, `ISSUE_CESAD_OPINION` e `REQUEST_ADJUSTMENT`.
- Derivacao de signatarios esperados a partir da comissao atribuida a etapa.
- Testes cobrindo criacao, bloqueios de comissao, duplicidade, membro de outra comissao, ausencia de assignment, assistente, membro encerrado, usuario inativo, expected signers e preservacao de fluxos existentes.

## Fora do escopo

- Assinatura colegiada completa.
- Mudancas em `SignatureRecord`.
- Progressao formal das quatro etapas.
- Parecer conclusivo final.
- Homologacao.
- Notificacao.
- Ciencia.
- Recursos.
- Frontend.
- Contracts.
- Roadmaps/status durante o patch funcional.
- Migracao ampla AEP -> SADEP.
- Renomeacao do cookie `aep_pa_refresh`.

## Validacoes executadas

- `npm run prisma:generate --workspace @sadep/backend`;
- `npm run typecheck --workspace @sadep/backend`;
- `npm run typecheck:spec --workspace @sadep/backend`;
- `npm run test --workspace @sadep/backend`;
- `npx prisma validate --schema apps/backend/prisma/schema.prisma` com `DATABASE_URL` temporaria;
- `git diff --check`.

## Ressalvas remanescentes

- A unicidade de assignment `ACTIVE` por etapa e garantida em service/transacao, nao por indice parcial.
- Bases locais/dev existentes com processos ja em `EM_ANALISE_CESAD` ou `PARECER_EMITIDO` podem exigir fixture/backfill controlado.
- A metadata de `SENT_TO_CESAD` pode ser melhorada futuramente com `assignedAt` ou `referenceDate` explicitos.
- Teste futuro pode afirmar que o status do processo permanece inalterado quando a criacao da assignment falha.
- Substituicao/supersessao formal de comissao em etapa ja atribuida deve virar task propria.
- Assinatura colegiada permanece em `BE-DOC-CESAD-SIGN-01`.
- Workflow completo de quatro etapas permanece em `BE-FLOW-4STAGE-01`.
- Parecer conclusivo final permanece em `BE-CESAD-FINAL-01`.
- Homologacao, notificacao e ciencia permanecem em `BE-HOMOLOG-01`.

## Relacao com ADR-003

Esta task implementa a decisao da [`ADR-003`](../../../architecture/adr/adr-003-cesad-stage-assignment.md), adotando `CesadStageAssignment` como fonte persistida do vinculo entre comissao CESAD, processo e etapa.

## Relacao com BE-SEC-03

Esta task conclui a fatia estrutural de vinculo persistido comissao-processo-etapa dentro de `BE-SEC-03`, mas nao encerra integralmente o guarda-chuva.

`BE-SEC-03` permanece aberto para:

- reatribuicao e supersessao formal de assignments;
- integracao com assinatura colegiada;
- integracao com workflow completo de quatro etapas;
- regras futuras de parecer conclusivo final, se aplicavel;
- integracoes futuras com homologacao, notificacao e ciencia.

## Commit funcional

`8ffd804 feat(backend): persist CESAD stage assignments`.

## Proxima acao

Criar e priorizar uma task futura para reatribuicao/supersessao formal de comissao CESAD por etapa, sem troca automatica invisivel e com auditoria do ato de reatribuicao.
