# Frontend Tasks Roadmap — AEP-PA

**Status:** Backlog operacional do frontend  
**Versão:** 1.0.0  
**Data:** 2026-04-15  
**Sincronização mais recente com o código:** 2026-04-28
**Escopo:** Lista de tasks fechadas para evolução imediata do frontend  
**Responsável principal:** Dev frontend  
**Regra de uso:** marcar a task como concluída somente após implementação validada

---

## Estado observado em 2026-04-28

Esta revisão compara o backlog com o código atual do frontend.

### Já observado no código
- `/servidor-estagiario` já usa `InternServerWorkspace` com snapshot operacional do backend, assinatura da avaliação da chefia, autoavaliação e histórico recente.
- `/chefia-imediata` já usa `SupervisorEvaluationWorkspace` com rascunho, submissão, retificação e assinatura da autoavaliação.
- `/cesad-comissao` já usa `CesadStageReadWorkspace` consumindo a leitura consolidada da etapa em modo somente leitura.
- `/admin` e `/homologacao-autoridade` já deixaram de usar placeholder genérico e passaram a ter painéis próprios de apoio.
- `npm run frontend:typecheck` e `npm run frontend:build` passaram nesta revisão.

### Consequência para o backlog
- A FT-07 foi marcada como concluída porque o workspace real da CESAD já existe e consome o endpoint de leitura consolidada.
- As FT-08 a FT-13 continuam abertas porque a CESAD ainda concentra a maior parte da UI em um componente grande; a próxima melhoria é extrair componentes reutilizáveis.
- As FT-04, FT-05 e FT-06 continuam abertas como tarefas de refinamento, não como criação das jornadas do zero.
- A FT-17 continua aberta porque a homologação tem painel de apoio, mas ainda pode ser melhor preparada como estrutura de expansão.

---

## Como usar este documento

- `[ ]` = não iniciada
- `[x]` = concluída
- atualize este arquivo conforme a execução
- não marcar como concluída apenas porque um agente gerou código
- marcar como concluída somente após:
  - revisão do código
  - validação visual/funcional
  - confirmação de que a task respeitou o escopo

---

## Bloco 1 — Ajustes transversais e consolidação da base

### [x] FT-01 — Padronizar semântica visual dos status
**Objetivo:** revisar e consolidar o uso visual de status no frontend.

**Escopo:**
- revisar `StatusBadge`
- padronizar tons aceitos
- eliminar usos divergentes
- alinhar status de:
  - processo
  - documento
  - assinatura
  - etapa
  - bloqueio/aviso

**Fora do escopo:**
- criação de novos status de domínio
- mudança de regra de backend

---

### [x] FT-02 — Criar componentes reutilizáveis de estados visuais
**Objetivo:** padronizar feedback visual de empty state, blocked state e warning state.

**Escopo:**
- componente para processo não encontrado
- componente para acesso bloqueado
- componente para etapa indisponível
- componente para documento ausente
- componente para leitura ainda não liberada
- componente para histórico insuficiente

**Fora do escopo:**
- lógica de autorização
- lógica de workflow

---

### [x] FT-03 — Revisar loading, erro e sucesso nas telas operacionais atuais
**Objetivo:** melhorar consistência de UX nas telas já funcionais.

**Escopo:**
- revisar estados de loading
- revisar mensagens de erro
- revisar mensagens de sucesso
- padronizar feedback visual em:
  - `/processos`
  - `/chefia-imediata`
  - `/servidor-estagiario`

**Fora do escopo:**
- novas features
- novos endpoints

---

## Bloco 2 — Refinamento das áreas já funcionais

### [x] FT-04 — Refinar a tela `/processos`
**Objetivo:** transformar a tela técnica em painel operacional de leitura do processo.

**Escopo:**
- reorganizar blocos visuais
- destacar:
  - status do processo
  - ações disponíveis
  - última movimentação
  - documentos
  - bloqueios
- melhorar lista de processos consultados
- melhorar estado vazio e estado de erro

