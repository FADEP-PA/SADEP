# Relatório de Segurança — SADEP

> Data da varredura: 2026-05-15.
> Branch analisada: `develop` (HEAD `9fe01c4 test(frontend): cover AuthProvider bootstrap, signIn, signOut and refreshSession cycle (FE-TEST-01F)`).
> Tipo: análise estática de código, dependências, configuração e modelo de ameaças.
> Escopo: monorepo `apps/backend` (NestJS 11), `apps/frontend` (Next.js 15.5.15), `apps/cron`, `apps/worker`, `packages/contracts`, `packages/config`.

---

## 1. Sumário executivo

O SADEP apresenta uma **postura de segurança sólida no núcleo de autenticação e autorização**, com escolhas defensivas explícitas e cobertura de testes para eventos sensíveis. As fundações de sessão (refresh token opaco com rotação, detecção de reuso por família, revogação transacional, `timingSafeEqual` no JWT, validação de role a cada request) são compatíveis com sistemas de valor jurídico-administrativo.

Por outro lado, **a borda HTTP e a cadeia de suprimentos não acompanham o mesmo nível de maturidade**. Há vulnerabilidades conhecidas na versão atual do Next.js, ausência completa de cabeçalhos de segurança no frontend, ausência de rate limit e CSRF explícitos no backend, ausência de Helmet, e PII em logs estruturados de auth. Esses pontos já estão **parcialmente** reconhecidos em `SEC-HARD-01` e `SEC-LOG-PII-01`, mas o escopo precisa ser ampliado e priorizado antes de homologação/produção.

**Severidade agregada:**

| Severidade | Quantidade |
| --- | --- |
| Crítico | 3 |
| Alto | 7 |
| Médio | 6 |
| Baixo | 5 |
| Observacional / Hardening | 7 |

**Próxima ação recomendada:** atualizar `next` para `15.5.18+` (correção não-major de 13 CVEs), depois priorizar `SEC-HARD-01` em recortes pequenos (helmet+headers → rate limit auth → política CSRF/Origin → PII em logs).

---

## 2. Metodologia

A varredura cobriu:

- mapeamento de superfície de ataque (rotas, controllers, guards, middlewares);
- revisão de autenticação, sessão, JWT, refresh, cookies, logout, revogação;
- revisão de autorização por role e autorização contextual CESAD;
- revisão de transporte (CORS, headers, secure cookies, HSTS, CSP);
- revisão de validação de entrada (parsing manual de DTOs, ParseIntPipe);
- revisão de segredos, configuração e variáveis de ambiente;
- revisão de logs, auditoria estruturada e exposição de PII;
- análise de dependências via `npm audit` e `npm outdated`;
- inspeção de uso de SQL bruto (`$queryRawUnsafe`, `$executeRawUnsafe`);
- inspeção de XSS no frontend (`dangerouslySetInnerHTML`, storage do navegador);
- revisão do `.gitignore` e arquivos versionados sensíveis.

A varredura **não cobriu**:

- pentest dinâmico (DAST) com tráfego real;
- análise binária de dependências transitivas;
- testes de carga ou DoS;
- revisão de configuração de deploy (Vercel/Railway/Docker/Kubernetes), pois ainda não há manifesto oficial no repositório;
- assinatura digital GOVBR (provedor `GOVBR` ainda como enum/futuro);
- análise da fila BullMQ e workers (ainda não executados no MVP — `BE-TECH-02` arquivado).

---

## 3. Mapa do sistema sob ótica de segurança

### 3.1. Camadas e entrypoints

- **Frontend** (`apps/frontend`, Next.js 15.5.15, React 19): rotas `app/` com áreas por perfil (`(authenticated)`, `(cesad-comissao)`, `(chefia-imediata)`, `(homologacao-autoridade)`, `(painel-gerencial-cesad)`, `(servidor-estagiario)`). Cliente HTTP em `shared/api/http-client.ts` com `credentials: 'include'` e bearer token mantido **em memória** (`shared/auth/access-token-store.ts`).
- **Backend** (`apps/backend`, NestJS 11): bootstrap em `apps/backend/src/main.ts:11`. CORS habilitado para `FRONTEND_ORIGIN` com credenciais. `AppModule` importa `AuthModule`, `CesadModule`, `ProcessesModule`, `HealthModule`.
- **Domain/Workflow** (`apps/backend/src/workflow`, `apps/backend/src/domain`, `apps/backend/src/processes`): regras de processo e state machine. Já cobertas por testes unitários e integração via `processes/tests/run.ts`.
- **Persistência** (`apps/backend/prisma/schema.prisma`): SQLite local (`dev.db`), Prisma 6. Modelos com PII: `User` (email, name), `UserSession` (ipAddress, userAgent), `CesadStageOpinionExpectedSigner` (emailSnapshot, nameSnapshot), `CesadFinalOpinionExpectedSigner` (idem).
- **Worker/Cron** (`apps/worker`, `apps/cron`): estrutura reservada, sem execução no MVP.

