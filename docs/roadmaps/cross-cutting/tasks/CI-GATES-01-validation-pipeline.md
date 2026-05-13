# CI-GATES-01 — Definir pipeline oficial de validacao

## Status

Pendente / DX e qualidade.

## Area

CI/CD, DX, backend, frontend, contracts e Prisma.

## Contexto

A varredura global confirmou que os gates locais principais passam: contracts, backend, frontend, Prisma validate e `git diff --check`.

Nao ha pipeline oficial evidente no repositório para executar esses gates automaticamente em pull requests ou branch protegida.

## Escopo previsto

- definir pipeline oficial de validacao;
- executar build/typecheck/test backend;
- executar typecheck/build/check frontend;
- validar Prisma schema;
- executar `git diff --check`;
- documentar variaveis necessarias e estrategia para `DATABASE_URL` temporaria em validacao.

## Fora do escopo

- implementar deploy completo;
- publicar imagens/artefatos;
- alterar scripts package sem task tecnica propria;
- usar `npm audit fix --force`.

## Criterios de aceite

- pipeline roda de forma reproduzivel em ambiente limpo;
- falhas de contracts/backend/frontend/Prisma bloqueiam merge;
- variaveis sensiveis nao sao expostas em logs;
- documentacao local e CI ficam alinhadas.

## Proxima acao

Escolher plataforma alvo e criar proposta tecnica antes de alterar workflows.
