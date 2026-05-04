# ADRs — Architecture Decision Records

Esta pasta reúne decisões arquiteturais relevantes do SADEP.

## ADRs registradas

- [`adr-001-workflow-engine-strategy.md`](./adr-001-workflow-engine-strategy.md): decisão de adotar workflow próprio com state machine no backend para o MVP, sem engine BPM externa no início.
- [`adr-002-session-refresh-revocation-strategy.md`](./adr-002-session-refresh-revocation-strategy.md): decisão arquitetural inicial para estratégia de sessão em homologação/produção com access token curto em memória, refresh token opaco em cookie `HttpOnly`, rotação, revogação por sessão/família e logout server-side futuro.

Nota: a `BE-ARCH-01E2` implementou a primeira parte estrutural da ADR-002 com `UserSession` e a migration `20260430120000_add_user_session`; a `BE-ARCH-01E3` implementou a parte backend funcional com refresh token opaco, cookie `HttpOnly`, `POST /auth/refresh`, rotacao, revogacao por reuso e `POST /auth/logout`; a `BE-ARCH-01E4A` implementou o recorte frontend inicial com access token em memoria e bootstrap via refresh. Permanecem pendentes `BE-ARCH-01E4B`, `BE-ARCH-01E4C`, `BE-ARCH-01E5` e `BE-ARCH-01F`.