### 3.2. Endpoints sensíveis identificados

Os controllers abaixo manipulam dados controlados e/ou modificam estado do processo administrativo:

| Controller | Caminho | Guard | Autorização contextual |
| --- | --- | --- | --- |
| `AuthController` | `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me`, `/auth/admin-check` | `JwtAuthGuard` em rotas autenticadas; sem rate limit | role ADMIN apenas em `admin-check` |
| `ProcessesController` | `/processes/:id/*` | `JwtAuthGuard` | delegada ao service |
| `SupervisorEvaluationsController` | `/processes/:id/supervisor-evaluation/*` | `JwtAuthGuard` | delegada ao service |
| `SelfEvaluationsController` | `/processes/:id/self-evaluation/*` | `JwtAuthGuard` | delegada ao service |
| `CesadStageOpinionsController` | `/processes/:id/stages/:sequence/cesad-stage-opinion/*` | `JwtAuthGuard` | `CesadContextAuthorizationService` |
| `CesadFinalOpinionsController` | `/processes/:id/cesad-final-opinion/*` | `JwtAuthGuard` | `CesadContextAuthorizationService` |
| `ProcessDocumentsController` | `/processes/:id/supervisor-evaluation/sign` | `JwtAuthGuard` | delegada ao service |
| `CesadCommissionsController` | `/cesad/commissions/*` | `JwtAuthGuard` | role ADMIN no controller |
| `CesadCurrentCommissionController` | `/cesad/commissions/current` | `JwtAuthGuard` | role ADMIN/CESAD_MEMBER/COMMISSION_ASSISTANT no controller |
| `CesadCommissionMembersController`, `CesadCommissionActsController` | `/cesad/commissions/...` | `JwtAuthGuard` | delegada ao service |
| `CesadStageReadController` | `/cesad/stages/...` | `JwtAuthGuard` | delegada ao service |
| `HealthController` | `/health` | **público** | n/a |

### 3.3. Dados sensíveis (PII e jurídicos)

- e-mail institucional do servidor avaliado, chefias, membros CESAD e autoridade homologadora;
- nome completo dos atores do processo;
- IP e User-Agent registrados em `UserSession.ipAddress`, `UserSession.userAgent`;
- pareceres, autoavaliações, avaliações de chefia (texto livre, possivelmente sensível);
- documentos processuais assinados (`SignatureRecord`), com efeito jurídico-administrativo;
- snapshots de signatários esperados (`*ExpectedSigner.emailSnapshot/nameSnapshot`).

### 3.4. Confiança em fronteiras externas

- **Provedor de assinatura GOVBR**: enum existe (`SignatureProvider.GOVBR`), implementação real ainda fora de escopo do MVP. O backend ainda registra todas as assinaturas como `INTERNAL` na prática (a confirmar quando a integração começar).
- **Não há e-mail/SMTP real, fila distribuída em uso ou storage externo de documentos** no recorte ativo. `BullMQ` está nas configurações, mas worker não roda em produção.

---

## 4. Achados por severidade

Os achados estão numerados com prefixo `SEC-FIND-XX` para rastreabilidade em tasks futuras. As referências `[file:line]` apontam para o estado atual da branch `develop`.

### 4.1. Críticos

#### SEC-FIND-01 — Next.js 15.5.15 com 13 vulnerabilidades conhecidas

- **Componente:** `apps/frontend` (`next@15.5.15`).
- **Risco:** bypass de middleware/proxy em App Router via rotas de segment-prefetch (CVE-2025 `GHSA-26hh-7cqf-hhc6`, score 7.5); SSRF via WebSocket upgrade (`GHSA-c4j6-fc7j-m34r`, score 8.6); DoS via Server Components (`GHSA-8h8q-6873-q5fj`); DoS via Cache Components (`GHSA-mg66-mrh9-m8jx`); bypass de middleware via dynamic route parameter injection (`GHSA-492v-c6pp-mqqv`, score 8.1); bypass de middleware via i18n (`GHSA-36qx-fr4f-26g5`); XSS em CSP nonces (`GHSA-ffhc-5mcf-pf4q`); XSS em `beforeInteractive` (`GHSA-gx5p-jg67-6x7h`); cache poisoning RSC (`GHSA-wfc6-r584-vfw7`); cache poisoning collisions (`GHSA-vfv6-92ff-j949`); DoS em Image Optimization API (`GHSA-h64f-5h5j-jqjh`); cache poisoning redirects (`GHSA-3g8h-86w9-wvmq`); bypass adicional segment-prefetch (`GHSA-267c-6grr-h53f`).
- **Impacto direto:** rotas autenticadas podem ser potencialmente acessadas sem passar pela checagem de middleware/guards do Next; SSRF possível em deploy com Image Optimization habilitada.
- **Correção:** `npm install next@15.5.18 -w @sadep/frontend`. Fix **não-major**, sem breaking changes esperados.
- **Validação:** `npm run frontend:check`, `npm run frontend:test:run`, `npm audit` deve cair para zero alta após upgrade.

