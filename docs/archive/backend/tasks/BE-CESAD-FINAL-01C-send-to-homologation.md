# BE-CESAD-FINAL-01C — Envio formal a homologacao

## Status

Concluida / auditada / aprovada.

**Commit funcional:** `a0e5b2d feat(backend): send final CESAD opinion to homologation`

## Area

Backend, CESAD, workflow, auditoria e integracao futura com homologacao.

## Contexto

`BE-CESAD-FINAL-01A` criou a base funcional do parecer final. `BE-CESAD-FINAL-01B` formalizou o documento processual e as assinaturas colegiadas do parecer conclusivo final.

Somente depois de parecer final funcionalmente concluido e documentalmente assinado o processo podera ser encaminhado formalmente para a frente de homologacao.

A `BE-CESAD-FINAL-01B` nao implementou `SEND_TO_HOMOLOGATION`, nao homologou, nao notificou e nao registrou ciencia. Esta task deve implementar apenas a ponte formal para a homologacao futura.

## Escopo previsto

- Implementar a ponte `SEND_TO_HOMOLOGATION`, se essa decisao permanecer no roadmap.
- Exigir parecer final funcional `COMPLETED`.
- Exigir documento final do parecer CESAD com `opinionKind = FINAL_CONCLUSIVE`, `processStageId = null` e `documentStatus = SIGNED`.
- Registrar auditoria do envio formal.
- Preparar o processo para `BE-HOMOLOG-01`.

## Regras obrigatorias

- Nao homologar.
- Nao notificar.
- Nao registrar ciencia.
- Nao publicar portaria.
- Nao abrir recurso.
- Nao alterar o conteudo do parecer final.

## Criterios de aceite

- O envio formal so ocorre apos parecer conclusivo final funcional e documento final assinado.
- A operacao e auditavel.
- A autoridade homologadora passa a ter base formal para atuar em `BE-HOMOLOG-01`.
- O macrostatus permanece coerente com a decisao arquitetural vigente, salvo decisao futura explicita.

## Fora do escopo

- Decisao de homologacao.
- Documento de homologacao.
- Notificacao.
- Ciencia.
- Recurso final.
- Portaria.
- Frontend.
- GOVBR real.

## Dependencias

- `BE-CESAD-FINAL-01A` concluida/auditada/corrigida/aprovada.
- `BE-CESAD-FINAL-01B` concluida/auditada/corrigida/aprovada, com documento final e assinatura colegiada final implementados.
- `BE-HOMOLOG-01` como frente posterior de homologacao, notificacao e ciencia.

## Entregue

- `ProcessAction.SEND_TO_HOMOLOGATION` como acao de workflow.
- `AuditEventType.SENT_TO_HOMOLOGATION` como audit event.
- Migration `20260522120000_add_final_opinion_homologation_send` com campos `sentToHomologationAt` e `sentToHomologationByUserId` em `CesadFinalOpinion`.
- Endpoint `POST /processes/:id/cesad-final-opinion/send-to-homologation`.
- Guardas obrigatorias: `CesadFinalOpinion` em `COMPLETED`, `sentToHomologationAt = null`, documento final `CESAD_OPINION / FINAL_CONCLUSIVE` em `SIGNED` e todas as assinaturas dos expected signers finais em `COMPLETED`.
- Campo opcional `comment` aceito no payload.
- Registro de `sentToHomologationAt` e `sentToHomologationByUserId` persistidos transacionalmente.
- Auditoria `SENT_TO_HOMOLOGATION` com ator, papel, processo e contexto do envio.
- Nao homologa, nao notifica, nao registra ciencia e nao altera conteudo do parecer final.

## Proxima acao

`BE-HOMOLOG-01` — fluxo de homologacao, notificacao e ciencia. O `sendToHomologation` esta concluido e serve de base formal para a autoridade homologadora atuar.
