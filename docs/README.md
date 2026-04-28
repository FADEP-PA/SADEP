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

- [`backend-implementation-tracker.md`](./backend-implementation-tracker.md): tracker oficial das implementações de backend e da ordem operacional das tasks backend.
- [`frontend-tasks-roadmap.md`](./frontend-tasks-roadmap.md): backlog operacional e ordem de execução das tasks frontend.
- [`problemas-atuais-do-projeto.md`](./problemas-atuais-do-projeto.md): painel transversal de problemas ativos do projeto; registra riscos e impedimentos amplos e não substitui os roadmaps.

Regra de uso:

- o tracker backend governa a ordem das tasks backend;
- o roadmap frontend governa o backlog frontend;
- o painel transversal registra problemas amplos e não substitui os roadmaps.

---

### Documentos normativos de domínio

- [`document-modeling-catalog.md`](./document-modeling-catalog.md): catálogo oficial de modelagem documental, tipologia, ciclo e rastreabilidade dos documentos do processo.
- [`architecture/evaluation-instruments.md`](./architecture/evaluation-instruments.md): instrumentos oficiais de avaliação e seus efeitos sobre backend, workflow, documentos e assinaturas.
- [`workflow/four-stage-flow-and-appeals.md`](./workflow/four-stage-flow-and-appeals.md): fluxo oficial do Caso 2 com 4 etapas, pareceres, homologação e recursos.

---

### Workflow, documentos e auditoria

- [`workflow-engine.md`](./workflow-engine.md): diretriz de modelagem de workflow, estados, transições e guards do processo administrativo.
- [`process-document.md`](./process-document.md): diretriz para estrutura e ciclo de vida dos documentos oficiais do processo.
- [`architecture/audit-event-semantics.md`](./architecture/audit-event-semantics.md): semântica dos eventos de auditoria e trilha estruturada do sistema.

Observação: alguns documentos normativos ainda estão em `architecture/` por herança histórica. A reorganização física será tratada em fases posteriores.

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

- [`frontend-roadmap-imediato.md`](./frontend-roadmap-imediato.md): diretriz operacional temporal para desenvolvimento frontend imediato.
- [`frontend-tasks-roadmap.md`](./frontend-tasks-roadmap.md): backlog operacional principal do frontend.
- [`wireframes/sprint-3b-frontend-flow.md`](./wireframes/sprint-3b-frontend-flow.md): referência visual e funcional de sprint para o fluxo inicial de telas.
- [`wireframes/`](./wireframes/): área de referência visual das telas e fluxos operacionais.

Documentos temporais, de sprint ou de apoio visual podem ser reclassificados ou arquivados em fases posteriores.

---

## Regra de prevalência documental

Em caso de conflito entre documentos, deve prevalecer:

1. regras jurídicas e processuais consolidadas;
2. [`../AGENTS.md`](../AGENTS.md);
3. documentos normativos de domínio:
   - [`workflow/four-stage-flow-and-appeals.md`](./workflow/four-stage-flow-and-appeals.md);
   - [`document-modeling-catalog.md`](./document-modeling-catalog.md);
   - [`architecture/evaluation-instruments.md`](./architecture/evaluation-instruments.md);
   - [`workflow-engine.md`](./workflow-engine.md);
   - [`process-document.md`](./process-document.md);
   - [`architecture/audit-event-semantics.md`](./architecture/audit-event-semantics.md);
4. roadmaps operacionais:
   - [`backend-implementation-tracker.md`](./backend-implementation-tracker.md);
   - [`frontend-tasks-roadmap.md`](./frontend-tasks-roadmap.md);
   - [`problemas-atuais-do-projeto.md`](./problemas-atuais-do-projeto.md);
5. setup e DX;
6. referências visuais, pesquisa, sprints e documentos históricos.

---

## Uso recomendado por tipo de task

### Task backend

Ler obrigatoriamente:

- [`../AGENTS.md`](../AGENTS.md)
- [`backend-implementation-tracker.md`](./backend-implementation-tracker.md)
- [`problemas-atuais-do-projeto.md`](./problemas-atuais-do-projeto.md)

Ler adicionalmente conforme impacto:

- [`workflow-engine.md`](./workflow-engine.md)
- [`process-document.md`](./process-document.md)
- [`document-modeling-catalog.md`](./document-modeling-catalog.md)
- [`workflow/four-stage-flow-and-appeals.md`](./workflow/four-stage-flow-and-appeals.md)
- [`architecture/audit-event-semantics.md`](./architecture/audit-event-semantics.md)
- [`architecture/evaluation-instruments.md`](./architecture/evaluation-instruments.md)

---

### Task frontend

Ler obrigatoriamente:

- [`../AGENTS.md`](../AGENTS.md)
- [`frontend-tasks-roadmap.md`](./frontend-tasks-roadmap.md)
- [`problemas-atuais-do-projeto.md`](./problemas-atuais-do-projeto.md)

Ler adicionalmente conforme impacto:

- [`document-modeling-catalog.md`](./document-modeling-catalog.md)
- [`workflow/four-stage-flow-and-appeals.md`](./workflow/four-stage-flow-and-appeals.md)
- [`wireframes/sprint-3b-frontend-flow.md`](./wireframes/sprint-3b-frontend-flow.md), se ainda aplicável.

---

### Task de documentação

Ler:

- [`../AGENTS.md`](../AGENTS.md)
- [`README.md`](./README.md)
- roadmaps afetados;
- documentos normativos relacionados.

---

### Task de setup/DX

Ler:

- [`../AGENTS.md`](../AGENTS.md)
- [`local-setup.md`](./local-setup.md)
- [`problemas-atuais-do-projeto.md`](./problemas-atuais-do-projeto.md)

---

## Regra de atualização documental após tasks

Após cada implementação aprovada, deve-se avaliar atualização de:

- [`backend-implementation-tracker.md`](./backend-implementation-tracker.md), quando a task for backend;
- [`frontend-tasks-roadmap.md`](./frontend-tasks-roadmap.md), quando a task for frontend;
- [`problemas-atuais-do-projeto.md`](./problemas-atuais-do-projeto.md), quando houver impacto transversal;
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
- exemplo futuro:
  - `docs/domain/`;
  - `docs/workflow/`;
  - `docs/architecture/`;
  - `docs/skills/`.

---

### Fase 3 — Roadmaps operacionais

- organizar roadmaps em pasta própria;
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

## Fora do escopo desta fase

Não fazer nesta fase:

- reorganização física completa de `docs/`;
- mover roadmaps para subpastas;
- arquivar documentos;
- reescrever documentos normativos;
- alterar conteúdo de regras de negócio;
- alterar status de tasks;
- atualizar roadmap com novos achados técnicos;
- alterar código.