#### SEC-FIND-02 — Ausência de rate limit em `/auth/login` e endpoints de auth

- **Componente:** `apps/backend/src/auth/auth.controller.ts:50`.
- **Risco:** ataque de força bruta sem qualquer barreira. Combinado com falta de bloqueio por conta (`SEC-FIND-09`), permite enumeração de credenciais a custo zero.
- **Evidência:** `grep` por `helmet|rate-limit|csrf|throttler` em `apps/backend` retorna **zero matches**. `AppModule` em `apps/backend/src/app/app.module.ts:11` não importa `ThrottlerModule`.
- **Correção:** adotar `@nestjs/throttler` (ou middleware Express) com política diferenciada — agressiva em `/auth/login` (por IP + por email-hash), moderada em demais rotas. Documentar limites em `SEC-HARD-01`.
- **Referência existente:** `SEC-HARD-01` lista rate limit como recorte previsto.

#### SEC-FIND-03 — Ausência de defesa CSRF explícita em endpoints autenticados por cookie

- **Componente:** `apps/backend/src/auth/auth.controller.ts:70` (`/auth/refresh`); `apps/backend/src/auth/auth.controller.ts:103` (`/auth/logout`).
- **Risco:** `/auth/refresh` é POST autenticado **somente por cookie HttpOnly**. `SameSite=lax` mitiga ataques cross-site convencionais, mas não é defesa completa contra:
  - subdomínios maliciosos hospedados no mesmo eTLD+1 quando `COOKIE_DOMAIN` for compartilhado;
  - cross-site POST via formulário top-level (lax permite POSTs top-level GET, não POST cross-site, mas configurações antigas de browser podem variar);
  - bugs em browsers ou extensões que relaxem `SameSite`.
- **Estado atual:** CORS já restringe origem (`enableCors({ origin: appConfigService.frontendOrigin, credentials: true })`, `apps/backend/src/main.ts:20`), o que ajuda, mas CORS é apenas defesa de browser e não substitui CSRF token / verificação de `Origin`/`Referer`.
- **Correção mínima:** validar header `Origin` ou `Referer` em `/auth/refresh` e `/auth/logout`, rejeitando quando não bate com `FRONTEND_ORIGIN`. Correção robusta: emitir CSRF token double-submit no login e exigi-lo em refresh/logout/outras rotas mutativas.
- **Referência existente:** `SEC-HARD-01` lista CSRF como recorte previsto.

### 4.2. Altos

#### SEC-FIND-04 — Implementação artesanal de JWT (HS256)

- **Componente:** `apps/backend/src/auth/auth.service.ts:320` (`verifyToken`), `apps/backend/src/auth/auth.service.ts:410` (`signToken`).
- **Risco:** implementação manual de JWT, mesmo com `timingSafeEqual` e validação rigorosa de header `alg/typ`, é superfície de risco contra confusão de algoritmo, ausência de validação `nbf`/`iss`/`aud`, ausência de suporte a `kid` para rotação de chave. Erros sutis podem habilitar bypass em refator futuro.
- **Estado atual:** implementação correta no recorte atual; valida `alg === 'HS256'`, rejeita tokens com mais de 3 partes, valida `exp`, usa `timingSafeEqual`. Mas não há suporte a múltiplas chaves ativas (rotação) e payload do JWT carrega `email` + `name` (vazamento de PII se token for capturado).
- **Correção:** migrar para `jose` (`@panva/jose`) — biblioteca padrão para JWT/JWS em Node moderno, sem dependências; ou `jsonwebtoken` se preferir cobertura tradicional. Reduzir o payload do JWT para `sub` + `role` (resolver `email`/`name` server-side via `resolveAuthenticatedUser`, que já é chamado em todo guard). Adicionar suporte a `kid` para rotação operacional do `JWT_SECRET`.
- **Risco residual aceitável:** se a migração for adiada, manter cobertura de testes existente e revisar a cada upgrade de Node (compatibilidade com `crypto.subtle`).

#### SEC-FIND-05 — Ausência de cabeçalhos de segurança HTTP no frontend

