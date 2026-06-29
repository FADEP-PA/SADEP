# BE-CESAD-FINAL-01B — Documento e assinaturas colegiadas do parecer final

## Status

Concluida / auditada / corrigida / aprovada.

## Area

Backend, CESAD, documentos processuais, assinaturas, Prisma, contracts, auditoria e workflow.

## Contexto

`BE-CESAD-FINAL-01A` criou a base funcional do parecer conclusivo final por meio de `CesadFinalOpinion`, elegibilidade das quatro etapas e consolidacao historica process-wide.

Esta fatia formalizou o parecer final como documento processual e implementou sua assinatura colegiada propria, conforme a [`ADR-005`](../../../architecture/adr/adr-005-final-cesad-opinion-modeling.md) e o catalogo documental oficial.

`BE-CESAD-FINAL-01` permanece ativa como guarda-chuva ate a `BE-CESAD-FINAL-01C — Envio formal a homologacao`.

## Resultado entregue

- Parecer conclusivo final passou a possuir documento processual proprio.
- Parecer CESAD de etapa e parecer CESAD final passaram a ser diferenciados por `ProcessDocument.opinionKind`.
- Pareceres de etapa usam `opinionKind = STAGE`.
- Parecer final usa `opinionKind = FINAL_CONCLUSIVE`.
- Documento final e process-wide, com `processStageId = null`.
- Expected signers finais sao modelados em entidade propria.
- Preparacao de assinaturas, consulta de status e assinatura colegiada final foram implementadas.
- Documento final so chega a `SIGNED` apos completude colegiada.
- Processo permanece em `PARECER_EMITIDO`.

## Schema/migration

- Adicionado enum `CesadOpinionKind`:
  - `STAGE`;
  - `FINAL_CONCLUSIVE`.
- Adicionado `ProcessDocument.opinionKind`.
- Documentos existentes `CESAD_OPINION` stage-bound receberam backfill para `opinionKind = STAGE`.
- Documentos nao-CESAD permanecem com `opinionKind = null`.
- Documento final nao e criado por migration.
- Criada entidade `CesadFinalOpinionExpectedSigner`.
- Adicionado vinculo opcional de `SignatureRecord` com expected signer final.
- Criado indice unico parcial SQLite para garantir um unico documento final `CESAD_OPINION / FINAL_CONCLUSIVE` por processo.

```sql
CREATE UNIQUE INDEX "ProcessDocument_unique_final_cesad_opinion_per_process"
ON "ProcessDocument"("evaluationProcessId")
WHERE "documentType" = 'CESAD_OPINION'
  AND "processStageId" IS NULL
  AND "opinionKind" = 'FINAL_CONCLUSIVE';
```

O indice e manual na migration porque o Prisma schema nao expressa indice parcial SQLite.

## opinionKind

- `CESAD_OPINION` de etapa: `opinionKind = STAGE`, com `processStageId` preenchido.
- `CESAD_OPINION` final: `opinionKind = FINAL_CONCLUSIVE`, com `processStageId = null`.
- Avaliacao da chefia, autoavaliacao e documentos nao-CESAD permanecem com `opinionKind = null`.

## Documento processual final

- Criado/reutilizado de forma idempotente a partir de `CesadFinalOpinion.status = COMPLETED`.
- Exige processo em `PARECER_EMITIDO`.
- Reusa a elegibilidade historica das quatro etapas.
- Usa:
  - `documentType = CESAD_OPINION`;
  - `processStageId = null`;
  - `opinionKind = FINAL_CONCLUSIVE`;
  - `documentStatus = READY_FOR_SIGNATURE`;
  - `artifactPath = null`.
- A preparacao sequencial retorna o mesmo documento final.
- A unicidade real e protegida pelo indice parcial SQLite.

## Expected signers finais

- Criada entidade `CesadFinalOpinionExpectedSigner`.
- Nao reutiliza `CesadStageOpinionExpectedSigner`.
- Deriva os signatarios da comissao de referencia da etapa 4.
- Congela snapshots de nome, email, papel e capacidade.
- Exclui `COMMISSION_ASSISTANT`.
- Exclui `ADMIN`.
- E idempotente por parecer final e membro atuante.

## Preparacao de assinaturas

- Endpoint: `POST /processes/:id/cesad-final-opinion/signatures/prepare`.
- Valida autorizacao.
- Exige `CesadFinalOpinion.COMPLETED`.
- Garante documento final.
- Deriva/congela expected signers finais.
- Cria `SignatureRecord PENDING` para cada expected signer final.
- Retorna status documental e completude colegiada.
- Audita geracao/preparacao documental e solicitacao de assinatura.

## Assinatura colegiada final

