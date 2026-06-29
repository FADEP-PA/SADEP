# BE-AUDIT-AUTH-01 — Auditoria persistida de eventos de autenticacao

## Status

**Encerrado** (2026-06-29).

## Area

Backend, autenticacao, auditoria e seguranca.

## Contexto

`BE-ARCH-01F` foi concluida no recorte de logs estruturados e testes de autenticacao. Essa conclusao nao equivale a auditoria institucional persistida de eventos de autenticacao.

Esta task registra a evolucao futura para persistir eventos relevantes de auth quando a politica de auditoria do projeto exigir esse nivel de rastreabilidade.

## Escopo previsto

- avaliar se eventos de auth devem usar `AuditEvent` ou modelo especifico;
- persistir eventos de login bem-sucedido e falho;
- persistir refresh aceito, rejeitado e rotacionado;
- persistir reuso detectado e revogacao por familia;
- persistir logout efetivo e logout idempotente relevante;
- registrar metadados minimos sem armazenar senha, access token ou refresh token puro;
- criar testes para persistencia e ausencia de dados sensiveis.

## Fora do escopo

- reabrir `BE-ARCH-01F`;
- alterar politica de cookies/CORS/env;
- implementar SIEM externo;
- alterar workflow processual, CESAD, documentos ou homologacao;
- armazenar tokens ou senhas em texto puro.

## Criterios de aceite

- eventos persistidos possuem usuario quando identificavel, role, data/hora, acao, sessao/familia quando aplicavel, IP/user-agent quando disponiveis e motivo de rejeicao/revogacao;
- dados sensiveis nao aparecem em log persistido;
- testes cobrem sucesso, falha, refresh, reuso e logout;
- a documentacao deixa claro o limite entre log operacional e auditoria persistida.

## Validacoes esperadas

- `npm run typecheck --workspace @sadep/backend`;
- `npm run typecheck:spec --workspace @sadep/backend`;
- testes backend de auth/auditoria;
- `npm run test --workspace @sadep/backend`;
- `git diff --check`.

## Dependencias

- `BE-ARCH-01F` concluida no recorte de logs/testes;
- politica de auditoria persistida do projeto;
- possivel revisao de `AuditEvent`.

## Decisao tomada

Modelo proprio `AuthAuditEvent` (nao reutiliza `AuditEvent` que requer `evaluationProcessId`).

## Implementacao (2026-06-29)

- Schema: enum `AuthAuditEventType` (LOGIN_SUCCESS, LOGIN_FAILURE, REFRESH_ACCEPTED, REFRESH_REJECTED, REUSE_DETECTED, LOGOUT, LOGOUT_IDEMPOTENT) + modelo `AuthAuditEvent` com indices em `(eventType, occurredAt)`, `(userId, occurredAt)`, `sessionId` e `familyId`.
- Migration: `20260629100000_add_auth_audit_event`.
- `AuthAuditService.persistAsync()` — fire-and-forget, nunca lanca excecao, nao armazena tokens/senhas.
- `AuthService` — chama `persistAsync` apos cada `logAuthWarning`/`logAuthInfo` existente, com payload minimo (userId quando identificavel, sessionId, familyId, IP, userAgent, failureReason).
- Testes: `auth-audit.service.spec.ts` — 7 casos cobrindo sucesso, falha, refresh, reuso, logout, fire-and-forget e ausencia de dados sensiveis.
