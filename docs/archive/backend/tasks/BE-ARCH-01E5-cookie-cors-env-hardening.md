# BE-ARCH-01E5 — Hardening operacional de cookies/CORS/env

## Status

Concluida no recorte backend de validacao operacional de ambiente.

## Area

Backend, sessao/auth, cookies, CORS e configuracao.

## Fonte de transicao

- [`../../backend-implementation-tracker.md`](../../backend-implementation-tracker.md)
- [`../active.md`](../active.md)
- [`../../cross-cutting/active-problems.md`](../../cross-cutting/active-problems.md)
- [`../../../architecture/adr/adr-002-session-refresh-revocation-strategy.md`](../../../architecture/adr/adr-002-session-refresh-revocation-strategy.md)

## Contexto

A frente `BE-ARCH-01E5` era a pendencia operacional restante da familia `BE-ARCH-01` depois de refresh server-side, frontend com access token em memoria, retry silencioso e eventos estruturados de auth. O objetivo era reduzir risco de configuracao insegura de cookie/CORS/env sem alterar regras processuais, CESAD, workflow, contracts ou frontend visual.

## Escopo realizado

- `FRONTEND_ORIGIN` passou a ser validado como origin `http` ou `https`, sem wildcard, path, query, fragmento ou credenciais;
- `FRONTEND_ORIGIN` passa a ser normalizado para `URL.origin`;
- `FRONTEND_ORIGIN` em producao exige `https`;
- `COOKIE_DOMAIN` passou a rejeitar protocolo, path, wildcard, porta, labels invalidos e `localhost` em producao;
- `COOKIE_PATH` passou a rejeitar whitespace, semicolon, query e fragment;
- mantida a exigencia existente de `COOKIE_SECURE=true` em producao;
- mantida a exigencia existente de `COOKIE_SAMESITE=none` apenas com `COOKIE_SECURE=true`;
- adicionados testes unitarios dedicados de validacao de ambiente.

## Fora do escopo

- renomear o cookie default residual `aep_pa_refresh`, que permanece em `NOM-AEP-COOKIE-01`;
- Helmet/security headers, rate limit/throttling, politica CSRF/cookie ampla, revisao de logs com PII e endurecimento adicional de producao, agora registrados em `SEC-HARD-01`;
- alterar contratos `@sadep/contracts`;
- alterar schema Prisma, seeds, dados demonstrativos, fakes, placeholders ou fallback visual;
- alterar frontend, CESAD, workflow, homologacao, assinatura ou regras processuais;
- implementar CSRF token dedicado ou integracao com provedor externo.

## Evidencias / referencias

- `apps/backend/src/config/env.validation.ts` contem as validacoes endurecidas de `FRONTEND_ORIGIN`, `COOKIE_DOMAIN` e `COOKIE_PATH`.
- `apps/backend/src/config/env.validation.spec.ts` cobre configuracoes validas e rejeicoes operacionais.
- `apps/backend/jest.config.js` inclui specs de `src/config`.
- `docs/setup/local-setup.md` documenta as restricoes operacionais para ambiente local/producao.

## Validacoes executadas

- `npm run test:unit --workspace @sadep/backend -- env.validation.spec.ts`;
- `npm run typecheck --workspace @sadep/backend`;
- `npm run typecheck:spec --workspace @sadep/backend`;
- `npm run test --workspace @sadep/backend`;
- `npm run backend:build`;
- `git diff --check`.

## Proxima acao

Seguir para `BE-SEC-03` quando a prioridade for seguranca CESAD contextual. Tratar `SEC-HARD-01` quando a prioridade for hardening HTTP amplo. Tratar `NOM-AEP-COOKIE-01` separadamente se a prioridade for apenas nomenclatura tecnica residual do cookie.
