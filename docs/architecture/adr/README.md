# ADRs — Architecture Decision Records

Esta pasta reúne decisões arquiteturais relevantes do SADEP.

## ADRs registradas

- [`adr-001-workflow-engine-strategy.md`](./adr-001-workflow-engine-strategy.md): decisão de adotar workflow próprio com state machine no backend para o MVP, sem engine BPM externa no início.
- [`adr-002-session-refresh-revocation-strategy.md`](./adr-002-session-refresh-revocation-strategy.md): decisão arquitetural inicial para estratégia de sessão em homologação/produção com access token curto em memória, refresh token opaco em cookie `HttpOnly`, rotação, revogação por sessão/família e logout server-side futuro.
- [`adr-003-cesad-stage-assignment.md`](./adr-003-cesad-stage-assignment.md): decisão de adotar `CesadStageAssignment` como vínculo persistido entre comissão CESAD, processo e etapa, criado preferencialmente em `SEND_TO_CESAD` para autorização contextual e rastreabilidade futura.
- [`adr-004-four-stage-progression.md`](./adr-004-four-stage-progression.md): decisão de materializar quatro `ProcessStage` para o Caso 2, derivar lifecycle por `startedAt`/`endedAt` e adotar `COMPLETE_CURRENT_STAGE` para a conclusão formal das etapas avaliativas.
- [`adr-005-final-cesad-opinion-modeling.md`](./adr-005-final-cesad-opinion-modeling.md): decisão de modelar o parecer conclusivo final da CESAD como entidade própria `CesadFinalOpinion`, preservar `CesadStageOpinion` como parecer de etapa e introduzir `opinionKind` em `ProcessDocument` para diferenciar `STAGE` e `FINAL_CONCLUSIVE`.
- [`adr-006-cesad-commission-management-and-rollover.md`](./adr-006-cesad-commission-management-and-rollover.md): decisão de administrar formalmente comissões CESAD por vigência, preservar atos consolidados e aplicar rollover explícito/auditável para atos preparatórios quando a comissão vigente mudar.
- [`adr-007-cesad-stage-opinion-supersession.md`](./adr-007-cesad-stage-opinion-supersession.md): decisão de permitir supersessão de `CesadStageOpinion` (espelhando `CesadStageAssignment`), removendo o `@unique` de `processStageId`, para o rollover superseder pareceres preparatórios em rascunho preservando o histórico; casos com documento/assinaturas permanecem deferidos e atos consolidados imutáveis.

Nota: a `BE-ARCH-01E2` implementou a primeira parte estrutural da ADR-002 com `UserSession` e a migration `20260430120000_add_user_session`; a `BE-ARCH-01E3` implementou a parte backend funcional com refresh token opaco, cookie `HttpOnly`, `POST /auth/refresh`, rotacao, revogacao por reuso e `POST /auth/logout`; a `BE-ARCH-01E4A` implementou o recorte frontend inicial com access token em memoria e bootstrap via refresh; `BE-ARCH-01E4B/E4C` concluiram retry silencioso e remocao de consumidores legados de token; `BE-ARCH-01E5` concluiu o hardening operacional de cookies/CORS/env; `BE-ARCH-01F` concluiu eventos estruturados de auth.
