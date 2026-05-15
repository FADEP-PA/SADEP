# BE-DOC-CESAD-SIGN-01 — Modelar e validar assinatura colegiada do parecer CESAD

## Status

Concluida / auditada / aprovada com ressalvas.

## Area

Backend, documentos, assinaturas, CESAD, Prisma, workflow, contracts, autorizacao e auditoria.

## Contexto

O fluxo processual exige que o parecer CESAD de etapa observe os signatarios obrigatorios. A varredura decisoria confirmou que o modelo ja possuia `CesadStageOpinionExpectedSigner`, mas ainda faltava fechar o ciclo documental de assinatura colegiada sobre `ProcessDocument.CESAD_OPINION`.

Tambem havia risco estrutural em `SignatureRecord`, porque a unique anterior por `processDocumentId + signatoryRole` impedia multiplos membros com role `CESAD_MEMBER` no mesmo documento.

## Resultado entregue

- Implementado o ciclo documental minimo do parecer CESAD de etapa.
- `ProcessDocument.CESAD_OPINION` passou a ser criado/reutilizado como documento stage-bound.
- A preparacao cria ou reutiliza o documento CESAD em `READY_FOR_SIGNATURE`, com `artifactPath = null`.
- As assinaturas reais sao derivadas de `CesadStageOpinionExpectedSigner`.
- Cada expected signer gera no maximo um `SignatureRecord`.
- `signatoryUserId` passa a refletir `actingUserId`.
- `signatoryRole` e `CESAD_MEMBER`.
- `provider` e `INTERNAL`.
- Assinaturas nascem como `PENDING`.
- O autor do parecer nao assina automaticamente.
- `COMMISSION_ASSISTANT` nao recebe assinatura e nao assina.
- `ADMIN` nao assina no lugar de membro.
- Membro nao esperado e bloqueado.
- O documento permanece `READY_FOR_SIGNATURE` enquanto houver pendencias.
- O documento vira `SIGNED` somente quando todos os expected signers assinarem.
- `ISSUE_CESAD_OPINION` passou a exigir documento CESAD stage-bound `SIGNED` e todas as assinaturas esperadas `COMPLETED`.
- O processo permanece em `EM_ANALISE_CESAD` enquanto aguarda assinatura colegiada; nao foi criado novo macrostatus.

## Endpoints

- `POST /processes/:id/stages/:sequence/cesad-stage-opinion/signatures/prepare`
  - prepara documento e assinaturas;
  - exige processo em `EM_ANALISE_CESAD`;
  - exige parecer CESAD funcional `COMPLETED`;
  - garante expected signers a partir da assignment ativa quando necessario;
  - cria/reutiliza `ProcessDocument.CESAD_OPINION`;
  - cria/reutiliza assinaturas pendentes.

- `GET /processes/:id/stages/:sequence/cesad-stage-opinion/signatures`
  - retorna documento CESAD, expected signers, assinaturas e completude;
  - permite leitura contextual para `CESAD_MEMBER` e `COMMISSION_ASSISTANT` vinculados;
  - permite `ADMIN` para suporte/auditoria.

- `POST /processes/:id/stages/:sequence/cesad-stage-opinion/sign`
  - permite que cada `CESAD_MEMBER` esperado assine sua propria pendencia;
  - bloqueia assistente, admin assinando por membro, membro nao esperado e usuario fora da assignment contextual;
  - marca o documento como `SIGNED` apenas apos completude colegiada.

## Schema/migration

- `SignatureRecord` passou a usar unique por `processDocumentId + signatoryUserId + signatoryRole`.
- A unique antiga por `processDocumentId + signatoryRole` foi removida/substituida.
- Foi adicionado `cesadStageOpinionExpectedSignerId String?`.
- Foi adicionado vinculo opcional entre `SignatureRecord` e `CesadStageOpinionExpectedSigner`.
- Foi adicionada unique por `cesadStageOpinionExpectedSignerId`, compativel com SQLite por ser nullable.
- Foi criada a migration `20260513120000_add_cesad_opinion_collegiate_signatures`.
- A migration preserva os dados existentes de `SignatureRecord` ao recriar a tabela e copiar registros antigos.
- Documentos de avaliacao da chefia e autoavaliacao continuam compativeis; a protecao contra duplicidade indevida nesses documentos permanece na camada de service.

## Contracts e auditoria

- Foi adicionada a action contratual `PREPARE_CESAD_OPINION_SIGNATURES`.
- A preparacao registra auditoria de geracao documental e solicitacao de assinatura.
- A assinatura individual registra evento de assinatura do parecer CESAD.
- A metadata registra processo, etapa, documento, parecer, expected signer/signatory e status documental.

## Testes/validacoes

- Testes backend cobrem multiplos `CESAD_MEMBER` no mesmo documento.
- Testes backend cobrem regressao de documentos de chefia e autoavaliacao.
- Testes backend cobrem preparacao idempotente.
- Testes backend cobrem documento `CESAD_OPINION` stage-bound.
- Testes backend cobrem assinaturas derivadas de expected signers.
- Testes backend cobrem bloqueio de membro nao esperado.
- Testes backend cobrem bloqueio de `COMMISSION_ASSISTANT`.
- Testes backend cobrem que assinatura parcial mantem documento em `READY_FOR_SIGNATURE`.
- Testes backend cobrem que assinatura completa marca documento como `SIGNED`.
- Testes backend cobrem bloqueio de `ISSUE_CESAD_OPINION` antes da assinatura.
- Testes backend cobrem liberacao de `ISSUE_CESAD_OPINION` apos completude.
- Testes backend cobrem leitura/status documental CESAD apos criacao/assinatura.
- Validacoes aprovadas:
  - `npm run build --workspace @sadep/contracts`;
  - `npm run prisma:generate --workspace @sadep/backend`;
  - `npm run typecheck --workspace @sadep/backend`;
  - `npm run typecheck:spec --workspace @sadep/backend`;
  - `npm run test --workspace @sadep/backend`;
  - `npx prisma validate --schema apps/backend/prisma/schema.prisma` com `DATABASE_URL` temporaria;
  - `git diff --check`.

## Ressalvas

- A metadata de `SIGNATURE_REQUESTED` pode ser futuramente enriquecida com `signatureId` e `signatureStatus = PENDING`.
- A nova unique permite multiplos usuarios com a mesma role no mesmo documento; documentos nao colegiados continuam protegidos pela camada de service.
- Versionamento documental completo permanece fora do recorte.
- Invalidacao/supersessao documental permanece fora do recorte.
- Substituicao formal de signatario apos assinatura aberta permanece fora do recorte.
- Assinatura externa GOVBR real permanece fora do recorte.
- Quatro etapas permanecem em `BE-FLOW-4STAGE-01`.
- Parecer conclusivo final permanece em `BE-CESAD-FINAL-01`.
- Homologacao, notificacao e ciencia permanecem em `BE-HOMOLOG-01`.

## Fora do escopo preservado

- Quatro etapas.
- Parecer conclusivo final.
- Homologacao.
- Notificacao.
- Ciencia.
- Recursos.
- Portaria.
- Frontend.
- Versionamento documental.
- Invalidacao/supersessao documental.
- Substituicao formal de signatario apos assinatura aberta.
- Assinatura externa GOVBR real.
- Reabertura de `BE-SEC-03`.

## Proxima acao

Priorizar `BE-FLOW-4STAGE-01`, `BE-CESAD-FINAL-01` e `BE-HOMOLOG-01` conforme o roadmap. Qualquer evolucao de versionamento, invalidacao/supersessao documental ou substituicao formal de signatario apos assinatura aberta deve nascer em task propria.
