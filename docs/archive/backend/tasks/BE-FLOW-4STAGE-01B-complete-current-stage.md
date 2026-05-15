# BE-FLOW-4STAGE-01B — Implementar COMPLETE_CURRENT_STAGE

## Status

Concluida / auditada / aprovada.

## Area

Backend, workflow-engine, dominio processual, documentos stage-bound, CESAD, auditoria e testes.

## Contexto

`BE-FLOW-4STAGE-01A` materializou as quatro etapas do Caso 2 e corrigiu a resolucao de etapa atual para ignorar etapas futuras.

Esta task entregou a segunda fatia de `BE-FLOW-4STAGE-01`: a conclusao formal da etapa ativa por `COMPLETE_CURRENT_STAGE`, sem antecipar parecer conclusivo final, homologacao, notificacao, ciencia, recursos ou frontend.

## Relacao com ADR-004

A [`ADR-004`](../../../architecture/adr/adr-004-four-stage-progression.md) recomenda a action `COMPLETE_CURRENT_STAGE` para concluir formalmente a etapa corrente.

A implementacao preservou `startedAt` e `endedAt` como lifecycle de etapa:

- etapa futura: `startedAt = null`, `endedAt = null`;
- etapa ativa: `startedAt != null`, `endedAt = null`;
- etapa concluida: `startedAt != null`, `endedAt != null`.

## Resultado entregue

- Adicionado `ProcessAction.COMPLETE_CURRENT_STAGE`.
- Adicionado `AuditEventType.STAGE_COMPLETED`.
- Criada a migration `20260514120000_add_stage_completed_audit_event`.
- Catalogada a transicao com origem `PARECER_EMITIDO`.
- Implementado destino dinamico:
  - etapas 1 a 3: `EM_AVALIACAO`;
  - etapa 4: permanece `PARECER_EMITIDO`.
- Implementada conclusao transacional da etapa ativa.
- Implementada abertura sequencial da proxima etapa nas etapas 1 a 3.
- Implementado encerramento da etapa 4 sem criar etapa 5.
- Preservados documentos, pareceres, expected signers e assinaturas como historico stage-bound.
- Implementada auditoria `STAGE_COMPLETED`.
- Implementada autorizacao para `CESAD_MEMBER` contextual autorizado.
- Implementada execucao administrativa controlada por `ADMIN`.
- Corrigido posteriormente o gate de `ADMIN`, com auditoria follow-up aprovada.

## Contracts e Prisma

- `ProcessAction.COMPLETE_CURRENT_STAGE` foi adicionado aos contracts.
- `AuditEventType.STAGE_COMPLETED` foi adicionado aos contracts.
- `AuditEventType.STAGE_COMPLETED` foi adicionado ao enum Prisma.
- A migration `20260514120000_add_stage_completed_audit_event` registra a inclusao do novo evento no datamodel.

## Workflow

- A action parte de `PARECER_EMITIDO`.
- O catalogo registra destino padrao `EM_AVALIACAO`, usado para etapas 1 a 3.
- O service aplica destino real dinamico:
  - etapas 1, 2 e 3 retornam o processo para `EM_AVALIACAO`;
  - etapa 4 preserva o processo em `PARECER_EMITIDO`.
- `requiresComment = false`.
- As guardas reais permanecem no service, mesmo quando `availableActions` lista actions por status/role.

## Guarda documental

Antes de concluir a etapa, o backend exige:

- processo em `PARECER_EMITIDO`;
- exatamente uma etapa ativa;
- etapa ativa igual ao contexto resolvido;
- `SUPERVISOR_EVALUATION` stage-bound em `SIGNED`;
- assinaturas obrigatorias da avaliacao da chefia completas;
- `SELF_EVALUATION` stage-bound em `SIGNED`;
- assinaturas obrigatorias da autoavaliacao completas;
- `CesadStageOpinion` em `COMPLETED`;
- expected signers CESAD existentes;
- `ProcessDocument.CESAD_OPINION` stage-bound em `SIGNED`;
- assinaturas CESAD colegiadas completas.

A auditoria nao substitui a validacao objetiva dos artefatos.

## Autorizacao