- **Componente:** `apps/frontend/next.config.ts:7`.
- **Risco:** o Next.js, por default, **não** envia CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy nem Cross-Origin-Opener-Policy. Sem CSP, qualquer vulnerabilidade de XSS (incluindo as do `SEC-FIND-01`) escala para execução completa.
- **Estado atual:** `nextConfig` define apenas `reactStrictMode`, `transpilePackages` e `outputFileTracingRoot`. Não há função `headers()` exportada, nem middleware central.
- **Correção:** adicionar `async headers()` em `next.config.ts` com:
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (somente em produção/HTTPS);
  - `Content-Security-Policy` com `default-src 'self'`, `script-src 'self' 'nonce-...'` (Next.js suporta nonces nativos), `connect-src 'self' ${BACKEND_ORIGIN}`, `frame-ancestors 'none'`;
  - `X-Content-Type-Options: nosniff`;
  - `Referrer-Policy: strict-origin-when-cross-origin`;
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`;
  - `X-Frame-Options: DENY` (redundante com `frame-ancestors`, mas defensivo).
- **Validação:** Mozilla Observatory ou `curl -I` em endpoint de produção.

#### SEC-FIND-06 — Ausência de Helmet ou cabeçalhos de segurança no backend

- **Componente:** `apps/backend/src/main.ts:10`.
- **Risco:** respostas do backend (mesmo as de erro do `GlobalExceptionFilter`) e respostas de `/health` não vêm com `X-Content-Type-Options`, `Strict-Transport-Security`, `Cross-Origin-*`. Se o backend ficar exposto em domínio próprio (`api.instituicao.gov.br`), browsers tratam recursos sem proteção.
- **Estado atual:** `grep` por `helmet` em `apps/backend` retorna zero matches.
- **Correção:** `npm i helmet -w @sadep/backend` e em `main.ts` antes do `enableCors`: `app.use(helmet({ contentSecurityPolicy: false }))` (CSP do backend pode ser configurado separadamente, pois o consumo é primariamente JSON).
- **Validação:** `curl -I https://api/health` após deploy, verificar headers.

#### SEC-FIND-07 — `scrypt` sem parâmetros explícitos (cost factor `N`)

- **Componente:** `apps/backend/src/common/security/password-hasher.ts:11,23`.
- **Risco:** `crypto.scrypt(password, salt, KEY_LENGTH)` sem `options` usa defaults do Node: `N=16384` (2^14), `r=8`, `p=1`. OWASP Cheat Sheet (2025) recomenda `N>=2^17` para scrypt em senhas, ou migrar para Argon2id com `m=19MB, t=2, p=1`. Custo atual é insuficiente para defender contra GPUs modernas.
- **Adicional:** hash atual usa `${prefix}$${salt}$${hex}` sem armazenar `N`, `r`, `p`. Isto inviabiliza upgrade de parâmetros sem migração explícita.
- **Correção:** alterar `hashPassword` para passar `{ N: 2**17, r: 8, p: 1 }` e armazenar parâmetros no hash: `scrypt$N=131072,r=8,p=1$salt$hash`. `verifyPassword` deve ler os parâmetros do hash e fazer rehash quando custo < target. Avaliar migração para `argon2` (dependência nativa, mas padrão atual).

#### SEC-FIND-08 — PII em logs estruturados de autenticação

- **Componente:** `apps/backend/src/auth/auth.service.ts:87,97,113,608-621`.
- **Risco:** logs de eventos `AUTH_LOGIN_SUCCEEDED`, `AUTH_LOGIN_FAILED`, `AUTH_REFRESH_*` incluem `email` em texto puro. Logs típicos em produção são roteados para sistemas multi-tenant (CloudWatch, Loki, Datadog), aumentando o blast radius de PII vazada.
- **Já reconhecido:** `SEC-LOG-PII-01` (cross-cutting/tasks).
- **Correção:** pseudonimizar e-mail via hash determinístico curto (SHA-256 truncado em 12 chars, com salt server-side); registrar `userId` quando disponível em vez de `email`. Garantir `ipAddress` truncado (`192.168.1.X` ou `pseudo-hash`) ou remover quando não houver requisito de auditoria.
- **Adicional:** o filtro global (`apps/backend/src/common/filters/global-exception.filter.ts:43`) registra `stack` em qualquer `Error`, incluindo `UnauthorizedException`. Como exceções esperadas (`401`, `403`) são fluxo normal, isto polui logs e pode expor mensagens internas. Diferenciar logging por código HTTP.

#### SEC-FIND-09 — Ausência de bloqueio por tentativas falhas (account lockout / progressive delay)

- **Componente:** `apps/backend/src/auth/auth.service.ts:77`.
- **Risco:** sem rate limit (`SEC-FIND-02`) e sem lockout, um atacante pode tentar senhas sem custo. Mesmo com `scrypt`, força bruta online via N tentativas/segundo por conta é eficaz para senhas fracas.
- **Correção:** registrar tentativas falhas em campo `User.failedLoginAttempts` + `User.lockedUntil`. Lockout exponencial (1min, 5min, 30min, ...) após 5 falhas. Reset em login bem-sucedido. Alternativa parcial: rate limit por `(IP, email-hash)` cobre boa parte, mas lockout protege contra distribuição de IP (botnet).
- **Recomendação:** combinar com `SEC-FIND-02`. Avaliar com a equipe se lockout permanente é aceitável (DoS de conta) ou se janela deslizante é melhor.

#### SEC-FIND-10 — Ausência de limites explícitos de tamanho de body / payload