**Fora do escopo:**
- inferir elegibilidade
- criar ações novas
- alterar fluxo jurídico

**Evidência observada em 2026-04-28:**
- `/processos` já organiza consulta, resumo, status, ações disponíveis, histórico, bloqueios e detalhes técnicos a partir do snapshot carregado;
- `ProcessHistoryCard` passou a exibir movimentações recentes em lista, em vez de apenas a última movimentação;
- `ProcessListCard` teve o estado vazio ajustado para linguagem operacional atual;
- validações executadas: `npm run frontend:typecheck` e `npm run frontend:build`.

---

### [ ] FT-05 — Refinar a jornada da chefia imediata
**Objetivo:** melhorar usabilidade da avaliação da chefia.

**Escopo:**
- reorganizar formulário
- melhorar validações visuais
- melhorar UX dos critérios
- melhorar feedback de bloqueio por estado
- destacar melhor:
  - etapa
  - status do processo
  - possibilidade de rascunho
  - possibilidade de submissão
  - possibilidade de retificação

**Fora do escopo:**
- recurso por etapa
- resposta a despacho recursal
- reavaliação substitutiva

---

### [ ] FT-06 — Refinar a jornada do servidor estagiário
**Objetivo:** melhorar a leitura documental e a experiência da assinatura.

**Escopo:**
- melhorar card do documento da avaliação
- destacar melhor status documental e assinaturas
- melhorar UX da ação de assinatura
- melhorar mensagens de indisponibilidade
- organizar melhor a lista de processos consultados

**Fora do escopo:**
- recurso de etapa
- notificação final
- recurso final

---

## Bloco 3 — CESAD: transformar placeholder em área funcional

### [x] FT-07 — Implementar workspace real da CESAD em `/cesad-comissao`
**Objetivo:** transformar a área CESAD em painel funcional de leitura da etapa.

**Escopo:**
- consumir a leitura consolidada da etapa pela CESAD
- exibir:
  - processo
  - servidor
  - etapa
  - status do processo
  - status da instrução documental
  - avaliação da chefia
  - autoavaliação
  - documentos
  - assinaturas
  - histórico resumido
  - warnings
- manter tudo em modo leitura

**Fora do escopo:**
- editor de parecer
- assinatura de parecer
- conclusão de parecer

**Dependência:**
- backend da Task 10A concluído

**Evidência observada em 2026-04-28:**
- rota `/cesad-comissao` renderiza `CesadStageReadWorkspace`;
- o componente consome `getCesadStageReadSnapshot`;
- a tela exibe processo, servidor, etapa, status, avaliações, documentos, assinaturas, histórico e warnings em modo leitura;
- validações executadas: `npm run frontend:typecheck` e `npm run frontend:build`.

**Observação:**
- a extração dos componentes reutilizáveis da CESAD permanece aberta nas FT-08 a FT-13.

---

### [x] FT-08 — Criar `ProcessHeaderCard`
**Objetivo:** padronizar o cabeçalho visual do processo.

**Escopo:**
- processo
- servidor
- status
- etapa
- perfil/contexto visual

**Fora do escopo:**
- lógica de negócio

**Evidência observada em 2026-04-28:**
- componente criado em `apps/frontend/src/features/cesad/components/process-header-card.tsx`;
- `CesadStageReadWorkspace` passou a usar o componente no cabeçalho da leitura consolidada;
- a refatoração manteve o mesmo endpoint e apenas reorganizou apresentação;
- validações executadas: `npm run frontend:typecheck` e `npm run frontend:build`.

---

### [x] FT-09 — Criar `StageSummaryCard`
**Objetivo:** apresentar resumo visual da etapa em foco.

**Escopo:**
- número da etapa
- situação da etapa
- status da instrução documental
- total de etapas, quando disponível

**Fora do escopo:**
- timeline completa das 4 etapas

