# BE-TECH-02 — Revisar worker e cron

## Status

Concluida no recorte documental e de varredura tecnica.

## Area

Backend, DX e arquitetura operacional.

## Fonte de transicao

- [`../../backend-implementation-tracker.md`](../../backend-implementation-tracker.md)
- [`../active.md`](../active.md)
- [`../../problemas-atuais-do-projeto.md`](../../problemas-atuais-do-projeto.md)

## Contexto

Worker e cron existem ou sao prometidos na arquitetura, mas ainda e preciso decidir se havera escopo minimo real no MVP ou remocao da promessa da arquitetura imediata.

## Estado atual

Varredura concluida: `apps/worker` e `apps/cron` existem apenas como estrutura reservada, com READMEs e diretorios vazios preservados por `.gitkeep`. Nao ha `package.json`, scripts npm, entrypoint executavel, processador, fila, schedule ou job real nessas duas apps.

Decisao: worker e cron permanecem como arquitetura futura reservada, mas nao fazem parte do escopo operacional imediato do MVP. A documentacao deve descreve-los como estrutura sem implementacao nesta fase, evitando promessa de execucao assincrona ou rotinas agendadas ja disponiveis.

## Escopo realizado

- verificado o estado real de `apps/worker` e `apps/cron`;
- confirmada ausencia de scripts e pacotes npm dedicados para worker/cron;
- confirmada ausencia de jobs, processors, queues, schedules ou tasks implementadas;
- mantidas as pastas como placeholders arquiteturais futuros;
- documentado que nao ha escopo minimo real aprovado para MVP nesta frente;
- preservada a separacao entre promessa futura e funcionalidade disponivel agora.

## Fora do escopo

- implementar jobs reais sem decisao previa;
- notificacoes;
- assinatura;
- publicacao;
- rotinas de producao.
- alterar frontend, dados demonstrativos, fakes, placeholders ou fallback visual.

## Evidencias / referencias

- `apps/worker/README.md` registra processamento assincrono futuro e informa ausencia de implementacao nesta fase.
- `apps/cron/README.md` registra rotinas agendadas futuras e informa ausencia de implementacao nesta fase.
- `apps/worker/src/**` contem apenas diretorios e `.gitkeep`.
- `apps/cron/src/**` contem apenas diretorios e `.gitkeep`.
- `package.json` raiz nao possui scripts para worker ou cron.
- `docs/architecture/repository-structure.md` registra que o escopo inicial do monorepo e apenas estrutura de diretorios/arquivos, sem codigo de implementacao.

## Validacoes executadas

- varredura de arquivos e scripts de worker/cron;
- verificacao de referencias em docs e package scripts;
- recomendacao documentada antes de implementacao funcional;
- `npm run backend:build`;
- `git diff --check`.

## Proxima acao

Abrir task futura propria apenas quando houver decisao explicita de implementar job real, fila, schedule, notificacao, rotina de producao ou worker executavel. Ate la, manter worker e cron como estrutura reservada sem promessa operacional imediata.