- **Componente:** `apps/backend/src/main.ts:11` (sem `app.use(json({ limit: ... }))`).
- **Risco:** NestJS sobre Express usa default de `100kb` para body parser, mas o sistema processa pareceres com texto livre (`reportText`, `legalBasis`, `finalConclusion`, `recommendation`) e blobs de critérios em `content` (JSON). Sem limite explícito documentado, requisições maliciosas podem inflar payloads para esgotar memória (especialmente combinado com falta de rate limit).
- **Correção:** definir explicitamente `app.use(json({ limit: '1mb' }))` e `app.use(urlencoded({ limit: '1mb', extended: true }))` em `main.ts`. Documentar limite em ADR/setup quando estabilizar.

### 4.3. Médios

#### SEC-FIND-11 — `postcss < 8.5.10` com vulnerabilidade XSS moderada

- **Componente:** `postcss` (transitiva via `next`).
- **Risco:** `GHSA-qx2v-qp2m-jg93` — `</style>` não escapado em stringify pode produzir saída exploitável quando CSS gerado for embutido em HTML sem sanitização adicional.
- **Correção:** corrigida automaticamente pelo upgrade de `SEC-FIND-01` (`next@15.5.18` puxa `postcss` corrigido). Já existe task `DX-POSTCSS-01` no roadmap cross-cutting.

#### SEC-FIND-12 — JWT carrega `email` e `name` no payload

- **Componente:** `apps/backend/src/auth/auth.service.ts:103,413`.
- **Risco:** token de acesso pode ser inspecionado por qualquer um (base64 do payload é trivialmente decodável). Captura do token (XSS, MITM em redes públicas, vazamento via `Referer` quando enviado por engano) expõe `email` e `name` do usuário, além de `role` e `sub`.
- **Correção:** reduzir o JWT para `sub`, `role`, `iat`, `exp`. `resolveAuthenticatedUser` (já chamado por todos os guards) hidrata `email` e `name` do banco em cada request. Custo: 1 round-trip por request autenticado já existe — sem regressão de performance.

#### SEC-FIND-13 — `GlobalExceptionFilter` repassa `message` arbitrário ao cliente

- **Componente:** `apps/backend/src/common/filters/global-exception.filter.ts:40,49`.
- **Risco:** o filtro retorna `message` extraído de `exception.getResponse()` para o cliente. Para exceções com mensagem rica (ex.: `BadRequestException` aninhada com detalhes), mensagens internas podem vazar. Para erros não-HTTP, retorna `exception.message` (cuidado: pode incluir SQL truncado, paths internos, etc.).
- **Correção:** em modo produção (`appConfigService.nodeEnv === 'production'`), mascarar `message` quando status >= 500 (`"Internal server error"` genérico); preservar `details` apenas para `BadRequestException` controladas pelos próprios controllers. Loggar internamente com stack, mas não expor.

#### SEC-FIND-14 — Persistência em SQLite no recorte atual

- **Componente:** `apps/backend/prisma/schema.prisma:5`, `DATABASE_URL="file:./dev.db"`.
- **Risco:** SQLite é adequado para desenvolvimento local. Para um sistema com efeito jurídico (assinaturas, auditoria, decisões administrativas), SQLite **não** atende requisitos de concorrência, replicação, backup transacional online, auditoria de acesso ao banco, hardening de TLS e ACID multi-writer. Não é vulnerabilidade ativa no recorte atual; é alerta de prontidão.
- **Correção:** definir provider Postgres em ADR para homologação/produção; manter SQLite somente para dev/test. Avaliar `pgBouncer`/connection pooling e configuração de SSL no `DATABASE_URL`.
- **Não bloqueia o MVP**, mas deve ser tratado antes de habilitar usuários reais.

#### SEC-FIND-15 — Ausência de revogação direta de access tokens emitidos

- **Componente:** `apps/backend/src/auth/auth.service.ts:320` (`verifyToken`).
- **Risco:** se um access token é vazado (XSS, log indevido, dispositivo comprometido), a única defesa é esperar `ACCESS_TOKEN_TTL_SECONDS` (default 1h). Não há lista de tokens revogados nem checagem de "jti" contra cache.
- **Mitigação parcial existente:** `resolveAuthenticatedUser` já valida a cada request se `user.isActive` e `user.role === tokenUser.role`. Logout server-side da família revoga refresh, mas não invalida access tokens pendentes.
- **Correção:** opcional mas valioso — adicionar campo `User.accessTokenVersion` (int). Incluir no JWT como `tv`. Em `resolveAuthenticatedUser`, comparar `payload.tv === user.accessTokenVersion`. Em logout/revogação, incrementar `accessTokenVersion`. Custo: 1 update por logout, zero alteração no caminho feliz.

#### SEC-FIND-16 — `health` endpoint público sem autenticação nem rate limit

- **Componente:** `apps/backend/src/health/health.controller.ts:5`.
- **Risco:** endpoint usado por load balancers/probes; pode ser usado para fingerprinting da aplicação (revela versão, dependências via mensagens de erro, etc.). Sem rate limit, alvo de DoS.
- **Correção:** manter público (necessário para probes), mas:
  - retornar payload mínimo (`{ status: "ok" }`) sem versão nem detalhes;
  - aplicar rate limit (mesma política do `SEC-FIND-02`, porém mais permissiva para probes).

