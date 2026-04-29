# BE-TECH-02 — Revisar worker e cron

## Status

Pendente / arquitetura futura.

## Area

Backend, DX e arquitetura operacional.

## Fonte de transicao

- [`../../backend-implementation-tracker.md`](../../backend-implementation-tracker.md)
- [`../active.md`](../active.md)
- [`../../problemas-atuais-do-projeto.md`](../../problemas-atuais-do-projeto.md)

## Contexto

Worker e cron existem ou sao prometidos na arquitetura, mas ainda e preciso decidir se havera escopo minimo real no MVP ou remocao da promessa da arquitetura imediata.

## Estado atual

O tracker backend registra `BE-TECH-02` como planejada. O painel transversal indica a necessidade de escolher entre implementar escopo minimo real ou retirar promessas imediatas.

## Escopo previsto

- verificar estado real de `apps/worker` e `apps/cron`;
- decidir se permanecem na arquitetura imediata;
- documentar uso futuro quando aplicavel;
- retirar promessa imediata se nao houver escopo real aprovado.

## Fora do escopo

- implementar jobs reais sem decisao previa;
- notificacoes;
- assinatura;
- publicacao;
- rotinas de producao.

## Evidencias / referencias

- O indice backend e o painel ativo registram `BE-TECH-02` como pendente / arquitetura futura.
- O painel transversal relaciona a frente a worker e cron.

## Validacoes esperadas

- varredura de arquivos e scripts de worker/cron;
- verificacao de referencias em docs e package scripts;
- recomendacao documentada antes de implementacao funcional.

## Proxima acao

Executar varredura curta de worker/cron.
