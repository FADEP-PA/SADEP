# BE-CESAD-FINAL-01 — Modelar parecer conclusivo final da CESAD

## Status

Ativa como guarda-chuva / fase principal parcialmente entregue.

## Area

Backend, CESAD, workflow, documentos e dominio processual.

## Contexto

No Caso 2, o parecer conclusivo final da CESAD so pode ocorrer apos a conclusao formal das quatro etapas avaliativas. Desde `BE-FLOW-4STAGE-01A` e `BE-FLOW-4STAGE-01B`, o backend materializa quatro etapas e permite concluir formalmente a etapa ativa por `COMPLETE_CURRENT_STAGE`. Apos a quarta etapa concluida, o processo permanece em `PARECER_EMITIDO`, sem etapa ativa.

A [`ADR-005 — Modelagem do parecer conclusivo final da CESAD`](../../../architecture/adr/adr-005-final-cesad-opinion-modeling.md) definiu a estrategia de entidade funcional propria para o parecer final, preservando `CesadStageOpinion` como parecer de etapa.

## Decisao de status

`BE-CESAD-FINAL-01` nao esta concluida integralmente.

A primeira fatia, [`BE-CESAD-FINAL-01A — Modelo funcional, elegibilidade e consolidacao historica`](./BE-CESAD-FINAL-01A-functional-model-eligibility.md), foi concluida, auditada, corrigida e aprovada. A frente principal permanece ativa porque ainda faltam documento processual, assinaturas colegiadas finais e envio formal a homologacao.

## Fatias

### BE-CESAD-FINAL-01A — Modelo funcional, elegibilidade e consolidacao historica

- **Status:** concluida / auditada / corrigida / aprovada.
- **Commit funcional aprovado:** `a3fa203 feat(backend): add final CESAD opinion model`.
- **Entrega:** entidade `CesadFinalOpinion`, status funcional proprio, elegibilidade das quatro etapas, consolidacao historica process-wide, fluxo `start`/`saveDraft`/`complete`, auditoria e testes.
- **Correcao pos-auditoria:** `complete` passou a exigir parecer existente em `DRAFT`, sem criar `COMPLETED` diretamente e sem emitir start sintetico.

### BE-CESAD-FINAL-01B — Documento e assinaturas colegiadas do parecer final

- **Status:** pendente alta.
- **Arquivo:** [`BE-CESAD-FINAL-01B-document-signatures.md`](./BE-CESAD-FINAL-01B-document-signatures.md).
- **Escopo:** `opinionKind`, documento processual do parecer final, `CesadFinalOpinionExpectedSigner`, preparacao de assinaturas e assinatura colegiada final.

### BE-CESAD-FINAL-01C — Envio formal a homologacao

- **Status:** pendente futura, dependente de 01B.
- **Arquivo:** [`BE-CESAD-FINAL-01C-send-to-homologation.md`](./BE-CESAD-FINAL-01C-send-to-homologation.md).
- **Escopo:** ponte `SEND_TO_HOMOLOGATION`, sem homologar, notificar, registrar ciencia ou publicar portaria.

## Ja entregue em 01A

- `CesadFinalOpinion` como entidade funcional propria.
- `CesadFinalOpinionStatus`.
- Relacao process-wide com `EvaluationProcess`.
- Relacao com autor `User`.
- Unicidade funcional de um parecer final por processo no recorte atual.
- Campo `consolidatedSnapshot`.
- Actions:
  - `START_CESAD_FINAL_OPINION`;
  - `SAVE_CESAD_FINAL_OPINION_DRAFT`;
  - `COMPLETE_CESAD_FINAL_OPINION`.
- Audit events:
  - `CESAD_FINAL_OPINION_STARTED`;
  - `CESAD_FINAL_OPINION_DRAFT_SAVED`;
  - `CESAD_FINAL_OPINION_COMPLETED`.
- Contracts/refs minimos do parecer final.
- Elegibilidade apos quatro etapas formalmente concluidas.
- Consolidacao historica process-wide das quatro etapas.
- Fluxo funcional de iniciar, salvar rascunho e concluir parecer final.
- `complete` exigindo parecer existente em `DRAFT`.
- Auditoria coerente dos atos.
- Autorizacao process-wide para CESAD e `ADMIN`.
- Bloqueio de chefia, servidor e autoridade homologadora.
- Macrostatus preservado em `PARECER_EMITIDO`.
- Testes backend ampliados e validacoes tecnicas aprovadas.

## Ainda falta

- `ProcessDocument` do parecer final.
- `opinionKind` em `ProcessDocument`.
- Diferenciacao documental `STAGE` e `FINAL_CONCLUSIVE`.
- `CesadFinalOpinionExpectedSigner`.
- Assinatura colegiada do parecer final.
- `PREPARE_CESAD_FINAL_OPINION_SIGNATURES`.
- `SIGN_CESAD_FINAL_OPINION`.
- `SEND_TO_HOMOLOGATION`.
- Integracao posterior com `BE-HOMOLOG-01`.

## Escopo consolidado da frente principal

- Diferenciar parecer CESAD por etapa de parecer conclusivo final.
- Definir pre-condicoes para elaboracao do parecer final.
- Consolidar resultados das quatro etapas.
- Prever ciclo documental e assinatura.
- Integrar o parecer final ao workflow como pre-condicao de homologacao futura.
- Registrar auditoria de elaboracao, assinatura, conclusao e envio a autoridade homologadora.

## Fora do escopo da frente principal

- Implementar homologacao final na mesma task.
- Implementar notificacao, ciencia, recurso ou portaria.
- Apagar ou sobrescrever pareceres de etapa.
- Tratar PDF como fonte unica da verdade.
- Alterar regras juridicas consolidadas.
- Implementar frontend.
- Implementar GOVBR real.
- Implementar versionamento/invalidacao documental amplo fora de task propria.

## Criterios de aceite restantes

- Parecer final funcional ja existe e so pode ser concluido a partir de `DRAFT`.
- Parecer final documental deve seguir a modelagem oficial com `DocumentType.CESAD_OPINION` e `opinionKind = FINAL_CONCLUSIVE`.
- Assinaturas colegiadas finais devem ser completas antes de considerar o documento final assinado.
- Workflow futuro deve impedir homologacao sem parecer conclusivo final formal/documentalmente concluido.
- Auditoria deve registrar preparacao documental, assinatura e envio formal.

## Dependencias

- `BE-FLOW-4STAGE-01` concluida no recorte de progressao formal.
- `BE-DOC-CESAD-SIGN-01` como referencia para assinatura colegiada de parecer de etapa.
- [`ADR-005`](../../../architecture/adr/adr-005-final-cesad-opinion-modeling.md).
- `docs/workflow/four-stage-flow-and-appeals.md`.
- `docs/domain/document-modeling-catalog.md`.

## Proxima acao

Executar `BE-CESAD-FINAL-01B — Documento e assinaturas colegiadas do parecer final`, sem antecipar homologacao, notificacao, ciencia, recursos, frontend ou GOVBR.
