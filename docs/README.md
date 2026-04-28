# Documentação do Projeto AEP-PA

## Objetivo

O diretório `docs/` reúne a documentação oficial e de apoio do **AEP-PA — Sistema de Avaliação Especial de Estágio Probatório**.

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
- [`roadmaps/backend-implementation-tracker.md`](./roadmaps/backend-implementation-tracker.md): tracker oficial das implementações de backend e da ordem operacional das tasks backend.
- [`roadmaps/frontend-tasks-roadmap.md`](./roadmaps/frontend-tasks-roadmap.md): backlog operacional e ordem de execução das tasks frontend.
- [`roadmaps/problemas-atuais-do-projeto.md`](./roadmaps/problemas-atuais-do-projeto.md): painel transversal de problemas ativos do projeto; registra riscos e impedimentos amplos e não substitui os roadmaps.

Regra de uso:

- o tracker backend governa a ordem das tasks backend;
- o roadmap frontend governa o backlog frontend;
- o painel transversal registra problemas amplos e não substitui os roadmaps.

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

- [`local-setup.md`](./local-setup.md): fluxo padrão de instalação, preparo e execução local do projeto.

---

### Arquitetura e referências

- [`architecture/repository-structure.md`](./architecture/repository-structure.md): organização base do monorepo e distribuição inicial de apps e packages.
- [`pesquisa-comparativa-referencias-mvp.md`](./pesquisa-comparativa-referencias-mvp.md): estudo comparativo e referência arquitetural de apoio ao MVP.
- [`architecture/`](./architecture/): área atual para referências e documentos arquiteturais ainda não convertidos para uma taxonomia final.

---

### Frontend e referência visual

- [`frontend/README.md`](./frontend/README.md): porta de entrada para diretrizes frontend, referências ativas e relação com o roadmap operacional vivo.
- [`roadmaps/frontend-tasks-roadmap.md`](./roadmaps/frontend-tasks-roadmap.md): roadmap operacional principal e backlog vivo do frontend.
- [`archive/frontend/frontend-roadmap-imediato-2026-04-15.md`](./archive/frontend/frontend-roadmap-imediato-2026-04-15.md): diretriz operacional temporal preservada como histórico.
- [`archive/sprints/sprint-3b-frontend-flow.md`](./archive/sprints/sprint-3b-frontend-flow.md): referência visual e funcional de sprint preservada como histórico.
- [`wireframes/`](./wireframes/): área de referência visual das telas e fluxos operacionais.

O roadmap vivo do frontend é `docs/roadmaps/frontend-tasks-roadmap.md`. Documentos arquivados são históricos ou referenciais e não prevalecem sobre roadmaps vivos nem sobre documentos normativos de domínio e workflow.

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
   - [`roadmaps/backend-implementation-tracker.md`](./roadmaps/backend-implementation-tracker.md);
   - [`roadmaps/frontend-tasks-roadmap.md`](./roadmaps/frontend-tasks-roadmap.md);
   - [`roadmaps/problemas-atuais-do-projeto.md`](./roadmaps/problemas-atuais-do-projeto.md);
5. setup e DX;
6. referências visuais, pesquisa, sprints e documentos históricos.

---

## Uso recomendado por tipo de task

### Task backend

Ler obrigatoriamente:

- [`../AGENTS.md`](../AGENTS.md)
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
- [`local-setup.md`](./local-setup.md)
- [`roadmaps/problemas-atuais-do-projeto.md`](./roadmaps/problemas-atuais-do-projeto.md)

---

## Regra de atualização documental após tasks

Após cada implementação aprovada, deve-se avaliar atualização de:

- [`roadmaps/backend-implementation-tracker.md`](./roadmaps/backend-implementation-tracker.md), quando a task for backend;
- [`roadmaps/frontend-tasks-roadmap.md`](./roadmaps/frontend-tasks-roadmap.md), quando a task for frontend;
- [`roadmaps/problemas-atuais-do-projeto.md`](./roadmaps/problemas-atuais-do-projeto.md), quando houver impacto transversal;
- documentos normativos, somente quando houver decisão de negócio ou arquitetura consolidada;
- [`local-setup.md`](./local-setup.md), quando houver mudança de setup, scripts ou DX.

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
- transformar referência arquitetural em ADR, quando aplicável;
- atualizar links internos finais.

---

## Observação sobre escopo das fases

Cada fase de sanitização documental deve ter escopo próprio e controlado. Movimentações físicas, arquivamento de documentos, alterações em roadmaps e mudanças normativas só devem ocorrer quando expressamente previstas na fase ativa.

A sanitização documental não deve alterar código, regras de negócio, workflow funcional, backend, frontend, contratos, Prisma, migrations ou status de tasks sem autorização explícita.