- `CESAD_MEMBER` pode executar quando possui assignment contextual valida.
- `CESAD_MEMBER` sem assignment contextual continua bloqueado.
- `ADMIN` pode executar de forma administrativa controlada e nao depende de assignment CESAD.
- `ADMIN` continua sujeito a status, etapa ativa e completude documental.
- `COMMISSION_ASSISTANT`, chefia imediata, servidor avaliado e autoridade homologadora continuam bloqueados.

## Comportamento nas etapas 1 a 3

Nas etapas 1, 2 e 3, `COMPLETE_CURRENT_STAGE`:

- valida completude documental;
- confirma exatamente uma etapa ativa;
- confirma que a etapa ativa e a mesma do contexto;
- exige que a proxima etapa exista;
- exige que a proxima etapa esteja futura;
- define `endedAt` na etapa atual;
- define `startedAt` na proxima etapa;
- herda/preserva `responsibleSupervisorUserId`;
- atualiza `EvaluationProcess.status` para `EM_AVALIACAO`;
- registra `STAGE_COMPLETED`.

## Comportamento na etapa 4

Na etapa 4, `COMPLETE_CURRENT_STAGE`:

- valida completude documental;
- define `endedAt` na etapa 4;
- nao cria etapa 5;
- nao ativa nenhuma proxima etapa;
- preserva `EvaluationProcess.status = PARECER_EMITIDO`;
- registra `STAGE_COMPLETED`;
- nao cria parecer conclusivo final;
- nao homologa;
- nao notifica;
- nao registra ciencia;
- nao abre recurso.

## Auditoria

O evento `STAGE_COMPLETED` registra:

- action `COMPLETE_CURRENT_STAGE`;
- ator e papel;
- processo;
- etapa concluida;
- proxima etapa quando houver;
- `previousProcessStatus`;
- `nextProcessStatus`;
- `isFinalStage`;
- comentario opcional;
- resumo da completude documental verificada;
- `beforeState` e `afterState` coerentes, inclusive na etapa 4 quando o status macro permanece igual.

## Testes

Foram adicionados testes backend para:

- catalogo, roles e helpers de workflow;
- sucesso etapa 1 -> 2;
- sucesso etapa 3 -> 4;
- sucesso etapa 4 sem etapa 5;
- preservacao de `PARECER_EMITIDO` na etapa 4;
- sucesso de `ADMIN`;
- bloqueio de `ADMIN` quando a etapa esta documentalmente incompleta;
- bloqueio de `ADMIN` para acao fora do recorte;
- bloqueio por status incorreto;
- bloqueio de chefia, servidor, assistente e autoridade homologadora;
- bloqueio de `CESAD_MEMBER` sem assignment contextual;
- falta de avaliacao da chefia/autoavaliacao assinadas;
- falta de parecer CESAD funcional concluido;
- falta de expected signers;
- documento CESAD nao assinado;
- assinatura CESAD pendente;
- ausencia de etapa ativa;
- multiplas etapas ativas;
- regressao de `ISSUE_CESAD_OPINION`.

## Validacoes

Validacoes aprovadas no ciclo da implementacao e da correcao do gate de `ADMIN`:

- `npm run build --workspace @sadep/contracts`;
- `npm run prisma:generate --workspace @sadep/backend`;
- `npm run typecheck --workspace @sadep/backend`;
- `npm run typecheck:spec --workspace @sadep/backend`;
- `npm run test --workspace @sadep/backend`;
- `npx prisma validate --schema apps/backend/prisma/schema.prisma` com `DATABASE_URL` temporaria quando necessario;
- `git diff --check`.

## Fora do escopo preservado

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

## Ressalvas

- Apos a etapa 4, nao ha etapa ativa. `BE-CESAD-FINAL-01` deve usar resolver historico/consolidado adequado, e nao depender de `resolveCurrentStageOrThrow`.
- `COMPLETE_CURRENT_STAGE` nao cria parecer conclusivo final.
- `COMPLETE_CURRENT_STAGE` nao homologa.
- `COMPLETE_CURRENT_STAGE` nao notifica nem registra ciencia.
- Recursos permanecem fora do recorte.
- Frontend nao foi alterado.
- `availableActions` pode listar actions por status/role, mas as guardas reais permanecem no service.

## Proxima acao

Priorizar `BE-CESAD-FINAL-01 — Modelar parecer conclusivo final da CESAD`, usando as quatro etapas concluidas e leitura/consolidacao historica adequada como base de elegibilidade.
