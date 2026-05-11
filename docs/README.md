# Documentação do Projeto SADEP

## Objetivo

O diretório `docs/` reúne a documentação oficial e de apoio do **SADEP — Sistema de Avaliação de Desempenho de Estágio Probatório**.

Nesta fase, os arquivos atuais permanecem majoritariamente em seus locais de origem e são classificados em grupos de uso:

- normativa;
- operacional;
- roadmap;
- setup e DX;
- frontend e referência visual;
- arquitetura e referências;
- histórica ou temporal.

Este índice é a referência oficial para localizar documentos, entender sua função atual e orientar a sanitização documental em fases.

---

## Documento obrigatório para agentes

Antes de qualquer implementação, auditoria ou atualização documental relevante, leia obrigatoriamente:

- [`../AGENTS.md`](../AGENTS.md)

O `AGENTS.md` na raiz é a instrução padrão que agentes devem encontrar por default no repositório.

---

## Classificação atual dos documentos

### Roadmaps operacionais

- [`roadmaps/README.md`](./roadmaps/README.md): índice específico dos roadmaps operacionais e da convivência entre os documentos de acompanhamento.
- [`roadmaps/backend/active.md`](./roadmaps/backend/active.md): painel operacional backend ativo, retomável ou pendente.
- [`roadmaps/frontend/active.md`](./roadmaps/frontend/active.md): painel operacional frontend ativo, pendente ou resolvido operacionalmente.
- [`roadmaps/cross-cutting/active-problems.md`](./roadmaps/cross-cutting/active-problems.md): painel vivo de problemas transversais ativos.
- [`roadmaps/backend-implementation-tracker.md`](./roadmaps/backend-implementation-tracker.md): índice de compatibilidade do antigo tracker backend.
- [`roadmaps/frontend-tasks-roadmap.md`](./roadmaps/frontend-tasks-roadmap.md): índice de compatibilidade do antigo roadmap frontend.
- [`roadmaps/problemas-atuais-do-projeto.md`](./roadmaps/problemas-atuais-do-projeto.md): índice de compatibilidade do antigo painel transversal.

Regra de uso:

- os painéis modulares em `roadmaps/backend/`, `roadmaps/frontend/` e `roadmaps/cross-cutting/` devem ser consultados primeiro;
- os três arquivos legados reduzidos permanecem como índices de compatibilidade e preservam rastreabilidade por links;
- problemas transversais não substituem os roadmaps operacionais por área.

---

### Documentos normativos de domínio

- [`domain/document-modeling-catalog.md`](./domain/document-modeling-catalog.md): catálogo oficial de modelagem documental, tipologia, ciclo e rastreabilidade dos documentos do processo.
- [`domain/evaluation-instruments.md`](./domain/evaluation-instruments.md): instrumentos oficiais de avaliação e seus efeitos sobre backend, workflow, documentos e assinaturas.
- [`workflow/four-stage-flow-and-appeals.md`](./workflow/four-stage-flow-and-appeals.md): fluxo oficial do Caso 2 com 4 etapas, pareceres, homologação e recursos.

---

### Workflow, documentos e auditoria

- [`skills/workflow-engine-skill.md`](./skills/workflow-engine-skill.md): diretriz de uso da workflow-engine por agentes para estados, transições, guards e coerência processual.
- [`skills/process-document-skill.md`](./skills/process-document-skill.md): diretriz de uso por agentes para documentos processuais, ciclo documental e assinaturas.
- [`domain/audit-event-semantics.md`](./domain/audit-event-semantics.md): semântica normativa dos eventos de auditoria e da trilha estruturada do sistema.

---

### Setup e DX

- [`setup/local-setup.md`](./setup/local-setup.md): fluxo padrão de instalação, preparo e execução local do projeto e referência principal de setup e DX.

---

### Arquitetura e referências

- [`architecture/README.md`](./architecture/README.md): porta de entrada para referências arquiteturais, estrutura do monorepo e organização das ADRs.
- [`architecture/adr/README.md`](./architecture/adr/README.md): índice das decisões arquiteturais formais do projeto.
- [`architecture/adr/adr-001-workflow-engine-strategy.md`](./architecture/adr/adr-001-workflow-engine-strategy.md): ADR que registra a decisão de adotar workflow próprio com state machine no backend para o MVP, sem engine BPM externa no início.
- [`architecture/repository-structure.md`](./architecture/repository-structure.md): referência arquitetural da estrutura inicial do monorepo; pode ser atualizada em task futura quando houver evolução estrutural relevante.
- [`architecture/`](./architecture/): área de referências arquiteturais, estrutura do monorepo e ADRs formais do projeto.

---

### Frontend e referência visual

