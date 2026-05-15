# ADR-001 — Estratégia de Workflow Engine para o MVP do SADEP

> Este documento foi reclassificado como ADR durante a Fase 5 da sanitização documental, por registrar a decisão arquitetural de usar workflow próprio com state machine no backend para o MVP.

## 1) Síntese dos requisitos internos obrigatórios (base de decisão)

Leitura consolidada de `docs/AGENTS.md`, `docs/skills/workflow-engine-skill.md` e `docs/skills/process-document-skill.md`:

- O sistema é **processual orientado a estados**, e não CRUD.
- Princípios inegociáveis: orientação a estados, imutabilidade pós-assinatura, determinismo temporal, regras no backend, auditoria obrigatória.
- Estados obrigatórios do processo (MVP): `EM_AVALIACAO` → `AGUARDANDO_ASSINATURA` → `ASSINADO` → `EM_ANALISE_CESAD` → `PARECER_EMITIDO` → `HOMOLOGADO` → `NOTIFICADO` → `CIENTE` → `ENCERRADO`.
- Nenhuma transição fora da workflow-engine; transição sempre validada + evento + auditoria.
- Documentos oficiais (avaliação, parecer, notificação, portaria) exigem geração assíncrona, metadados institucionais, hash/identificador, integração com storage e auditoria.
- Regras jurídicas críticas: avaliação assinada imutável, parecer com assinatura de todos os membros, recurso após ciência, portaria após ciência, chefia sem edição após assinatura.
- Escopo MVP explícito: **Caso 2 (ingresso após 31/07/2015)** e fluxo principal até homologação.

Conclusão de governança técnica: qualquer referência externa só é válida se **preservar esses invariantes**.

---

## 2) Pesquisa comparativa dos projetos obrigatórios

> Escala de aderência: **Alta / Média / Baixa** para o contexto SADEP (processo administrativo formal, jurídico, auditável).

### 2.1 WKS Platform
- Repositório: <https://github.com/wks-platform>
- Stack típica: Java + componentes BPM/ECM (varia por módulo).
- Domínio: gestão de processos organizacionais/documentais.
- Resolve bem: modelagem de workflow e formalismo operacional.
- Não resolve bem: aderência direta à stack alvo (Nest/Next/Prisma) e simplicidade de MVP enxuto.
- Reaproveitar: ideias de trilha formal, ciclo de processo+documento.
- Evitar copiar: acoplamento a ecossistema pesado/plataforma monolítica.
- Proximidade: **Média**.
- Melhor uso: referência arquitetural/conceitual.
- Adoção MVP: **alta fricção**.
- Risco complexidade/lock-in: **alto**.

### 2.2 Flowable
- Repositório: <https://github.com/flowable/flowable-engine>
- Stack: Java, BPMN/CMMN/DMN.
- Domínio: BPM e case management empresarial.
- Resolve bem: engine robusta de fluxo, histórico técnico de execução, modelagem BPMN.
- Não resolve bem: curva/custo operacional para MVP institucional enxuto em TS; governança de modelo pode ficar pesada.
- Reaproveitar: padrões de separação fluxo vs decisão (DMN), histórico por evento.
- Evitar copiar: adoção integral da engine no MVP inicial.
- Proximidade: **Média-Alta** (conceitual), **Média** (adoção prática).
- Melhor uso: referência arquitetural e parcial de modelagem.
- Adoção MVP: **média-alta**.
- Risco complexidade/lock-in: **médio-alto**.

### 2.3 Activiti
- Repositório: <https://github.com/Activiti/Activiti>
- Stack: Java, BPMN.
- Domínio: workflow/BPM.
- Resolve bem: orquestração por modelo de processo.
- Não resolve bem: ecossistema menos tracionado que alternativas, pouca vantagem para stack TS.
- Reaproveitar: conceitos de definição explícita de processo.
- Evitar copiar: dependência de engine completa para MVP.
- Proximidade: **Média**.
- Melhor uso: referência conceitual.
- Adoção MVP: **média-alta**.
- Risco complexidade/lock-in: **médio**.

### 2.4 Camunda (7/8, OSS core)
- Repositório: <https://github.com/camunda>
- Stack: Java (Camunda 7), Zeebe/Go/Java no ecossistema Camunda 8.
- Domínio: automação de processos ponta-a-ponta.
- Resolve bem: governança de processo, observabilidade de fluxo, robustez enterprise.
- Não resolve bem: sobrecarga operacional para MVP; acoplamento de modelagem e runtime de engine.
- Reaproveitar: disciplina de modelagem de estados/eventos, visibilidade operacional.
- Evitar copiar: plataforma completa no início.
- Proximidade: **Média-Alta** (conceitual), **Média** (prática).
- Melhor uso: referência arquitetural de governança.
- Adoção MVP: **alta**.
- Risco complexidade/lock-in: **alto**.