### 4.4. Baixos

#### SEC-FIND-17 — `@prisma/client` e `prisma` na versão 6.19.3 (latest é 7.8.0)

- **Componente:** `apps/backend/package.json:32`.
- **Risco:** não há CVE crítica reportada na linha 6.x atual. Upgrade para 7.x exige avaliação de breaking changes (driver adapters, removeu Migrate/Studio interativos, etc.). Sem urgência, mas planejar.

#### SEC-FIND-18 — Cookie path default `/auth` limita refresh mas não detecta cookie em path errado

- **Componente:** `apps/backend/src/auth/session-cookie.ts:84`, `apps/backend/src/config/env.validation.ts:88`.
- **Risco:** o cookie `aep_pa_refresh` é enviado apenas em rotas `/auth/*`, o que limita superfície de CSRF. Mas se alguém mover o cookie para `/`, todas as outras rotas passam a recebê-lo desnecessariamente. Não há monitoramento.
- **Correção:** manter `/auth` como path explícito em produção. Adicionar log de aviso quando `COOKIE_PATH === '/'` em produção.

#### SEC-FIND-19 — Nome de cookie ainda usa prefixo legado `aep_pa_`

- **Componente:** `apps/backend/.env.example:14`, `apps/backend/src/config/env.validation.ts:64`.
- **Risco:** padronização. Já reconhecido em `NOM-AEP-COOKIE-01`. Não é vulnerabilidade, mas a inconsistência pode confundir operadores em incidente.

#### SEC-FIND-20 — `dotenv` listado como devDependency

- **Componente:** `apps/backend/package.json:37`.
- **Risco:** se `dotenv` for usado para carregar `.env` em produção, ele precisa ser dependência runtime. Atualmente está em devDependencies — pode quebrar carga de `.env` em deploy Docker minimal.
- **Estado atual:** `ConfigModule.forRoot()` do NestJS já carrega `.env` automaticamente em dev. Em produção típica, variáveis vêm do ambiente do orquestrador (não de `.env`). Mas se algum runbook usar `.env` em produção, validar.
- **Correção:** documentar política em `setup/local-setup.md` e em runbook de deploy. Mover para dependencies se necessário.

#### SEC-FIND-21 — `next.config.ts` não define `poweredByHeader: false`

- **Componente:** `apps/frontend/next.config.ts:7`.
- **Risco:** fingerprinting trivial. Header `X-Powered-By: Next.js` revela stack.
- **Correção:** adicionar `poweredByHeader: false` ao `nextConfig`.

### 4.5. Observacionais / Hardening

#### SEC-OBS-01 — Ausência de CI com gates de segurança

- Existe task `CI-GATES-01` no cross-cutting. Reforçar com gate de `npm audit --audit-level=high`, lint de segurança (`eslint-plugin-security`, `eslint-plugin-no-unsanitized`), bloqueio de PR quando há vulnerabilidades altas/críticas.

#### SEC-OBS-02 — Sem política de senhas mínima

- `apps/backend/src/auth/auth.controller.ts:60` aceita qualquer string como senha. Não há requisitos mínimos (tamanho, classes, denylist de senhas comuns).
- Recomendação: aplicar política em `hashPassword` (chamado em criação/troca de senha), mínimo 12 caracteres, comparar com lista `haveibeenpwned` ou top-1000 weak. Não validar no JWT/login (proporcionar UX).

#### SEC-OBS-03 — Sem fluxo formalizado de troca/recuperação de senha

- Não há endpoint de troca de senha nem reset. Quando for implementado, deverá usar token de uso único com TTL curto (≤ 30min), com e-mail validado, com rate limit agressivo e com invalidação de todas as sessões ativas após troca.

#### SEC-OBS-04 — Sem MFA / 2FA

- Sistema com efeito jurídico, em ambiente público, deveria ofertar MFA pelo menos para perfis `ADMIN`, `HOMOLOGATION_AUTHORITY` e `CESAD_MEMBER`. Avaliar TOTP (RFC 6238) ou integração GOV.BR.

#### SEC-OBS-05 — Logs sem correlation ID por request

- `GlobalExceptionFilter` e `AppLogger` não emitem ID de request. Investigação de incidente fica difícil. Adicionar middleware que injeta `X-Request-Id` em todo log estruturado.

#### SEC-OBS-06 — Pasta `.env` local presente no FS de desenvolvedor

- `apps/backend/.env` existe (ignorada via `.gitignore:76`). Confirmado **não rastreada**. Lembrete: nunca commitar; usar `.env.example` como referência.

#### SEC-OBS-07 — Pasta `.claude/worktrees/...` contém cópia de `.env.example`

- Não é vulnerabilidade; é caching local da ferramenta. Garantir que worktrees não vazem secrets em PR.

