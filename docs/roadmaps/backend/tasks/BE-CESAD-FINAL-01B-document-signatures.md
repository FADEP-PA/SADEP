# BE-CESAD-FINAL-01B — Documento e assinaturas colegiadas do parecer final

## Status

Pendente alta.

## Area

Backend, CESAD, documentos processuais, assinaturas, Prisma, contracts, auditoria e workflow.

## Contexto

`BE-CESAD-FINAL-01A` criou a base funcional do parecer conclusivo final por meio de `CesadFinalOpinion`, elegibilidade das quatro etapas e consolidacao historica process-wide.

Ainda falta formalizar o parecer final como documento processual e implementar sua assinatura colegiada propria, conforme a [`ADR-005`](../../../architecture/adr/adr-005-final-cesad-opinion-modeling.md) e o catalogo documental oficial.

## Escopo previsto

- Adicionar `opinionKind` em `ProcessDocument`.
- Diferenciar `STAGE` e `FINAL_CONCLUSIVE` para documentos `CESAD_OPINION`.
- Fazer backfill controlado dos pareceres CESAD de etapa existentes como `opinionKind = STAGE`.
- Criar documento processual do parecer final com `documentType = CESAD_OPINION`, `processStageId = null` e `opinionKind = FINAL_CONCLUSIVE`.
- Criar `CesadFinalOpinionExpectedSigner`.
- Derivar signatarios finais da CESAD conforme a ADR-005.
- Preparar assinaturas do parecer final.
- Assinar parecer final.
- Marcar documento final como `SIGNED` apenas apos completude colegiada.
- Bloquear assinatura por `COMMISSION_ASSISTANT`.
- Impedir `ADMIN` de assinar por membro.
- Auditar preparacao, solicitacao de assinatura e assinatura.

## Acoes previstas

- `PREPARE_CESAD_FINAL_OPINION_SIGNATURES`;
- `SIGN_CESAD_FINAL_OPINION`.

## Criterios de aceite

- Parecer final funcional `COMPLETED` pode ser formalizado como documento processual proprio.
- Documento final nao e stage-bound.
- Parecer de etapa e parecer final permanecem diferenciados por `opinionKind`.
- Expected signers finais sao congelados em entidade propria.
- Cada membro esperado assina sua propria pendencia.
- `COMMISSION_ASSISTANT` nao assina.
- `ADMIN` nao assina por membro.
- Documento final so chega a `SIGNED` apos todas as assinaturas obrigatorias.
- Auditoria registra preparacao e assinatura.

## Fora do escopo

- `SEND_TO_HOMOLOGATION`;
- homologacao;
- notificacao;
- ciencia;
- recursos;
- frontend;
- GOVBR real;
- publicacao/portaria;
- versionamento documental amplo alem do necessario para esta fatia.

## Dependencias

- `BE-CESAD-FINAL-01A` concluida/auditada/corrigida/aprovada.
- `BE-DOC-CESAD-SIGN-01` como referencia de assinatura colegiada de parecer de etapa.
- `docs/domain/document-modeling-catalog.md`.
- `docs/skills/process-document-skill.md`.

## Proxima acao

Definir schema e fluxo documental minimo do parecer final, preservando a entidade funcional entregue em `BE-CESAD-FINAL-01A`.