- [`frontend/README.md`](./frontend/README.md): porta de entrada para diretrizes frontend, referências ativas e relação com o roadmap operacional vivo.
- [`roadmaps/frontend-tasks-roadmap.md`](./roadmaps/frontend-tasks-roadmap.md): roadmap operacional principal e backlog vivo do frontend.
- [`archive/frontend/frontend-roadmap-imediato-2026-04-15.md`](./archive/frontend/frontend-roadmap-imediato-2026-04-15.md): diretriz operacional temporal preservada como histórico.
- [`archive/sprints/sprint-3b-frontend-flow.md`](./archive/sprints/sprint-3b-frontend-flow.md): referência visual e funcional de sprint preservada como histórico.
- [`wireframes/`](./wireframes/): área de referência visual das telas e fluxos operacionais.

O painel vivo do frontend é `docs/roadmaps/frontend/active.md`; `docs/roadmaps/frontend-tasks-roadmap.md` permanece como índice de compatibilidade. Documentos arquivados são históricos ou referenciais e não prevalecem sobre roadmaps vivos nem sobre documentos normativos de domínio e workflow.

---

## Regra de prevalência documental

Em caso de conflito entre documentos, deve prevalecer:

1. regras jurídicas e processuais consolidadas;
2. [`../AGENTS.md`](../AGENTS.md);
3. documentos normativos de domínio:
   - [`workflow/four-stage-flow-and-appeals.md`](./workflow/four-stage-flow-and-appeals.md);
   - [`domain/document-modeling-catalog.md`](./domain/document-modeling-catalog.md);
   - [`domain/evaluation-instruments.md`](./domain/evaluation-instruments.md);
   - [`skills/workflow-engine-skill.md`](./skills/workflow-engine-skill.md);
   - [`skills/process-document-skill.md`](./skills/process-document-skill.md);
   - [`domain/audit-event-semantics.md`](./domain/audit-event-semantics.md);
4. roadmaps operacionais:
   - [`roadmaps/backend/active.md`](./roadmaps/backend/active.md);
   - [`roadmaps/backend/resolved.md`](./roadmaps/backend/resolved.md);
   - [`roadmaps/frontend/active.md`](./roadmaps/frontend/active.md);
   - [`roadmaps/frontend/resolved.md`](./roadmaps/frontend/resolved.md);
   - [`roadmaps/cross-cutting/active-problems.md`](./roadmaps/cross-cutting/active-problems.md);
   - [`roadmaps/cross-cutting/resolved-problems.md`](./roadmaps/cross-cutting/resolved-problems.md);
5. setup e DX;
6. referências visuais, pesquisa, sprints e documentos históricos.

Os indices legados em `roadmaps/backend-implementation-tracker.md`, `roadmaps/frontend-tasks-roadmap.md` e `roadmaps/problemas-atuais-do-projeto.md` permanecem como compatibilidade e rastreabilidade, mas nao substituem os paineis modulares.

---

## Uso recomendado por tipo de task

### Task backend

Ler obrigatoriamente:

- [`../AGENTS.md`](../AGENTS.md)
- [`roadmaps/backend/active.md`](./roadmaps/backend/active.md)
- [`roadmaps/backend/resolved.md`](./roadmaps/backend/resolved.md)
- [`roadmaps/cross-cutting/active-problems.md`](./roadmaps/cross-cutting/active-problems.md)

Consultar indices legados apenas para compatibilidade:

- [`roadmaps/backend-implementation-tracker.md`](./roadmaps/backend-implementation-tracker.md)
- [`roadmaps/problemas-atuais-do-projeto.md`](./roadmaps/problemas-atuais-do-projeto.md)

Ler adicionalmente conforme impacto:

- [`skills/workflow-engine-skill.md`](./skills/workflow-engine-skill.md)
- [`skills/process-document-skill.md`](./skills/process-document-skill.md)
- [`domain/document-modeling-catalog.md`](./domain/document-modeling-catalog.md)
- [`workflow/four-stage-flow-and-appeals.md`](./workflow/four-stage-flow-and-appeals.md)
- [`domain/audit-event-semantics.md`](./domain/audit-event-semantics.md)
- [`domain/evaluation-instruments.md`](./domain/evaluation-instruments.md)

---

### Task frontend

Ler obrigatoriamente:

- [`../AGENTS.md`](../AGENTS.md)
- [`roadmaps/frontend/active.md`](./roadmaps/frontend/active.md)
- [`roadmaps/frontend/resolved.md`](./roadmaps/frontend/resolved.md)
- [`roadmaps/cross-cutting/active-problems.md`](./roadmaps/cross-cutting/active-problems.md)

Consultar indices legados apenas para compatibilidade:

