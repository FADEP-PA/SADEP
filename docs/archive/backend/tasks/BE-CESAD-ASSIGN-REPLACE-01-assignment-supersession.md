# BE-CESAD-ASSIGN-REPLACE-01 — Modelar reatribuicao e supersessao formal de comissao CESAD por etapa

## Status

Concluida / auditada / aprovada com ressalvas.

## Area

Backend, Prisma, workflow processual, CESAD, autorizacao contextual, contracts, auditoria e testes.

## Contexto

`BE-CESAD-AUTH-02` criou `CesadStageAssignment` como vinculo persistido entre comissao CESAD, processo e etapa, com uma assignment `ACTIVE` por etapa garantida inicialmente em service/transacao.

A [`ADR-003`](../../../architecture/adr/adr-003-cesad-stage-assignment.md) previu que substituicoes futuras de comissao devem ocorrer por ato formal de reatribuicao, nao por troca automatica invisivel da comissao vigente.

Esta task implementou a primeira versao controlada dessa reatribuicao, limitada ao recorte seguro anterior a qualquer artefato CESAD de parecer, signatarios esperados ou documento.

## Resultado entregue

- Implementado o endpoint `POST /processes/:id/stages/:sequence/cesad-stage-assignment/supersede`.
- O payload recebe `newCommissionId`, `reason`, `referenceDate` opcional e `formalActReference` opcional.
- `newCommissionId` e `reason` sao obrigatorios e nao podem ser vazios.
- A operacao e restrita a `ADMIN` e `HOMOLOGATION_AUTHORITY`.
- `CESAD_MEMBER`, `COMMISSION_ASSISTANT`, chefia imediata, servidor avaliado e usuario ausente/invalido sao bloqueados.
- A operacao exige processo em `EM_ANALISE_CESAD`.
- A operacao exige exatamente uma assignment `ACTIVE` para a etapa.
- A nova comissao deve existir, estar `ACTIVE`, estar vigente na `referenceDate` e ser diferente da comissao atual.
- Comissao inexistente, `INACTIVE`, `SUPERSEDED`, fora de vigencia ou igual a atual bloqueia a reatribuicao.
- A existencia de `CesadStageOpinion` da etapa bloqueia a reatribuicao.
- A existencia de `CesadStageOpinionExpectedSigner` da etapa bloqueia a reatribuicao.
- A existencia de `ProcessDocument.CESAD_OPINION` da etapa bloqueia a reatribuicao.
- A implementacao nao faz update simples de `commissionId`.
- A assignment antiga e preservada e marcada como `SUPERSEDED`.
- A assignment antiga recebe `supersededAt`, `supersededReason` e `supersededByAssignmentId`.
- A nova assignment e criada como `ACTIVE`, com `assignedByUserId`, `assignmentReason` e `referenceDate`.
- A autorizacao contextual CESAD passa a refletir a nova assignment ativa da etapa.
- A auditoria registra `AuditEventType.CESAD_STAGE_ASSIGNMENT_SUPERSEDED`.
- A auditoria registra action `SUPERSEDE_CESAD_STAGE_ASSIGNMENT`.
- A metadata de auditoria inclui processo, etapa, assignment anterior, nova assignment, comissao anterior, nova comissao, ator, papel, motivo, `referenceDate`, `occurredAt` e `formalActReference` quando informado.

## Testes e validacoes

- Testes backend cobrem sucesso com `ADMIN`.
- Testes backend cobrem sucesso com `HOMOLOGATION_AUTHORITY`.
- Testes backend cobrem assignment antiga `SUPERSEDED`, nova assignment `ACTIVE`, `supersededByAssignmentId`, motivo, ator e datas persistidos.
- Testes backend cobrem auditoria criada.
- Testes backend cobrem transferencia da autorizacao contextual da comissao antiga para a nova.
- Testes backend cobrem bloqueios para `CESAD_MEMBER`, `COMMISSION_ASSISTANT`, `IMMEDIATE_SUPERVISOR` e `INTERN_SERVER`.
- Testes backend cobrem bloqueios por processo fora de `EM_ANALISE_CESAD`, ausencia de assignment ativa, multiplas assignments ativas, comissao inexistente, comissao `INACTIVE`/`SUPERSEDED`, mesma comissao, comissao fora de vigencia, parecer existente, expected signers existentes e documento CESAD existente.
- Testes HTTP cobrem payload invalido por `reason` vazio e sucesso do endpoint.
- Validacoes aprovadas: build de `@sadep/contracts`, `npm run prisma:generate --workspace @sadep/backend`, `npm run typecheck --workspace @sadep/backend`, `npm run typecheck:spec --workspace @sadep/backend`, `npm run test --workspace @sadep/backend`, `npx prisma validate --schema apps/backend/prisma/schema.prisma` com `DATABASE_URL` temporaria, typecheck frontend adicional e `git diff --check`.

## Ressalvas nao bloqueantes

- `referenceDate` ainda usa parsing com `new Date(...)`; pode evoluir para validacao ISO datetime estrita.
- Testes HTTP adicionais podem cobrir `referenceDate` invalida, `newCommissionId` vazio/nao string e `formalActReference` nao string.
- Reatribuicao apos parecer, expected signers ou documento CESAD permanece bloqueada.
- Reatribuicao em cenarios posteriores exigira versionamento, invalidacao ou supersessao documental formal.
- Assinatura colegiada do parecer CESAD de etapa foi posteriormente entregue por `BE-DOC-CESAD-SIGN-01`.
- Quatro etapas permanecem em `BE-FLOW-4STAGE-01`.
- Parecer conclusivo final permanece em `BE-CESAD-FINAL-01`.
- Homologacao, notificacao e ciencia permanecem em `BE-HOMOLOG-01`.

## Fora do escopo preservado

- Reatribuicao apos parecer em rascunho.
- Reatribuicao apos parecer concluido.
- Reatribuicao apos expected signers.
- Reatribuicao apos documento CESAD.
- Invalidacao de parecer.
- Versionamento de parecer.
- Invalidacao ou supersessao documental.
- Assinatura colegiada, no recorte desta task de reatribuicao.
- Progressao formal das quatro etapas.
- Parecer conclusivo final.
- Homologacao.
- Notificacao.
- Ciencia.
- Recursos.
- Frontend.
- Migracao ampla AEP -> SADEP.

## Relacao com BE-SEC-03

Esta task conclui a fatia de reatribuicao/supersessao formal segura dentro de `BE-SEC-03`, somando-se a `BE-CESAD-AUTH-01` e `BE-CESAD-AUTH-02`.

`BE-SEC-03` permanece aberta apenas como guarda-chuva estrutural para integracoes futuras com documentos posteriores, workflow completo de quatro etapas, parecer conclusivo final e homologacao/notificacao/ciencia.

## Proxima acao

Qualquer reatribuicao posterior a parecer, signatarios esperados ou documento CESAD deve nascer em task propria de versionamento, invalidacao ou supersessao documental formal.