### 2.5 DIGIT-Core
- Repositório: <https://github.com/egovernments/DIGIT-Core>
- Stack: microserviços (majoritariamente Java/Spring), Kafka, Postgres etc.
- Domínio: plataforma govtech para serviços públicos.
- Resolve bem: padrões institucionais, multi-tenant, auditabilidade e integração gov.
- Não resolve bem: footprint grande para MVP único; custo de plataforma alto.
- Reaproveitar: princípios de plataforma pública, contratos de integração e eventos.
- Evitar copiar: granularidade de microserviços desde o dia 1.
- Proximidade: **Média** (gov), **Baixa-Média** (MVP pragmático).
- Melhor uso: referência arquitetural institucional.
- Adoção MVP: **alta**.
- Risco complexidade/lock-in: **alto** (por ecossistema/plataforma).

### 2.6 lib-bpmn-engine (Go)
- Repositório: (projetos comunitários com esse nome; variam por mantenedor)
- Stack: Go + interpretação BPMN simplificada.
- Domínio: execução leve de BPMN.
- Resolve bem: engine menor, embutível.
- Não resolve bem: maturidade/ecossistema variáveis, desalinhamento com stack principal TS/Nest.
- Reaproveitar: ideia de runtime de workflow enxuto.
- Evitar copiar: introduzir linguagem/plataforma adicional sem necessidade.
- Proximidade: **Baixa-Média**.
- Melhor uso: inspiração parcial.
- Adoção MVP: **média**.
- Risco complexidade/lock-in: **médio**.

### 2.7 GoBPM
- Repositório: <https://github.com/gobpm/gobpm> (ecossistema varia)
- Stack: Go.
- Domínio: BPM leve.
- Resolve bem: simplicidade relativa para workflows menos complexos.
- Não resolve bem: mismatch de stack e maturidade para compliance jurídico formal.
- Reaproveitar: noções de execução enxuta.
- Evitar copiar: dependência de motor em stack paralela.
- Proximidade: **Baixa**.
- Melhor uso: inspiração pontual.
- Adoção MVP: **média**.
- Risco complexidade/lock-in: **médio**.

### 2.8 GoRules ZEN + JDM Editor
- Repositório: <https://github.com/gorules>
- Stack: engine de decisão (Rust/serviços) + editor de regras.
- Domínio: decisão/regras separadas do fluxo.
- Resolve bem: externalização de regras determinísticas, versionamento de decisão, clareza de políticas.
- Não resolve bem: não substitui workflow processual completo nem trilha processual jurídica por si só.
- Reaproveitar: separação fluxo (state machine) vs regras (policy/decision table).
- Evitar copiar: mover toda regra para ferramenta externa no MVP.
- Proximidade: **Alta** (conceito de regras), **Média** (adoção direta).
- Melhor uso: referência arquitetural + componente opcional futuro.
- Adoção MVP: **média**.
- Risco complexidade/lock-in: **médio**.

### 2.9 OpenSign
- Repositório: <https://github.com/OpenSignLabs/OpenSign>
- Stack: web app de assinatura eletrônica (stack varia por versão).
- Domínio: assinatura digital e gestão de envelopes.
- Resolve bem: fluxo de assinatura e rastreio de assinantes.
- Não resolve bem: não é motor de processo administrativo completo.
- Reaproveitar: padrões de trilha de assinatura e evidências.
- Evitar copiar: delegar o coração do processo para ferramenta de assinatura.
- Proximidade: **Média** (subdomínio assinatura).
- Melhor uso: componente parcial/inspiração.
- Adoção MVP: **média**.
- Risco complexidade/lock-in: **médio** (dependendo da integração).

### 2.10 Documenso
- Repositório: <https://github.com/documenso/documenso>
- Stack: TypeScript/Next.js (produto de assinatura/documentos).
- Domínio: assinatura eletrônica e documentos.
- Resolve bem: UX moderna de assinatura, trilha de evidência de assinatura.
- Não resolve bem: workflow jurídico-administrativo fim-a-fim com estados de processo.
- Reaproveitar: conceitos de assinatura, evidência, status de documento.
- Evitar copiar: acoplar processo administrativo ao modelo interno da ferramenta.
- Proximidade: **Média** (documentos/assinaturas), **Baixa-Média** (processo completo).
- Melhor uso: referência UX operacional + componente potencial.
- Adoção MVP: **baixa-média** (se integração mínima), **média** (integração profunda).
- Risco complexidade/lock-in: **médio**.