- [`roadmaps/frontend-tasks-roadmap.md`](./roadmaps/frontend-tasks-roadmap.md)
- [`roadmaps/problemas-atuais-do-projeto.md`](./roadmaps/problemas-atuais-do-projeto.md)

Ler adicionalmente conforme impacto:

- [`domain/document-modeling-catalog.md`](./domain/document-modeling-catalog.md)
- [`workflow/four-stage-flow-and-appeals.md`](./workflow/four-stage-flow-and-appeals.md)
- [`frontend/README.md`](./frontend/README.md)
- [`archive/sprints/sprint-3b-frontend-flow.md`](./archive/sprints/sprint-3b-frontend-flow.md), se ainda aplicável como referência histórica.

---

### Task de documentação

Ler:

- [`../AGENTS.md`](../AGENTS.md)
- [`README.md`](./README.md)
- [`roadmaps/README.md`](./roadmaps/README.md)
- roadmaps afetados;
- documentos normativos relacionados.

---

### Task de setup/DX

Ler:

- [`../AGENTS.md`](../AGENTS.md)
- [`setup/local-setup.md`](./setup/local-setup.md)
- [`roadmaps/cross-cutting/active-problems.md`](./roadmaps/cross-cutting/active-problems.md)
- [`roadmaps/problemas-atuais-do-projeto.md`](./roadmaps/problemas-atuais-do-projeto.md), apenas como indice de compatibilidade

---

### Task de arquitetura

Ler:

- [`../AGENTS.md`](../AGENTS.md)
- [`architecture/README.md`](./architecture/README.md)
- [`architecture/adr/README.md`](./architecture/adr/README.md)
- ADRs relacionadas ao tema, quando aplicável

---

## Regra de atualização documental após tasks

Após cada implementação aprovada, deve-se avaliar atualização de:

- [`roadmaps/backend/active.md`](./roadmaps/backend/active.md) e [`roadmaps/backend/resolved.md`](./roadmaps/backend/resolved.md), quando a task for backend;
- [`roadmaps/frontend/active.md`](./roadmaps/frontend/active.md) e [`roadmaps/frontend/resolved.md`](./roadmaps/frontend/resolved.md), quando a task for frontend;
- [`roadmaps/cross-cutting/active-problems.md`](./roadmaps/cross-cutting/active-problems.md) e [`roadmaps/cross-cutting/resolved-problems.md`](./roadmaps/cross-cutting/resolved-problems.md), quando houver impacto transversal;
- indices legados correspondentes, somente quando necessario para compatibilidade;
- documentos normativos, somente quando houver decisão de negócio ou arquitetura consolidada;
- [`setup/local-setup.md`](./setup/local-setup.md), quando houver mudança de setup, scripts ou DX.

---

## Fases planejadas da sanitização documental

### Fase 1 — Índice documental e `AGENTS.md` na raiz

- criar `AGENTS.md` na raiz;
- criar `docs/README.md`;
- classificar documentos atuais;
- definir regra de prevalência;
- orientar uso por agentes;
- não mover a maioria dos arquivos.

---

### Fase 2 — Reorganização dos documentos normativos e skills

- organizar documentos de domínio, workflow, auditoria e skills em pastas coerentes;
- consolidar documentos normativos de domínio em `docs/domain/`;
- consolidar skills e diretrizes operacionais de agentes em `docs/skills/`;
- preservar `docs/workflow/` para o fluxo oficial do Caso 2;
- preservar `docs/architecture/` para referências arquiteturais ainda não reclassificadas.

---

### Fase 3 — Roadmaps operacionais

- organizar roadmaps em pasta própria;
- consolidar o tracker backend, o roadmap frontend e o painel transversal em `docs/roadmaps/`;
- criar `docs/roadmaps/README.md` como índice operacional;
- diferenciar:
  - tracker backend;
  - roadmap frontend;
  - painel transversal de problemas.

---

### Fase 4 — Frontend e documentos históricos

- consolidar documentação frontend;
- arquivar documentos temporais ou superados;
- preservar referências visuais úteis.

---

### Fase 5 — Arquitetura, setup e limpeza final

- organizar setup, arquitetura, pesquisa comparativa e placeholders;
- transformar pesquisa comparativa em ADR;
- preservar placeholders úteis;
- atualizar links internos finais.

---

## Observação sobre escopo das fases

Cada fase de sanitização documental deve ter escopo próprio e controlado. Movimentações físicas, arquivamento de documentos, alterações em roadmaps e mudanças normativas só devem ocorrer quando expressamente previstas na fase ativa.

A sanitização documental não deve alterar código, regras de negócio, workflow funcional, backend, frontend, contratos, Prisma, migrations ou status de tasks sem autorização explícita.