- Endpoint: `POST /processes/:id/cesad-final-opinion/sign`.
- Somente `CESAD_MEMBER` expected signer assina sua propria pendencia.
- Membro nao esperado e bloqueado.
- `ADMIN` nao assina por membro.
- `COMMISSION_ASSISTANT` nao assina.
- Assinatura duplicada e bloqueada.
- Documento permanece `READY_FOR_SIGNATURE` enquanto houver pendencias.
- Documento passa a `SIGNED` somente quando todas as assinaturas finais estao `COMPLETED`.
- Auditoria registra `CESAD_FINAL_OPINION_SIGNED`.

## Consulta de status

- Endpoint: `GET /processes/:id/cesad-final-opinion/signatures`.
- Retorna documento final, expected signers finais, assinaturas, datas e completude colegiada.
- Leitura permitida para `CESAD_MEMBER` vinculado, `COMMISSION_ASSISTANT` vinculado/leitor e `ADMIN`.
- Roles indevidas permanecem bloqueadas.

## Autorizacao

- `CESAD_MEMBER` vinculado pode preparar e, se for expected signer, assinar.
- `CESAD_MEMBER` nao vinculado e bloqueado.
- `ADMIN` pode preparar/ler como operacao administrativa, mas nao assina.
- `COMMISSION_ASSISTANT` pode ler quando vinculado, mas nao prepara nem assina.
- Chefia, servidor avaliado e autoridade homologadora permanecem bloqueados neste recorte.

## Auditoria

- Preparacao documental e solicitacao de assinatura sao auditadas.
- Assinatura individual final e auditada com `CESAD_FINAL_OPINION_SIGNED`.
- O processo permanece em `PARECER_EMITIDO`.
- Nao ha envio a homologacao nesta fatia.

## Testes/validacoes

- Testes backend ampliados para `opinionKind`, documento final, expected signers finais, idempotencia, unicidade, bloqueios de autorizacao, assinatura parcial/completa, auditoria e regressoes de parecer de etapa.
- Validacoes tecnicas aprovadas no ciclo da implementacao/auditoria:
  - build de `@sadep/contracts`;
  - `prisma:generate`;
  - typecheck backend;
  - typecheck de specs;
  - suite backend;
  - Prisma validate;
  - `git diff --check`.

## Correcoes pos-auditoria

### Unicidade do documento final

A auditoria identificou que a unique composta existente nao garantia unicidade quando `processStageId = null` no SQLite. A correcao adicionou o indice unico parcial manual registrado acima, garantindo um unico documento final `CESAD_OPINION / FINAL_CONCLUSIVE` por processo.

O service tambem passou a tratar colisao `P2002`: apos colisao, busca novamente o documento final, valida coerencia e retorna de forma idempotente quando apropriado.

### Catch P2002 no local correto

A auditoria follow-up identificou que uma primeira correcao havia colocado logica de parecer final no catch de `SELF_EVALUATION`. A implementacao foi corrigida:

- o catch de `SELF_EVALUATION` voltou ao comportamento simples anterior;
- o catch do documento final valida o documento reencontrado;
- documento final `INVALIDATED_OR_SUPERSEDED` e bloqueado;
- documento final `DRAFT` ou `CONSOLIDATED` pode ser normalizado para `READY_FOR_SIGNATURE`;
- documento final `READY_FOR_SIGNATURE` ou `SIGNED` retorna idempotentemente, conforme regra do service.

## Ressalvas remanescentes

- `SEND_TO_HOMOLOGATION` ainda nao foi implementado.
- Homologacao, notificacao e ciencia permanecem em `BE-HOMOLOG-01`.
- Recursos permanecem fora do recorte.
- Frontend permanece fora do recorte.
- GOVBR real permanece fora do recorte.
- Geracao PDF real permanece fora do recorte.
- Portaria/publicacao permanecem fora do recorte.
- Versionamento documental amplo permanece frente futura.
- Invalidacao/supersessao documental ampla permanece frente futura.
- `BE-CESAD-FINAL-01C` deve decidir a ponte formal a homologacao sem homologar diretamente.

## Fora do escopo

- `SEND_TO_HOMOLOGATION`;
- homologacao;
- notificacao;
- ciencia;
- recursos;
- frontend;
- GOVBR real;
- portaria/publicacao;
- versionamento documental amplo;
- invalidacao/supersessao documental ampla;
- geracao PDF real.

## Dependencias

- `BE-CESAD-FINAL-01A` concluida/auditada/corrigida/aprovada.
- `BE-DOC-CESAD-SIGN-01` como referencia de assinatura colegiada de parecer de etapa.
- `docs/domain/document-modeling-catalog.md`.
- `docs/skills/process-document-skill.md`.

## Proxima acao

Executar `BE-CESAD-FINAL-01C — Envio formal a homologacao`, exigindo parecer final funcional `COMPLETED` e documento final `SIGNED`, sem homologar, notificar, registrar ciencia ou publicar portaria.
