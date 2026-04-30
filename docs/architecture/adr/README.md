# ADRs — Architecture Decision Records

Esta pasta reúne decisões arquiteturais relevantes do AEP-PA.

## ADRs registradas

- [`adr-001-workflow-engine-strategy.md`](./adr-001-workflow-engine-strategy.md): decisão de adotar workflow próprio com state machine no backend para o MVP, sem engine BPM externa no início.
- [`adr-002-session-refresh-revocation-strategy.md`](./adr-002-session-refresh-revocation-strategy.md): decisão arquitetural inicial para estratégia de sessão em homologação/produção com access token curto em memória, refresh token opaco em cookie `HttpOnly`, rotação, revogação por sessão/família e logout server-side futuro.