**Evidência observada em 2026-04-28:**
- componente criado em `apps/frontend/src/features/cesad/components/stage-summary-card.tsx`;
- `CesadStageReadWorkspace` passou a usar o componente para o resumo da etapa e status documental;
- a refatoração manteve a leitura da CESAD em modo somente leitura, sem nova regra de negócio;
- validações executadas: `npm run frontend:typecheck` e `npm run frontend:build`.

---

### [x] FT-10 — Criar `StageDocumentList`
**Objetivo:** padronizar a listagem dos documentos da etapa.

**Escopo:**
- avaliação da chefia
- autoavaliação
- parecer da etapa, quando existir
- status documental
- disponibilidade
- ação de visualizar, quando disponível

**Fora do escopo:**
- parecer conclusivo final
- documentos finais

**Evidência observada em 2026-04-28:**
- componente criado em `apps/frontend/src/features/cesad/components/stage-document-list.tsx`;
- `CesadStageReadWorkspace` passou a delegar a listagem de documentos e assinaturas da etapa para o componente;
- a refatoração preservou os mesmos dados retornados pelo snapshot consolidado da CESAD;
- validações executadas: `npm run frontend:typecheck` e `npm run frontend:build`.

---

### [x] FT-11 — Criar `SignatureTimeline`
**Objetivo:** padronizar a exibição das assinaturas ligadas aos documentos da etapa.

**Escopo:**
- signatários
- status da assinatura
- data/hora, quando houver
- pendências

**Fora do escopo:**
- assinatura em si
- workflow de assinatura

**Evidência observada em 2026-04-28:**
- componente criado em `apps/frontend/src/features/cesad/components/signature-timeline.tsx`;
- `StageDocumentList` passou a delegar a exibição de assinaturas para o componente;
- a refatoração preservou somente leitura e não adicionou fluxo de assinatura;
- validações executadas: `npm run frontend:typecheck` e `npm run frontend:build`.

---

### [x] FT-12 — Criar `StageHistoryPanel`
**Objetivo:** padronizar a exibição do histórico resumido da etapa.

**Escopo:**
- evento
- ator
- papel
- data/hora
- resumo

**Fora do escopo:**
- histórico bruto completo
- filtros avançados

**Evidência observada em 2026-04-28:**
- componente criado em `apps/frontend/src/features/cesad/components/stage-history-panel.tsx`;
- `CesadStageReadWorkspace` passou a delegar o histórico resumido relevante para o componente;
- a refatoração preservou os mesmos eventos auditáveis vindos do backend;
- validações executadas: `npm run frontend:typecheck` e `npm run frontend:build`.

---

### [x] FT-13 — Criar `ProcessWarningsPanel`
**Objetivo:** exibir warnings e limitações vindos do backend de forma clara.

**Escopo:**
- warnings da leitura consolidada
- mensagens de compatibilidade
- mensagens de limitação de histórico

**Fora do escopo:**
- geração de warning no frontend

**Evidência observada em 2026-04-28:**
- componente criado em `apps/frontend/src/features/cesad/components/process-warnings-panel.tsx`;
- `CesadStageReadWorkspace` passou a delegar os warnings da leitura consolidada para o componente;
- a refatoração apenas apresenta warnings já enviados pelo backend;
- validações executadas: `npm run frontend:typecheck` e `npm run frontend:build`.

---

## Bloco 4 — Preparação dos próximos fluxos do backend

### [x] FT-14 — Criar timeline visual das 4 etapas
**Objetivo:** preparar componente reutilizável para exibir progresso por etapas.

**Escopo:**
- etapa 1 a 4
- estados visuais por etapa
- destaque da etapa atual
- componente reutilizável

**Fora do escopo:**
- cálculo de status no frontend
- timeline jurídica completa sem backend correspondente

**Evidência observada em 2026-04-28:**
- componente reutilizável criado em `apps/frontend/src/features/process/components/stage-timeline.tsx`;
- `/cesad-comissao` passou a usar a timeline para exibir a etapa em foco dentro do total de etapas informado pelo backend;
- etapas fora da consulta atual não recebem status inferido pelo frontend;
- validações executadas: `npm run frontend:typecheck` e `npm run frontend:build`.

