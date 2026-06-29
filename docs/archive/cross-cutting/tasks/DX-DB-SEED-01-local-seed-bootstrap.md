# DX-DB-SEED-01 — Seed minimo local e checagem de banco

## Status

**Encerrado** (2026-06-29). `docs/setup/local-setup.md` atualizado: referencias a SQLite removidas, PostgreSQL (Docker Compose) documentado como pre-requisito, `DATABASE_URL` explicitada no `.env` de exemplo, bootstrap atualizado para refletir `prisma migrate deploy` em vez de `db push`, checklist de verificacao revisado.

## Area

Cross-cutting, DX, Prisma, banco local e setup.

## Contexto

A varredura global confirmou que comandos de checagem ou status do banco local podem falhar quando o SQLite ja existe, mas nao recebeu seed minimo ou nao esta alinhado ao fluxo local atual.

Esse problema nao deve ser confundido automaticamente com erro funcional de codigo.

## Escopo previsto

- documentar o comportamento esperado de `db:check`;
- orientar uso de `npm run backend:bootstrap` para preparar ambiente local;
- diferenciar falha de seed local de falha de schema/codigo;
- revisar a convivencia entre `db push`, migrations e banco local;
- registrar comandos seguros de recuperacao local quando aplicavel.

## Fora do escopo

- alterar migrations historicas;
- criar migration;
- apagar banco local sem orientacao explicita;
- alterar Prisma schema;
- alterar seeds nesta task documental.

## Criterios de aceite

- setup local explica quando usar bootstrap;
- falhas conhecidas de seed local ficam separadas de bugs funcionais;
- comandos destrutivos nao sao recomendados sem cuidado explicito;
- estrategia de migrations/producao permanece separada se exigir decisao maior.

## Validacoes esperadas

- `git diff --check` para alteracoes documentais;
- `npm run backend:bootstrap`, apenas quando a tarefa tecnica permitir preparar banco local;
- `npx prisma validate --schema apps/backend/prisma/schema.prisma`, quando aplicavel.

## Dependencias

- estado local do banco de desenvolvimento;
- estrategia futura de migrations/producao.

## Proxima acao

Revisar `docs/setup/local-setup.md` na proxima task de DX para garantir que bootstrap, seed e checagem local estejam descritos sem ambiguidades.
