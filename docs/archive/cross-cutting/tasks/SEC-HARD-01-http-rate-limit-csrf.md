# SEC-HARD-01 — Hardening adicional de seguranca HTTP, rate limit e CSRF

## Status

**Encerrado** (2026-06-29).

## Area

Cross-cutting, seguranca, backend, deploy e operacao.

## Contexto

`BE-ARCH-01E5` foi concluida no recorte de validacao operacional de env/CORS/cookies. Esse recorte nao encerra o hardening HTTP amplo necessario para homologacao/producao institucional.

## Escopo previsto

- avaliar Helmet/security headers;
- avaliar throttling/rate limit para endpoints sensiveis, especialmente auth;
- definir politica CSRF/cookie adequada ao deployment real;
- revisar logs com potencial de PII;
- tratar `SEC-LOG-PII-01` como subtarefa especifica para PII e ruido em logs de auth/filtro global;
- revisar politica de producao para HTTPS, cookies, CORS e dominios;
- documentar validacoes e trade-offs.

## Fora do escopo

- reabrir `BE-ARCH-01E5`;
- renomear cookie `aep_pa_refresh`;
- usar `npm audit fix --force`;
- alterar workflow, CESAD, documentos, homologacao ou regras juridicas;
- implementar hardening sem validacao por ambiente.

## Criterios de aceite

- headers HTTP e politica de rate limit ficam documentados e implementados quando aprovado;
- endpoints de auth baseados em cookie possuem estrategia CSRF explicita;
- logs nao expõem senha, tokens ou PII desnecessaria;
- producao/homologacao possuem requisitos claros de HTTPS, dominio e cookie.

## Validacoes esperadas

- `npm run typecheck --workspace @sadep/backend`;
- testes backend relevantes;
- validacao manual de headers quando implementado;
- `git diff --check`.

## Dependencias

- `BE-ARCH-01E5` concluida no recorte operacional;
- decisao de deploy/domínios;
- politica institucional de seguranca.

## Validacao final (2026-06-29)

Revisao completa confirmou que todos os criterios de aceite ja estavam atendidos:

- **Helmet/headers HTTP**: CSP explicita em `main.ts` (defaultSrc, scriptSrc, objectSrc none, frameSrc none); `upgradeInsecureRequests` agora condicional a `NODE_ENV=production` para nao gerar ruido em desenvolvimento HTTP.
- **Rate limit de auth**: `ThrottlerModule` global (120 req/min) com override por endpoint: login=10/min, refresh=30/min, logout=20/min — via `@Throttle` em `auth.controller.ts`.
- **CSRF/cookie**: `validateCsrfOrigin()` nos endpoints `refresh` e `logout` (cookie-based). Cookie `sadep_refresh` com `HttpOnly`, `SameSite=Lax`, `Path=/auth` e `Secure` via variavel de ambiente.
- **PII em logs**: `GlobalExceptionFilter` diferencia niveis por status HTTP (5xx → error + stack, 401/403 → debug, outros 4xx → warn). E-mails mascarados via `maskEmail()` em `auth.service.ts`. Encerrado como `SEC-LOG-PII-01`.
- **Cookie renomeado**: `aep_pa_refresh` → `sadep_refresh`. Encerrado como `NOM-AEP-COOKIE-01`.
- **Requisitos de producao**: HTTPS, dominio e `Secure=true` sao configurados por variaveis de ambiente (`COOKIE_SECURE`, `COOKIE_SAMESITE`, `COOKIE_DOMAIN`); documentados em `.env.example` e `ci.yml`.
