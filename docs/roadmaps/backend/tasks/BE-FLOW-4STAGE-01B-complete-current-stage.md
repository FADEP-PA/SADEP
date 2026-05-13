# BE-FLOW-4STAGE-01B — Implementar COMPLETE_CURRENT_STAGE

## Status

Pendente alta.

## Area

Backend, workflow-engine, dominio processual, documentos stage-bound, CESAD, auditoria e testes.

## Contexto

`BE-FLOW-4STAGE-01A` materializou as quatro etapas do Caso 2 e corrigiu a resolucao de etapa atual para ignorar etapas futuras.

Esta task registra a proxima fatia de `BE-FLOW-4STAGE-01`: implementar a conclusao formal da etapa ativa sem antecipar parecer conclusivo final, homologacao, notificacao, ciencia, recursos ou frontend.

## Relacao com ADR-004

A [`ADR-004`](../../../architecture/adr/adr-004-four-stage-progression.md) recomenda a action `COMPLETE_CURRENT_STAGE` para concluir formalmente a etapa corrente.

A action deve preservar `startedAt` e `endedAt` como lifecycle de etapa:

- etapa futura: `startedAt = null`, `endedAt = null`;
- etapa ativa: `startedAt != null`, `endedAt = null`;
- etapa concluida: `startedAt != null`, `endedAt != null`.

## Escopo previsto

- Adicionar `ProcessAction.COMPLETE_CURRENT_STAGE`.
- Adicionar `AuditEventType.STAGE_COMPLETED`, se necessario.
- Permitir execucao a partir de `PARECER_EMITIDO`.
- Validar completude documental da etapa ativa.
- Validar que a etapa ativa possui os documentos, pareceres e assinaturas exigidos.
- Nas etapas 1 a 3:
  - definir `endedAt` na etapa atual;
  - definir `startedAt` na proxima etapa;
  - manter etapas posteriores como futuras;
  - retornar processo para `EM_AVALIACAO`;
  - impedir pulo de sequencia.
- Na etapa 4:
  - definir `endedAt`;
  - nao criar etapa 5;
  - nao homologar;
  - nao criar parecer conclusivo final;
  - deixar caminho preparado para `BE-CESAD-FINAL-01`.
- Registrar auditoria robusta com usuario, perfil, data/hora, processo, etapa concluida e proxima etapa quando aplicavel.

## Fora do escopo

- Parecer conclusivo final.
- Homologacao.
- Notificacao.
- Ciencia.
- Recursos.
- Avaliacao substitutiva.
- Portaria.
- Frontend.
- Mudanca de responsavel por etapa.
- Versionamento documental amplo.

## Dependencias

- `BE-FLOW-4STAGE-01A`.
- [`ADR-004 — Progressao formal das quatro etapas avaliativas`](../../../architecture/adr/adr-004-four-stage-progression.md).
- [`docs/workflow/four-stage-flow-and-appeals.md`](../../../workflow/four-stage-flow-and-appeals.md).
- [`docs/skills/workflow-engine-skill.md`](../../../skills/workflow-engine-skill.md).
- [`docs/skills/process-document-skill.md`](../../../skills/process-document-skill.md).
- [`docs/domain/document-modeling-catalog.md`](../../../domain/document-modeling-catalog.md).

## Criterios de aceite

- `COMPLETE_CURRENT_STAGE` so executa sobre etapa ativa.
- Etapa futura continua bloqueada para artefatos ate receber `startedAt`.
- Etapas 1 a 3 encerram a atual e ativam exatamente a proxima.
- Etapa 4 encerra sem criar etapa 5 e sem homologar.
- O processo retorna para `EM_AVALIACAO` apos concluir etapas 1 a 3.
- A quarta etapa concluida apenas prepara a elegibilidade futura de `BE-CESAD-FINAL-01`.
- Auditoria registra o ato de conclusao de etapa.
- Testes cobrem sucesso, bloqueios, regressao documental e conflitos de lifecycle.

## Validacoes esperadas

- `npm run prisma:generate --workspace @sadep/backend`;
- `npm run typecheck --workspace @sadep/backend`;
- `npm run typecheck:spec --workspace @sadep/backend`;
- `npm run test --workspace @sadep/backend`;
- `npx prisma validate --schema apps/backend/prisma/schema.prisma` com `DATABASE_URL` temporaria quando necessario;
- `git diff --check`.

## Proxima acao

Implementar a action `COMPLETE_CURRENT_STAGE` de forma transacional, com guards documentais e auditoria, sem antecipar o parecer conclusivo final nem qualquer etapa homologatoria.
