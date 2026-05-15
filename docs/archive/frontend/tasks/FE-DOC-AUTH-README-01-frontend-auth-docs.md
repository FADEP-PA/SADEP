# FE-DOC-AUTH-README-01 — Atualizar documentacao de autenticacao frontend

## Status

Concluida nesta atualizacao documental controlada.

## Area

Frontend, documentacao, auth/session e DX.

## Contexto

A varredura global confirmou que a documentacao do frontend ainda descrevia a estrategia antiga de sessao em `localStorage` ou `sessionStorage`.

A implementacao real usa access token em memoria, bootstrap por `POST /auth/refresh`, refresh token em cookie `HttpOnly` emitido pelo backend, retry silencioso de `401` com single-flight e limpeza de caminhos legados de storage.

## Escopo entregue

- atualizar `apps/frontend/README.md`;
- atualizar `docs/frontend/README.md`;
- registrar que `rememberMe` nao persiste sessao completa;
- preservar `FT-24` resolvida e nao confundir auth frontend com listagem segura por perfil.

## Fora do escopo

- alterar codigo frontend;
- alterar backend;
- alterar cookie, CORS ou envs;
- criar `.env.example` do frontend;
- implementar testes frontend.

## Validacoes esperadas

- `git diff --check`;
- revisao documental humana.
