# SEC-HARD-02 — Proximo recorte de hardening de backend (headers, rate limit, CSRF, erros e testes)

## Status

**Implementado** (2026-08-22) — aguardando revisao.

## Area

Backend, seguranca, hardening HTTP.

## Contexto

`SEC-HARD-01` encerrou em 2026-06-29 com Helmet/CSP, throttling basico de auth, Origin-check parcial de CSRF e sanitizacao inicial de logs (`SEC-LOG-PII-01`). Este recorte executa o proximo passo previsto no `relatorio-seguranca-2026-05-15.md`, priorizando:

1. cobertura automatizada dos controles existentes (inexistente até entao);
2. fechamento das lacunas remanescentes de headers, CSRF e exposicao de erros;
3. reparo minimo da infraestrutura de teste de integracao, que estava inexecutavel desde a migracao do schema para PostgreSQL.

## Escopo implementado

### Centralizacao do bootstrap de seguranca

- Novo modulo `apps/backend/src/app/security-bootstrap.ts` com `applySecurityMiddleware(app, appConfigService)`:
  - Helmet com CSP identica ao recorte anterior (`upgradeInsecureRequests` condicional a producao);
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()` via middleware proprio (helmet 8.2 nao oferece a opcao);
  - body parsers explicitos (`json`, `urlencoded`) com limite de **1mb** (antes: default implicito do Express);
  - mapeamento de `PayloadTooLargeError` para resposta JSON **413**;
  - CORS restrito a `FRONTEND_ORIGIN` com credenciais.
- `main.ts` passa a usar a funcao — fonte unica exercida tambem pelos testes de integracao.

### Reforco CSRF (rotas cookie-based)

- `validateCsrfOrigin` em `/auth/refresh` e `/auth/logout` agora **exige** `Origin` ou `Referer` cuja origem bata com `FRONTEND_ORIGIN`; ausencia de ambos => `403 Invalid request origin`.
- Mudanca de contrato observavel: clientes nao-browser (scripts/curl) sem esses headers passam a receber 403. O frontend browser sempre envia `Origin` em POST cross-origin.
- Decisao consciente: rejeicoes CSRF (403) e throttling (429) permanecem **log-only**, sem evento persistido em `AuthAuditEvent`, evitando write-amplification como vetor de DoS. As tentativas que alcancam o service continuam auditadas normalmente.

### Exposicao de informacoes em erros

- `GlobalExceptionFilter` ganhou opcao `maskInternalErrors`: quando ativa (producao), respostas com status >= 500 retornam corpo generico (`Internal server error` / `Internal Server Error`, `details` suprimido).
- Log servidor-side preserva mensagem real + stack para diagnostico.
- Verificado que mensagens de login ja sao uniformes (`Invalid credentials`) — sem enumeracao de usuarios.

### Rate limit

- Revisado e mantido: global 120 req/min (`APP_GUARD`), login 10/min, refresh 30/min, logout 20/min. Sem overrides adicionais em endpoints de processo nesta etapa (global cobre).

## Fora do escopo

- `SEC-FIND-04` (migracao JWT para `jose`), `SEC-FIND-07` (parametros scrypt/argon2id), `SEC-FIND-09` (lockout progressivo), `SEC-FIND-12` (PII no payload do JWT), `SEC-FIND-15` (revogacao de access token) — tasks proprias futuras.
- Politica de senha, reset, MFA (`SEC-OBS-02..04`).
- Configuracao de `trust proxy` (deploy-specific; nota operacional abaixo).
- Correcao da semantica transacional SQLite-vs-Postgres em `ProcessDocumentsService.createSignatureRecordIfMissing` (ver "Divida pre-existente").

## Testes

- **Unitario** `src/common/filters/global-exception.filter.spec.ts`: corpo sanitizado para erros nao-HTTP, passthrough controlado de 4xx, mascaramento 5xx com log preservado. `jest.config.js` ampliado para `src/common/**`.
- **Integracao** `src/auth/security-hardening.endpoint.spec.ts` (registrada em `run.ts`):
  - headers de seguranca em `/health` e respostas de erro (CSP, nosniff, XFO SAMEORIGIN, HSTS, Referrer-Policy, Permissions-Policy, COOP);
  - CORS: origem confiavel autorizada; origem estranha jamais refletida;
  - payload > 1mb => 413; payload normal segue fluxo;
  - matriz CSRF: Origin invalida/ausente/Referer malicioso => 403; Referer valido e Origin validas => fluxo normal; logout sem Origin => 403;
  - rate limit: 11a tentativa de login consecutiva => 429 com contrato de erro normalizado;
  - uniformidade de mensagem para usuario inexistente vs senha errada (anti-enumeracao).
- `auth.endpoint.spec.ts` atualizado ao novo contrato CSRF (header Origin nas rotas cookie-based).

## Reparos pre-existentes na infra de teste (necessarios para qualquer execucao)

O harness de integracao estava inexecutavel na branch desde a migracao do Prisma para `postgresql` (quebra confirmada por stash antes/depois deste recorte):

- `createTestContext` provisionava arquivos SQLite contra schema PostgreSQL. Agora cria **banco PostgreSQL isolado por suite** (`sadep_test_<nome>`, DROP/CREATE via CLI Prisma contra URL admin resolvida de `SADEP_TEST_DATABASE_URL`, `.env` local ou default do docker-compose); `disposeTestContext` remove com `WITH (FORCE)`.
- `ProcessesService` recebia `{}` nos services de etapa; agora recebe `ProcessStageService` e `StageClosureGuardService` reais.
- `createActiveCesadCommission` usava nome fixo em campo `@unique`; agora sufixo sequencial.

### Divida pre-existente remanescente (fora deste recorte)

`processes.service.spec.ts` falha em `createSignatureRecordIfMissing` (`process-documents.service.ts:2226`): o padrao catch-and-continue de `P2002` dentro de transacao nao funciona em PostgreSQL (erro `25P02`, transacao abortada). Exige decisao de implementacao na camada de documentos/assinaturas (task propria sugerida: `BE-DOC-PGTX-01`). Suites anteriores a essa falha (auth, security hardening) passam integralmente.

## Validacoes executadas (2026-08-22)

- `npm run typecheck --workspace @sadep/backend` — OK
- `npm run typecheck:spec --workspace @sadep/backend` — OK
- `npm run build --workspace @sadep/backend` — OK
- `npm run test:unit --workspace @sadep/backend` — 84/84
- `npm run test:integration --workspace @sadep/backend` — suites auth + security hardening verdes; execucao posterior interrompida pela divida pre-existente descrita acima
- `git diff --check` — OK

## Nota operacional

Atras de reverse proxy/load balancer, configurar `trust proxy` no Express para que o rate limit por IP e os registros de `ipAddress` em sessao/auditoria reflitam o IP real do cliente. Recorte futuro de deploy.