---

## 5. Tabela consolidada

| ID | Severidade | Componente | Estado | Task associada |
| --- | --- | --- | --- | --- |
| SEC-FIND-01 | Crítico | `next@15.5.15` | Aberto | criar `SEC-DEP-NEXT-01` |
| SEC-FIND-02 | Crítico | rate limit ausente | Aberto / parcial | `SEC-HARD-01` |
| SEC-FIND-03 | Crítico | CSRF ausente | Aberto / parcial | `SEC-HARD-01` |
| SEC-FIND-04 | Alto | JWT artesanal | Aberto | criar `SEC-AUTH-JWT-01` |
| SEC-FIND-05 | Alto | headers Next.js | Aberto / parcial | `SEC-HARD-01` |
| SEC-FIND-06 | Alto | Helmet backend | Aberto / parcial | `SEC-HARD-01` |
| SEC-FIND-07 | Alto | scrypt params | Aberto | criar `SEC-AUTH-PWD-01` |
| SEC-FIND-08 | Alto | PII em logs | Aberto | `SEC-LOG-PII-01` |
| SEC-FIND-09 | Alto | lockout ausente | Aberto | criar `SEC-AUTH-LOCK-01` |
| SEC-FIND-10 | Alto | body size limit | Aberto | criar `SEC-HTTP-BODY-01` |
| SEC-FIND-11 | Médio | `postcss < 8.5.10` | Aberto | `DX-POSTCSS-01` / corrigido por SEC-FIND-01 |
| SEC-FIND-12 | Médio | PII em JWT | Aberto | parte de `SEC-AUTH-JWT-01` |
| SEC-FIND-13 | Médio | exception leakage | Aberto | criar `SEC-HTTP-ERR-01` |
| SEC-FIND-14 | Médio | SQLite em prod | Observação | ADR futura |
| SEC-FIND-15 | Médio | revogação access token | Aberto / opcional | criar `SEC-AUTH-REV-01` |
| SEC-FIND-16 | Médio | `/health` público | Aberto | parte de `SEC-HARD-01` |
| SEC-FIND-17 | Baixo | Prisma 6 → 7 | Aberto / planejamento | DX futura |
| SEC-FIND-18 | Baixo | cookie path monitor | Aberto / observação | parte de `SEC-HARD-01` |
| SEC-FIND-19 | Baixo | nome `aep_pa_` | Aberto | `NOM-AEP-COOKIE-01` |
| SEC-FIND-20 | Baixo | `dotenv` devDep | Observação | runbook |
| SEC-FIND-21 | Baixo | `X-Powered-By` | Aberto | parte de `SEC-HARD-01` |
| SEC-OBS-01..07 | Hardening | diversos | Observações | tasks futuras |

---

## 6. Plano de remediação faseado

A ordem abaixo prioriza redução de risco real combinada com baixo custo de mudança.

### Fase A — Correção imediata (1 PR pequeno)

- **A1.** Upgrade `next@15.5.18`; rodar `npm run frontend:check`, `npm run frontend:test:run`. Resolve `SEC-FIND-01` e `SEC-FIND-11`.
- **A2.** Adicionar `poweredByHeader: false` em `next.config.ts`. Resolve `SEC-FIND-21`.
- **Validações:** `npm audit` (deve ficar zero high/critical), `git diff --check`.

### Fase B — Hardening HTTP imediato (primeiro recorte de `SEC-HARD-01`)