---

## 3) Referências adicionais realmente úteis (sem substituir as obrigatórias)

### 3.1 Temporal
- Repositório: <https://github.com/temporalio/temporal>
- Valor: orquestração durável, replay, histórico forte.
- Limite: complexidade operacional para MVP.
- Uso recomendado: inspiração para robustez de workflow assíncrono, não adoção imediata.

### 3.2 n8n / Node-RED (comparativo negativo para este caso)
- Valor: automação rápida.
- Limite crítico: inadequados como núcleo jurídico-processual determinístico de estado.
- Uso recomendado: evitar como motor central do SADEP.

### 3.3 Keycloak (RBAC/IAM)
- Repositório: <https://github.com/keycloak/keycloak>
- Valor: autenticação e autorização centralizadas.
- Limite: não resolve domínio processual; adiciona operação.
- Uso recomendado: futuro para SSO institucional.

---

## 4) Conflitos explícitos: documentos internos vs referências externas

1. **BPMN com caminhos flexíveis** vs regra interna de transição rígida sem pulo de estado.
   - Prioridade: regra interna.
2. **Edição de artefatos após etapas de assinatura** (algumas plataformas permitem revisões) vs imutabilidade pós-assinatura.
   - Prioridade: regra interna.
3. **Lógica de negócio distribuída em frontend/forms** em plataformas low-code vs backend como fonte única.
   - Prioridade: regra interna.
4. **Adoção de suíte BPM completa no MVP** vs escopo enxuto e juridicamente seguro.
   - Prioridade: MVP interno.

---

## 5) Padrões arquiteturais recorrentes relevantes

- Máquina de estados explícita com guards.
- Separação entre orquestração de fluxo e regras de decisão.
- Auditoria por evento (quem, quando, qual ação, estado antes/depois).
- Documentos como artefatos de processo (snapshot assinado/imutável).
- RBAC estrito por papel processual.
- Execução assíncrona para tarefas pesadas (PDF, assinatura, notificação).
- Backend como guardião da legalidade das transições.

---

## 6) Decisão para o MVP (recomendação)

### Escolha recomendada
**Workflow próprio com state machine no backend + regras separadas (abordagem híbrida leve, sem engine BPM externa no início).**

### Justificativa
- Maximiza aderência às regras internas mandatórias.
- Minimiza complexidade operacional e lock-in no MVP.
- Preserva evolução futura para BPM/DMN externos sem reescrever o núcleo, desde que contratos de transição/evento sejam estáveis.

### Alternativas e descarte parcial
- **Engine BPM externa agora**: forte governança, porém custo/complexidade altos para recorte MVP.
- **State machine própria sem separação de regras**: simples, mas arrisca acoplamento entre fluxo e política temporal/jurídica.
- **Só regras externas + fluxo ad hoc**: inadequado; perde rigor de trilha de estado.

---

## 7) Diretriz arquitetural inicial para stack alvo

- Frontend Next.js/TS/Tailwind: apenas interface e consumo de API, sem regra jurídica.
- Backend NestJS/TS + Prisma/Postgres: núcleo de domínio, workflow, regras, auditoria.
- Redis + BullMQ: fila para PDF, assinatura, notificação.
- Worker separado: execução assíncrona idempotente.
- Cron separado: prazos e verificações temporais.
- Persistência de auditoria append-only para ações críticas.
- Documentos oficiais versionados por estado, com hash e bloqueio de mutação após assinatura.
- Contratos de integração preparados para legado (eventos de domínio + APIs estáveis), mas sem dependência imediata.

Observação posterior (`BE-TECH-02`): `apps/worker` e `apps/cron` permanecem como estrutura reservada para essa stack alvo, sem execução operacional no MVP.

---

## 8) O que aproveitar / evitar

### Aproveitar fortemente
- Flowable/Camunda: disciplina de modelagem de processo e histórico.
- GoRules ZEN: separação de decisões determinísticas.
- Documenso/OpenSign: trilha de assinatura e evidências documentais.

### Reaproveitamento parcial
- DIGIT-Core: visão gov de interoperabilidade e padrões institucionais.
- WKS Platform: integração processo + documento como conceito.

### Evitar no MVP
- Adoção integral de suíte BPM pesada.
- Dependência de motor em stack distinta (Go/Java) sem necessidade imediata.
- Plataformas de automação genérica como núcleo do processo jurídico.