---

### [x] FT-15 — Criar visualização padronizada de documentos por etapa
**Objetivo:** permitir exibição consistente dos artefatos da etapa em várias telas.

**Escopo:**
- documento
- etapa
- status
- assinatura
- disponibilidade
- versão vigente, quando aplicável

**Fora do escopo:**
- documentos finais fora do escopo da etapa

**Evidência observada em 2026-04-28:**
- componente reutilizável criado em `apps/frontend/src/features/process/components/stage-document-overview.tsx`;
- `StageDocumentList` passou a adaptar documentos da CESAD para a visualização padronizada;
- a refatoração manteve a lista da CESAD em modo somente leitura e sem nova regra de negócio;
- validações executadas: `npm run frontend:typecheck` e `npm run frontend:build`.

---

### [ ] FT-16 — Preparar layout base do futuro parecer CESAD de etapa
**Objetivo:** deixar pronta a estrutura visual para o próximo incremento do backend.

**Escopo:**
- layout da área de parecer
- separação entre leitura da etapa e futuro parecer
- placeholders claros de indisponibilidade
- componentes desacoplados da persistência

**Fora do escopo:**
- salvar parecer
- editar parecer real
- assinar parecer

---

### [ ] FT-17 — Preparar a área `/homologacao-autoridade` como painel pronto para expansão
**Objetivo:** deixar a área de homologação menos genérica e mais alinhada ao fluxo futuro.

**Escopo:**
- blocos visuais preparados para:
  - fila futura
  - parecer final
  - decisão homologatória
  - notificação
- states vazios e mensagens institucionais claras

**Fora do escopo:**
- homologação funcional
- recurso final
- notificação real

---

## Bloco 5 — Polimento e consistência

### [ ] FT-18 — Revisar consistência textual e institucional das áreas por perfil
**Objetivo:** alinhar títulos, subtítulos, descrições e mensagens ao contexto do AEP-PA.

**Escopo:**
- revisar copy de:
  - CESAD
  - homologação
  - chefia
  - servidor
  - processos
- reduzir mensagens genéricas demais

**Fora do escopo:**
- mudança de regra de negócio

---

### [ ] FT-19 — Revisar responsividade das telas principais
**Objetivo:** garantir boa usabilidade em resoluções menores.

**Escopo:**
- revisar:
  - `/processos`
  - `/chefia-imediata`
  - `/servidor-estagiario`
  - `/cesad-comissao`
- ajustar quebras de layout
- ajustar overflow e legibilidade

**Fora do escopo:**
- redesign visual completo

---

### [ ] FT-20 — Revisar consistência visual do shell autenticado
**Objetivo:** consolidar a experiência institucional interna.

**Escopo:**
- sidebar
- topbar
- cabeçalhos
- espaçamentos
- alinhamento entre áreas por perfil

**Fora do escopo:**
- troca completa de design system

---

## Ordem recomendada de execução a partir de 2026-04-28

1. FT-08 a FT-13 — Extrair componentes reutilizáveis da área CESAD
2. FT-14 — Criar timeline visual das 4 etapas
3. FT-15 — Criar visualização padronizada de documentos por etapa
4. FT-04 — Refinar a tela `/processos`  
5. FT-05 — Refinar a jornada da chefia imediata  
6. FT-06 — Refinar a jornada do servidor estagiário  
7. FT-16 — Preparar layout base do futuro parecer CESAD de etapa
8. FT-17 — Preparar a área `/homologacao-autoridade`
9. FT-18 — Revisar consistência textual
10. FT-19 — Revisar responsividade
11. FT-20 — Revisar shell autenticado

---

## Regra final

Este documento é um backlog operacional de curto prazo.  
Ele deve ser atualizado pelo dev frontend ao longo da execução, marcando tasks concluídas somente após validação real.