- **B1.** Adicionar Helmet no backend (`SEC-FIND-06`).
- **B2.** Configurar `headers()` em `next.config.ts` com HSTS, CSP minimalista (`default-src 'self'`, `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (`SEC-FIND-05`).
- **B3.** Adicionar `app.use(json({ limit: '1mb' }))` em `main.ts` (`SEC-FIND-10`).
- **Validações:** `curl -I` em endpoints, Mozilla Observatory ≥ A-, testes existentes verdes.

### Fase C — Auth hardening (segundo recorte de `SEC-HARD-01` + novas tasks)

- **C1.** Adicionar `@nestjs/throttler` com política agressiva em `/auth/*` (`SEC-FIND-02`).
- **C2.** Validar `Origin`/`Referer` em `/auth/refresh` e `/auth/logout` (`SEC-FIND-03`). Avaliar CSRF token double-submit como camada adicional.
- **C3.** Implementar lockout exponencial por conta (`SEC-FIND-09`).
- **C4.** Reduzir payload do JWT, remover `email`/`name` (`SEC-FIND-12`). Acessar via `resolveAuthenticatedUser`.
- **C5.** Pseudonimizar PII em logs de auth (`SEC-FIND-08`, alinhado a `SEC-LOG-PII-01`).
- **C6.** Diferenciar logging de exceções esperadas (`401`, `403`) das inesperadas no `GlobalExceptionFilter` (`SEC-FIND-13`).
- **Validações:** ampliar `auth.endpoint.spec.ts` para cobrir rate limit, lockout, Origin check.

### Fase D — Crypto + sessão (recortes próprios)

- **D1.** Migrar password hashing para parâmetros explícitos `scrypt N=2^17` ou `argon2id` (`SEC-FIND-07`). Implementar rehash automático no login bem-sucedido quando custo < target.
- **D2.** Avaliar migração de JWT para `jose` com suporte a `kid` e rotação (`SEC-FIND-04`).
- **D3.** Implementar `accessTokenVersion` para revogação ad-hoc (`SEC-FIND-15`).
- **Validações:** `npm run backend:test`, rehash em fixtures.

### Fase E — Operação e preparação para produção

- **E1.** ADR registrando troca de SQLite para Postgres em homologação/produção (`SEC-FIND-14`).
- **E2.** `CI-GATES-01` aplicado com gate `npm audit --audit-level=high`.
- **E3.** Política de senha mínima (`SEC-OBS-02`).
- **E4.** Implementação de troca de senha (`SEC-OBS-03`).
- **E5.** Avaliação de MFA (`SEC-OBS-04`).
- **E6.** Correlation ID por request (`SEC-OBS-05`).

---

## 7. Validações esperadas por mudança

Por se tratar de sistema com efeito jurídico, cada PR derivado deste relatório deve incluir:

- `npm run typecheck --workspace @sadep/backend` e `npm run typecheck --workspace @sadep/frontend`;
- `npm run frontend:check` (inclui copy-check, build e typecheck);
- `npm run frontend:test:run`;
- `npm run --workspace @sadep/backend test:unit`;
- `npm run --workspace @sadep/backend test:integration` quando o recorte tocar auth ou autorização;
- `git diff --check`;
- evidência manual para mudanças de headers (curl/Observatory) e de rate limit (script simples de N requests).

Mudanças que toquem cookies/CORS exigem teste em ambiente com domínio próprio (não `localhost`), conforme já praticado em `BE-ARCH-01E5`.

---

## 8. Pontos fortes observados

Para registro e para reforço de boas práticas existentes:

- **Refresh token rotation com detecção de reuso por família** (`apps/backend/src/auth/auth.service.ts:161-234`): correto, transacional, com revogação em cascata da família ao detectar reuso.
- **Validação de role a cada request** via `resolveAuthenticatedUser` (`apps/backend/src/auth/auth.service.ts:361`): mitiga ataques de stale token mesmo sem revogação ativa.
- **Hash HMAC do refresh token antes de persistir** (`apps/backend/src/auth/refresh-token.service.ts:17`): impede que um dump do banco entregue tokens utilizáveis.
- **Autorização contextual CESAD por assignment ativa** (`apps/backend/src/cesad/authorization/cesad-context-authorization.service.ts`): vai além de role-based; valida membership na comissão e vigência de mandato.
- **`timingSafeEqual` na verificação de assinatura JWT e senha**: defesa correta contra timing attacks.
- **`validateEnvironmentVariables`** (`apps/backend/src/config/env.validation.ts`): impede deploy com `JWT_SECRET` curto, sem HTTPS em prod, com `SameSite=None` sem `Secure`, ou com `COOKIE_DOMAIN=localhost` em produção.
- **`.gitignore` cobre `.env`, `dev.db`, build artifacts** corretamente.
- **Nenhum uso de `$queryRawUnsafe`/`$executeRawUnsafe` em código runtime** — apenas em script local de preparação (`apps/backend/scripts/prepare-local-sqlite.ts`), fora do caminho de produção.
- **Nenhum `dangerouslySetInnerHTML` no frontend.**
- **Access token armazenado em memória no frontend**, não em `localStorage`/`sessionStorage` — defesa correta contra XSS persistente.
- **Cookie de refresh `HttpOnly`, com SameSite, Secure em produção, Path restrito a `/auth`** — alinhado à ADR-002.
- **Cobertura de testes sobre eventos sensíveis** (`auth.service.spec.ts`, `auth.endpoint.spec.ts`) validando ausência de senha em logs, formato de cookie, casos de sessão revogada, expirada e reuso.

Esses pontos não devem ser regredidos em refatores posteriores e merecem ser explicitados em onboarding técnico.

---

## 9. Próxima ação concreta

1. Aplicar **Fase A** em um PR pequeno isolado (`feat(deps): upgrade next to 15.5.18`).
2. Levantar com a equipe a priorização da **Fase B** dentro de `SEC-HARD-01` (sem reabrir `BE-ARCH-01E5`).
3. Para cada item listado como "criar `SEC-...-XX`" na seção 5, criar arquivo de task próprio em `docs/roadmaps/seguranca/tasks/` quando autorizado, seguindo a estrutura padrão das tasks já existentes em `docs/roadmaps/cross-cutting/tasks/`.

Este relatório **não** altera código, contratos, Prisma, migrations, workflow, regras jurídicas, status de tasks existentes ou configurações de runtime. Qualquer aplicação concreta exige task autorizada e validação por ambiente.
