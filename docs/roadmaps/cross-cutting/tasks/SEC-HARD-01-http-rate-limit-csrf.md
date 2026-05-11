# SEC-HARD-01 — Hardening adicional de seguranca HTTP, rate limit e CSRF

## Status

Melhoria futura.

## Area

Cross-cutting, seguranca, backend, deploy e operacao.

## Contexto

`BE-ARCH-01E5` foi concluida no recorte de validacao operacional de env/CORS/cookies. Esse recorte nao encerra o hardening HTTP amplo necessario para homologacao/producao institucional.

## Escopo previsto

- avaliar Helmet/security headers;
- avaliar throttling/rate limit para endpoints sensiveis, especialmente auth;
- definir politica CSRF/cookie adequada ao deployment real;
- revisar logs com potencial de PII;
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

## Proxima acao

Decidir o primeiro recorte: headers HTTP, rate limit de auth ou politica CSRF.
