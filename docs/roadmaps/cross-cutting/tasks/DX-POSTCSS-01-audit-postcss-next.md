# DX-POSTCSS-01 — Audit postcss/next

## Status

Alerta pendente.

## Area

Cross-cutting, DX, infra e seguranca de dependencias.

## Fonte de transicao

- [`../../problemas-atuais-do-projeto.md`](../../problemas-atuais-do-projeto.md)
- [`../active-problems.md`](../active-problems.md)
- [`../../frontend-tasks-roadmap.md`](../../frontend-tasks-roadmap.md)

## Contexto

`DX-01` resolveu operacionalmente o desalinhamento local do Next. Permanece alerta de `npm audit --omit=dev` com vulnerabilidades moderadas em `postcss <8.5.10` via `next`.

## Estado atual

`npm audit fix --force` sugere downgrade para `next@9.3.3`, solucao nao aceitavel para o projeto. O alerta nao deve bloquear a `BE-ARCH-01D`, salvo decisao futura explicita.

## Escopo previsto

- monitorar atualizacao segura de `next`/`postcss`;
- avaliar correcao sem downgrade ou breaking change;
- manter o alerta separado de `DX-01`;
- nao bloquear `BE-ARCH-01D` sem decisao futura.

## Fora do escopo

- usar `npm audit fix --force`;
- downgrade de Next;
- upgrade manual sem validacao;
- alteracao funcional.

## Evidencias / referencias

- O painel transversal registra 2 vulnerabilidades moderadas em `postcss <8.5.10` via `next`.
- O roadmap frontend registra que a correcao automatica sugeriria `next@9.3.3`.
- `DX-01` local foi resolvido operacionalmente com `next@15.5.15`.

## Validacoes esperadas

- `npm audit --omit=dev`;
- `npm ls next`;
- `npm run frontend:check`;
- build e typecheck frontend se houver alteracao de dependencia futura.

## Proxima acao

Manter como alerta ou planejar task especifica de dependencia quando houver caminho seguro.

