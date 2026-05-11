# BE-ARCH-01F — Auditar e testar eventos de autenticacao

## Status

Concluida no recorte backend de eventos estruturados de auth.

## Area

Backend, sessao/auth e observabilidade.

## Fonte de transicao

- [`../../backend-implementation-tracker.md`](../../backend-implementation-tracker.md)
- [`../active.md`](../active.md)
- [`../../cross-cutting/active-problems.md`](../../cross-cutting/active-problems.md)

## Contexto

A frente maior `BE-ARCH-01` ja havia entregue revalidacao de usuario atual, refresh token persistido, rotacao, logout server-side e integracao frontend com access token em memoria. A pendencia remanescente `BE-ARCH-01F` era auditar e testar eventos de autenticacao sem reabrir contracts, frontend, CESAD, workflow ou regras processuais.

## Escopo realizado

- adicionados eventos estruturados de auth no `AuthService`;
- cobertos eventos de login com sucesso e falha;
- cobertos eventos de refresh aceito, refresh rejeitado e reuso detectado;
- cobertos eventos de logout efetivo e logout idempotente sem sessao;
- cobertos eventos de rejeicao de access token por usuario inexistente, inativo ou role divergente;
- adicionados testes unitarios para os eventos de autenticacao e para ausencia de senha nos logs.

## Fora do escopo

- alteracao de contratos `@sadep/contracts`;
- alteracao de schema Prisma ou tabela `AuditEvent`;
- persistencia formal dos eventos de autenticacao como auditoria institucional, agora registrada em `BE-AUDIT-AUTH-01`;
- alteracao de cookies/CORS/env da `BE-ARCH-01E5`;
- frontend, UX, dados demonstrativos, fakes, placeholders ou fallback visual;
- CESAD, workflow, homologacao, assinatura e regras processuais.

## Evidencias / referencias

- `apps/backend/src/auth/auth.service.ts` emite eventos JSON com codigos estaveis como `AUTH_LOGIN_SUCCEEDED`, `AUTH_REFRESH_REJECTED`, `AUTH_REFRESH_REUSE_DETECTED`, `AUTH_LOGOUT_SUCCEEDED` e `AUTH_ACCESS_TOKEN_REJECTED`.
- `apps/backend/src/auth/auth.service.spec.ts` valida os eventos emitidos e confirma que a senha recebida no login rejeitado nao aparece nos logs.
- Os eventos nao registram access token nem refresh token em texto puro.

## Validacoes executadas

- `npm run test:unit --workspace @sadep/backend -- auth.service.spec.ts`;
- `npm run typecheck --workspace @sadep/backend`;
- `npm run typecheck:spec --workspace @sadep/backend`;
- `npm run test --workspace @sadep/backend`;
- `npm run backend:build`;
- `git diff --check`.

## Proxima acao

Nao reabrir `BE-ARCH-01F` para novos destinos de observabilidade, SIEM, persistencia formal de eventos de auth ou auditoria juridico-processual. Esses itens devem seguir por task propria, especialmente `BE-AUDIT-AUTH-01`.
