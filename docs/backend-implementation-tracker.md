# AEP-PA Backend Implementation Tracker

**Status:** Controle operacional das implementações do backend  
**Versão:** 1.5.0  
**Data:** 2026-04-22  
**Objetivo:** Registrar, controlar e acompanhar as implementações do backend do AEP-PA com suporte a execução por agente de IA, revisão técnica e aprovação humana.

---

# Finalidade deste documento

Este documento funciona como o **tracker oficial das implementações do backend**.

Ele deve ser usado para:

- indicar qual bloco/feature está ativo no momento;
- indicar qual task específica está autorizada para implementação;
- controlar o que está pendente, em execução, auditado, aprovado e concluído;
- servir de base para prompts de implementação e de auditoria;
- impedir que o agente avance fora do escopo autorizado;
- manter rastreabilidade entre task, implementação, auditoria e commit;
- alinhar a execução prática do backend com o checklist de correções estruturais do projeto.

---

# Regras de uso

## Status das tasks

Cada task deve usar exatamente um dos status abaixo:

- `PLANNED` = task mapeada, ainda não iniciada
- `ACTIVE` = task atualmente autorizada para implementação
- `IMPLEMENTED` = código foi gerado/alterado, mas ainda não auditado
- `AUDITED` = implementação revisada tecnicamente
- `APPROVED` = implementação aprovada humanamente
- `DONE` = task concluída, com commit definido e tracker atualizado
- `BLOCKED` = task bloqueada por dependência, decisão ou erro estrutural

## Regras operacionais

- trabalhar em **apenas uma task por vez**
- não avançar para outra task sem autorização explícita
- não mudar status para `DONE` sem aprovação humana
- toda implementação deve vir acompanhada de:
  - resumo do que foi feito
  - arquivos alterados
  - diffs relevantes
  - validações executadas
- quando necessário, a implementação deve passar por **prompt de auditoria**
- se surgir problema fora do escopo:
  - registrar em **Observações**
  - não corrigir no mesmo lote sem autorização

---

# Regra operacional para uso com Codex

Sempre que uma implementação for iniciada, o prompt deve indicar explicitamente:

1. o arquivo a ser consultado:
   - `docs/backend-implementation-tracker.md`
2. o bloco/feature ativo
3. a task específica autorizada
4. a proibição de avançar para outras tasks
5. a proibição de marcar como concluída sem autorização
6. a obrigação de devolver:
   - resumo técnico
   - arquivos alterados
   - diffs
   - validações executadas
   - limitações ou pendências encontradas

---

# Estratégia atual do roadmap

A ordem de trabalho foi reorganizada segundo os seguintes princípios:

1. **Segurança e autorização primeiro**
2. **Backend testável antes de novas features**
3. **Alinhamento real entre frontend e backend antes de expansões de domínio**
4. **Fluxo ponta a ponta operacional antes do refinamento de read models secundários**
5. **Hardening operacional antes de expansão maior**
6. **Base institucional da CESAD antes da assinatura colegiada**
7. **Evolução documental e de assinatura do parecer CESAD depois da base de domínio**

Essa ordem reduz risco de regressão e evita construir novas regras sobre uma base insegura, inconsistente ou desalinhada entre interface e API.

A última varredura mostrou que o projeto está mais estável do que os documentos indicavam: typecheck e suíte continuam íntegros, o histórico público já foi saneado, e os principais desalinhamentos críticos recentes estão migrando do bloco “infra/saneamento” para o bloco “fluxo operacional ponta a ponta”. Por isso, a próxima prioridade deixou de ser apenas hardening técnico e passou a ser o fechamento do ciclo real até a CESAD. :contentReference[oaicite:0]{index=0}

---

# Estado atual

## Bloco/feature ativa
**BLOCO 2A — Alinhamento Frontend/Backend**

## Task ativa
**ALIGN-04 — Alinhar fluxo de autoavaliação do servidor e assinatura da autoavaliação pela chefia no frontend**

## Contexto atual
Após o saneamento do histórico público e o alinhamento das workspaces de servidor, chefia e permissões de navegação, a próxima prioridade prática passou a ser fechar o fluxo operacional até a CESAD.

A varredura mais recente indicou que:

- o backend já possui fluxo de autoavaliação e assinatura da autoavaliação pela chefia;
- o frontend ainda não expõe esse caminho de forma operacional;
- isso pode travar o processo antes da CESAD, mesmo com os demais alinhamentos já concluídos;
- o item “sessão stale” perdeu urgência como crítico;
- surgiu também um ajuste residual de UX/RBAC na home autenticada, que ainda promete `/processos` para perfis que a tela atual não suporta com segurança. :contentReference[oaicite:1]{index=1}

---

# Tracker de Tasks

---

# BLOCO 1 — Segurança e Autorização

Objetivo: eliminar vulnerabilidades de autorização por vínculo de processo.

Essas tasks foram priorizadas antes de qualquer nova evolução funcional e já foram saneadas.

---

## BE-SEC-01 — Corrigir autorização por vínculo de processo no workflow e histórico

- **Status:** DONE
- **Prioridade:** Crítica
- **Responsável atual:** A definir
- **Auditoria necessária:** Sim
- **Commit associado:** `fix(backend): harden workflow process access and block unsafe supervisor access`
- **Dependências:** Nenhuma

**Problema**  
As rotas de workflow aceitam qualquer usuário autenticado e a service decide ações apenas pelo role, sem validar corretamente o vínculo do usuário com o processo.

**Impacto**
- consulta indevida de histórico
- tentativa de movimentação de processo de terceiros
- exposição de dados processuais a usuários não vinculados

**Arquivos principais**
- `apps/backend/src/processes/processes.controller.ts`
- `apps/backend/src/processes/processes.service.ts`
- `apps/backend/src/processes/workflow-catalog.ts`

**Escopo**
- validar vínculo do usuário com o processo antes de:
  - leitura de processo
  - consulta de histórico
  - execução de transições
- impedir acesso autorizado apenas por role
- alinhar a lógica entre controller e service
- definir explicitamente o comportamento de `ADMIN`, se houver exceção legítima

**Fora do escopo**
- refatoração ampla do módulo de workflow
- mudanças de frontend
- alterações na modelagem da CESAD
- mudanças em autenticação JWT

**Critério de conclusão**
- usuário só consegue consultar e agir em processo com vínculo legítimo
- histórico passa a respeitar vínculo do usuário
- cenários de acesso indevido são bloqueados
- sem regressão dos fluxos autorizados atuais

**Validações esperadas**
- usuário vinculado acessa
- usuário não vinculado é bloqueado
- histórico respeita vínculo
- transições respeitam vínculo
- `ADMIN` só acessa se a regra do sistema permitir explicitamente

**Observações**
- usar como referência o padrão seguro já existente em `self-evaluations.service.ts`
- concluída com postura conservadora para `IMMEDIATE_SUPERVISOR`, bloqueado em workflow/history/transition por ausência de fonte autoritativa segura de vínculo no módulo de processos
- a fonte autoritativa de vínculo da chefia ainda não existia no módulo de processos naquele momento
- a resolução completa do vínculo legítimo da chefia foi endereçada na task seguinte

---

## BE-SEC-02 — Corrigir autorização por vínculo na avaliação da chefia

- **Status:** DONE
- **Prioridade:** Crítica
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** `fix(backend): enforce supervisor stage binding in supervisor evaluations`
- **Dependências:** BE-SEC-01 recomendada antes

**Problema**  
Qualquer `ADMIN` ou `IMMEDIATE_SUPERVISOR` pode atuar em qualquer processo na avaliação da chefia, porque a validação atual considera basicamente o role.

**Impacto**
- leitura indevida
- criação de rascunho por terceiro
- submissão indevida
- retificação indevida

**Arquivos principais**
- `apps/backend/src/processes/supervisor-evaluations/supervisor-evaluations.service.ts`

**Referência de padrão seguro**
- `apps/backend/src/processes/self-evaluations/self-evaluations.service.ts`

**Escopo**
- validar se o supervisor é a chefia responsável pelo processo/etapa
- bloquear leitura, rascunho, submissão e retificação por terceiros
- alinhar o padrão com o já adotado na autoavaliação

**Fora do escopo**
- alterações amplas no fluxo documental
- frontend
- mudanças na modelagem de assinatura

**Critério de conclusão**
- somente a chefia legítima consegue atuar na avaliação da etapa
- cenários de acesso indevido são bloqueados
- sem regressão do fluxo legítimo da chefia

**Validações esperadas**
- chefia legítima acessa
- chefia não vinculada é bloqueada
- `ADMIN` segue somente a regra explicitamente permitida pelo sistema

**Observações**
- concluída com vínculo estrutural da chefia por etapa em `ProcessStage.responsibleSupervisorUserId`
- a autorização da avaliação da chefia passou a usar essa fonte estrutural
- `ADMIN` ficou sem bypass automático
- processos/etapas legados sem `responsibleSupervisorUserId` permanecem bloqueados por segurança até preenchimento adequado

---

# BLOCO 2 — Estabilização Técnica do Backend

Objetivo: garantir que o backend esteja testável e confiável para evolução.

---

## BE-QUAL-01 — Corrigir typecheck do backend

- **Status:** DONE
- **Prioridade:** Crítica
- **Responsável atual:** —
- **Auditoria necessária:** Não obrigatória, salvo mudança ampla
- **Commit associado:** `docs: atualiza checklist e registra be-qual-01 como saneada`
- **Dependências:** Nenhuma

**Problema**  
Historicamente, o typecheck do backend falhava por configuração e mistura entre app, specs e helpers de teste. A falha não é mais reproduzível na árvore atual.

**Arquivos principais**
- `apps/backend/package.json`
- `apps/backend/tsconfig.json`
- `apps/backend/src/**/*.spec.ts`

**Escopo**
- alinhar dependências de tipagem
- garantir execução do typecheck do backend
- decidir se specs entram no typecheck principal ou em configuração separada

**Fora do escopo**
- reescrita geral da estratégia de testes
- correções funcionais não relacionadas ao typecheck

**Critério de conclusão**
- `npm run typecheck --workspace @aep-pa/backend` executa sem erro

**Validações esperadas**
- execução do typecheck
- verificação de que a solução não mascara erro real de tipagem relevante

**Observações**
- o typecheck do backend não apresenta mais falha reproduzível na árvore atual
- a separação estrutural entre app, specs e helpers foi tratada na task seguinte

---

## BE-QUAL-02 — Restabelecer execução da suíte de testes do backend

- **Status:** DONE
- **Prioridade:** Crítica
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** `docs: atualiza checklist e tracker para registrar be-qual-02 como saneada`
- **Dependências:** BE-QUAL-01 recomendada antes

**Problema**  
Historicamente, a suíte do backend falhava por incompatibilidade entre fixtures/testes e o schema Prisma atual. A falha não é mais reproduzível na árvore atual.

**Arquivos principais**
- `apps/backend/src/processes/tests/cesad-stage-read.service.spec.ts`
- `apps/backend/prisma/schema.prisma`
- helpers e fixtures relacionados

**Escopo**
- alinhar fixtures e dados de teste ao schema atual
- corrigir relacionamentos obrigatórios faltantes
- restabelecer execução do runner principal de testes

**Fora do escopo**
- mudança de domínio
- reescrita total das suítes
- expansão de cobertura fora do necessário

**Critério de conclusão**
- `npm run test --workspace @aep-pa/backend` executa com sucesso
- os testes principais do backend voltam a ser utilizáveis

**Validações esperadas**
- execução da suíte
- confirmação de cenários críticos de workflow, CESAD, supervisor evaluation e self evaluation

**Observações**
- a suíte do backend não apresenta mais falha reproduzível na árvore atual
- `npm run test --workspace @aep-pa/backend`, `npm run test:runner --workspace @aep-pa/backend` e `npm run test:jest --workspace @aep-pa/backend` passam
- a pendência residual de organização foi deslocada para `BE-QUAL-03`

---

## BE-QUAL-03 — Alinhar a estratégia de testes do backend

- **Status:** DONE
- **Prioridade:** Crítica
- **Responsável atual:** —
- **Auditoria necessária:** Não obrigatória, mas recomendada
- **Commit associado:** `chore(backend): align test strategy and split app/spec typecheck`
- **Dependências:** BE-QUAL-01 e BE-QUAL-02

**Problema**  
O backend estava com estratégia híbrida e pouco clara entre runner customizado e Jest, o que confundia manutenção e cobertura.

**Arquivos principais**
- `apps/backend/package.json`
- `apps/backend/src/processes/tests/run.ts`
- `apps/backend/src/**/*.spec.ts`
- `apps/backend/tsconfig.json`
- `apps/backend/jest.config.js`

**Escopo**
- definir runner oficial
- definir papel do Jest
- alinhar scripts e documentação mínima
- reduzir ambiguidade da estratégia de testes
- separar typecheck de app e specs

**Fora do escopo**
- refatoração massiva de todas as specs
- aumento amplo de cobertura
- migração total para Jest

**Critério de conclusão**
- estratégia oficial documentada e refletida em scripts
- equipe consegue saber qual comando deve ser usado como referência
- `typecheck`, `typecheck:spec`, `test`, `test:unit` e `test:integration` executam com sucesso

**Validações esperadas**
- `npm run typecheck --workspace @aep-pa/backend`
- `npm run typecheck:spec --workspace @aep-pa/backend`
- `npm run test --workspace @aep-pa/backend`
- `npm run test:unit --workspace @aep-pa/backend`
- `npm run test:integration --workspace @aep-pa/backend`

**Observações**
- concluída mantendo o modelo híbrido:
  - Jest = suíte unitária/com mocks
  - runner customizado = suíte funcional/integrada de processos
- scripts antigos foram mantidos por compatibilidade
- warnings do Prisma permanecem como pendência técnica separada em `BE-TECH-01`

---

# BLOCO 2A — Alinhamento Frontend/Backend

Objetivo: corrigir desalinhamentos reais de contrato entre frontend e backend que hoje comprometem fluxos de uso, autorização prática e leitura operacional do sistema.

---

## ALIGN-01 — Alinhar fluxo de assinatura do servidor estagiário entre frontend e backend

- **Status:** DONE
- **Prioridade:** Crítica
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** `fix(frontend): align intern signature flow with document signing endpoint`
- **Dependências:** saneamento do bloco crítico de backend concluído

**Problema**  
O frontend do servidor estagiário dependia de `availableActions` com `SIGN_EVALUATION` e tentava assinar via `POST /processes/:id/workflow/transition`, mas a assinatura real está exposta por endpoint documental dedicado.

**Impacto**
- botão de assinatura tendia a não habilitar
- quando forçado, usava rota errada
- jornada do servidor ficava quebrada mesmo com autenticação e build funcionando

**Arquivos principais**
- `apps/frontend/src/features/process/components/intern-server-workspace.tsx`
- `apps/frontend/src/shared/api/services/processes-service.ts`
- `apps/backend/src/processes/processes.service.ts`
- `apps/backend/src/processes/workflow-catalog.ts`
- `apps/backend/src/api/documents/process-documents.controller.ts`

**Escopo**
- alinhar o fluxo de assinatura do servidor ao endpoint real de assinatura documental
- deixar a liberação da ação baseada no contexto documental correto, e não em transição pública inexistente
- preservar a política de autorização já endurecida no backend

**Fora do escopo**
- revisão completa de RBAC do sistema
- mudanças de modelagem CESAD
- refatoração ampla do frontend de processos
- redesign da experiência do servidor além do fluxo de assinatura

**Critério de conclusão**
- a UI do servidor consegue identificar corretamente quando a assinatura está disponível
- a assinatura usa a rota correta
- não depende de `availableActions` inexistente no catálogo público
- o fluxo funciona com o backend real

**Observações**
- a assinatura do servidor passou a usar o endpoint documental correto
- a UI passou a decidir disponibilidade com base em `documentContext.internSignaturePending` e `workflow.status === AGUARDANDO_ASSINATURA`
- o fluxo não depende mais de `SIGN_EVALUATION` como transição pública

---

## ALIGN-02 — Alinhar snapshot/tela da chefia com a política real de acesso do backend

- **Status:** DONE
- **Prioridade:** Crítica
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** `fix(processes): add supervisor workspace snapshot and stop using public workflow endpoints`
- **Dependências:** ALIGN-01 recomendada antes

**Problema**  
A tela principal da chefia consultava endpoints públicos (`/workflow` e `/history`) que o backend bloqueia intencionalmente para supervisor desde a BE-SEC-01.

**Impacto**
- a workspace da chefia podia falhar antes de abrir a avaliação
- desalinhamento entre UI e política real de segurança
- risco de remendos incorretos no frontend

**Arquivos principais**
- `apps/frontend/src/features/process/components/supervisor-evaluation-workspace.tsx`
- `apps/frontend/src/shared/api/services/processes-service.ts`
- `apps/backend/src/processes/processes.service.ts`

**Escopo**
- separar o snapshot da chefia dos endpoints públicos bloqueados
- criar/adaptar um caminho compatível com a política real do backend
- preservar as decisões de BE-SEC-01 e BE-SEC-02

**Fora do escopo**
- reabrir supervisor nos endpoints públicos de workflow/history
- refatoração completa da UI da chefia
- revisão ampla do menu do sistema

**Critério de conclusão**
- a tela da chefia consegue abrir e operar sem depender de endpoints públicos bloqueados
- não há regressão das garantias de autorização já implementadas

**Observações**
- a workspace da chefia passou a usar endpoint seguro dedicado
- supervisor permanece bloqueado nos endpoints públicos
- as flags operacionais passaram a ser calculadas no backend
- os cards dependentes de histórico público e `availableActions` foram removidos/desativados nessa tela

---

## ALIGN-03 — Alinhar matriz de permissões entre menu, guards e backend

- **Status:** DONE
- **Prioridade:** Alta
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** `fix(frontend): align operational navigation and guards with backend permissions`
- **Dependências:** ALIGN-01 e ALIGN-02 recomendadas antes

**Problema**  
Menu, guards locais e backend contavam histórias diferentes sobre o que `ADMIN` e outros perfis podiam realmente acessar.

**Impacto**
- navegação enganosa
- rotas que prometiam suporte e devolviam 403
- experiência contraditória para perfis administrativos

**Arquivos principais**
- `apps/frontend/src/shared/rbac/menu.ts`
- `apps/frontend/src/features/process/components/supervisor-evaluation-workspace.tsx`
- `apps/frontend/src/features/process/components/intern-server-workspace.tsx`
- `apps/frontend/src/features/cesad/components/cesad-stage-read-workspace.tsx`
- `apps/backend/src/processes/processes.service.ts`
- `apps/backend/src/processes/supervisor-evaluations/supervisor-evaluations.service.ts`

**Escopo**
- definir explicitamente a política de acesso por perfil nas áreas operacionais críticas
- alinhar menu, guardas e API à mesma matriz
- evitar rotas “visíveis mas inviáveis”

**Fora do escopo**
- redefinição completa de todos os papéis do sistema
- implantação de novo RBAC genérico
- alterações de autenticação

**Critério de conclusão**
- o frontend não oferece navegação que a API rejeita sistematicamente
- a política de acesso para `ADMIN` e demais perfis fica coerente entre UI e backend

**Observações**
- menu e guards foram alinhados à matriz real do backend
- `ADMIN` deixou de aparecer como operador de áreas sem suporte backend
- `/processos` foi restringida aos perfis hoje compatíveis com a tela atual

---

## ALIGN-04 — Alinhar fluxo de autoavaliação do servidor e assinatura da autoavaliação pela chefia no frontend

- **Status:** ACTIVE
- **Prioridade:** Crítica
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** —
- **Dependências:** ALIGN-01, ALIGN-02 e ALIGN-03 concluídas antes

**Problema**  
O backend já expõe o fluxo de autoavaliação do servidor e de assinatura da autoavaliação pela chefia, inclusive com regras que podem levar o processo à CESAD, mas o frontend ainda não oferece esse caminho operacional.

**Impacto**
- o processo pode travar antes da CESAD
- o fluxo ponta a ponta não fica fechado na interface
- a estabilização anterior não se converte em uso operacional completo

**Arquivos principais**
- `apps/backend/src/processes/self-evaluations.service.ts`
- `apps/backend/src/processes/self-evaluations.controller.ts`
- `apps/backend/src/application/documents/process-documents.service.ts`
- `apps/frontend/src/shared/api/services/processes-service.ts`
- `apps/frontend/src/features/process/components/intern-server-workspace.tsx`
- `apps/frontend/src/features/process/components/supervisor-evaluation-workspace.tsx`

**Escopo**
- expor no frontend o fluxo real de autoavaliação do servidor
- expor no frontend a assinatura da autoavaliação pela chefia
- alinhar a UI aos endpoints e regras reais já existentes no backend
- garantir continuidade operacional até a CESAD

**Fora do escopo**
- redesign completo das workspaces
- mudanças de modelagem CESAD
- revisão ampla de autenticação
- migrações de banco
- refatoração geral do fluxo documental

**Critério de conclusão**
- o servidor consegue operar sua autoavaliação pela interface
- a chefia consegue operar a assinatura da autoavaliação pela interface
- o fluxo deixa de travar antes da CESAD por ausência de UI

**Observações**
- criada a partir da última varredura geral
- tem prioridade superior a `CESAD-READ-01` porque fecha o ciclo operacional ponta a ponta antes do refinamento do consolidado CESAD

---

## AUDIT-01 — Separar histórico processual público de eventos documentais

- **Status:** DONE
- **Prioridade:** Alta
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** `fix(backend): filter public workflow history by semantic transition metadata`
- **Dependências:** ALIGN-01 a ALIGN-03 podem ocorrer antes, mas não eram estritamente bloqueantes

**Problema**  
O histórico público de workflow estava sendo filtrado por `eventType` de forma ampla e incorporava eventos documentais que não representavam passos processuais públicos.

**Impacto**
- histórico duplicado ou semanticamente incorreto
- rastreabilidade pública contaminada
- frontend recebia timeline confusa

**Arquivos principais**
- `apps/backend/src/processes/processes.service.ts`
- `apps/backend/src/processes/workflow-catalog.ts`
- `apps/backend/src/application/documents/process-documents.service.ts`

**Escopo**
- separar eventos processuais públicos de eventos documentais internos
- ajustar leitura do histórico público com critério semântico mais preciso

**Fora do escopo**
- refatoração completa do sistema de auditoria
- redesign de todos os enums de evento, salvo o mínimo necessário
- revisão de todo o catálogo de documentos
- ajuste do read model CESAD

**Critério de conclusão**
- `/processes/:id/history` deixa de exibir eventos documentais como se fossem passos públicos de workflow

**Observações**
- o histórico público passou a exigir correspondência semântica entre `eventType` e `metadata.action`
- eventos com `metadata.origin === 'PROCESS_DOCUMENT'` foram excluídos da timeline pública
- o audit trail interno permaneceu intacto
- não houve necessidade de schema, migration ou mudança de enum compartilhado

---

## CESAD-READ-01 — Alinhar leitura consolidada da CESAD aos eventos realmente persistidos

- **Status:** PLANNED
- **Prioridade:** Alta
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** —
- **Dependências:** ALIGN-04 recomendada antes

**Problema**  
O read model consolidado da CESAD espera uma família de eventos, mas o serviço de parecer de etapa grava outra família, causando consolidado incompleto e warnings incorretos.

**Impacto**
- leitura consolidada parcial
- rastreabilidade incompleta da etapa
- inconsistência entre persistência e leitura

**Arquivos principais**
- `apps/backend/src/processes/cesad-stage-read.service.ts`
- `apps/backend/src/processes/cesad-stage-opinions/cesad-stage-opinions.service.ts`
- enums/eventos relacionados

**Escopo**
- alinhar o read model aos eventos realmente persistidos
- ou alinhar a persistência ao conjunto esperado, conforme a solução mínima mais segura

**Fora do escopo**
- redesign completo da CESAD
- assinatura colegiada
- modelagem da comissão

**Critério de conclusão**
- a leitura consolidada da CESAD reflete corretamente os eventos da etapa realmente emitidos pelo backend

---

# BLOCO 3 — Hardening Operacional

Objetivo: reduzir riscos operacionais e evitar padrões inseguros se propagando.

---

## BE-OPS-01 — Remover credenciais previsíveis de desenvolvimento

- **Status:** PLANNED
- **Prioridade:** Média
- **Responsável atual:** —
- **Auditoria necessária:** Não obrigatória
- **Commit associado:** —
- **Dependências:** nenhuma rígida, mas priorização posterior ao fechamento do fluxo operacional principal

**Problema**
Credenciais e segredos previsíveis de desenvolvimento estão versionados e documentados.

**Arquivos principais**
- `apps/backend/prisma/seed.ts`
- `apps/backend/.env.example`
- `docs/local-setup.md`
- `README.md`
- `apps/backend/src/config/env.validation.ts`

**Escopo**
- remover segredos previsíveis
- usar placeholders seguros
- ajustar documentação para uso local seguro
- impedir fallback fraco de JWT
- exigir senha local de seed por ambiente

**Fora do escopo**
- política completa de segredos para produção
- rotação real de credenciais em ambiente externo
- redesign de autenticação

**Critério de conclusão**
- nenhum segredo previsível relevante permanece como padrão recomendado
- documentação local deixa de publicar credenciais fixas
- seed exige configuração local explícita

---

## BE-ARCH-01 — Revisar estratégia de autenticação web

- **Status:** PLANNED
- **Prioridade:** Média
- **Responsável atual:** —
- **Auditoria necessária:** Não nesta fase
- **Commit associado:** —
- **Dependências:** nenhuma rígida

**Problema**
A estratégia atual com JWT manual e armazenamento em `localStorage/sessionStorage` amplia a superfície de risco em caso de XSS.

**Escopo**
- realizar análise arquitetural
- comparar estratégia atual com alternativas mais seguras
- produzir direção futura de evolução

**Fora do escopo**
- migração imediata para cookies HttpOnly
- refatoração backend + frontend nesta task

**Critério de conclusão**
- decisão arquitetural documentada para evolução futura da sessão web

**Observações**
- a última varredura indicou que o item “sessão stale” perdeu urgência como crítico
- ainda há mérito arquitetural na revisão da estratégia de autenticação, mas ela já não é o principal bloqueio operacional imediato

---

# BLOCO 4 — Base Institucional da CESAD

Objetivo: criar a fonte institucional da comissão CESAD antes da assinatura colegiada.

---

## BE-DOM-01 — Introduzir domínio explícito da Comissão CESAD

- **Status:** PLANNED
- **Prioridade:** Alta
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** —
- **Dependências:** estabilização mínima do backend e alinhamento operacional recomendados antes

**Objetivo**
A comissão deixa de ser apenas um conjunto difuso de usuários com role `CESAD_MEMBER`.

**Escopo**
- introduzir a comissão como domínio explícito
- permitir vigência
- preparar associação com ato normativo

**Fora do escopo**
- assinatura colegiada
- substituição por suplente
- geração formal de portaria

**Critério de conclusão**
- o sistema passa a reconhecer a comissão como entidade institucional própria

---

## BE-DOM-02 — Introduzir ato normativo / portaria da comissão

- **Status:** PLANNED
- **Prioridade:** Alta
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** —
- **Dependências:** BE-DOM-01

**Objetivo**
Registrar o ato que constitui, altera ou renova a comissão.

**Escopo**
- número
- data
- vigência
- referência textual
- associação à comissão

**Fora do escopo**
- documento formal completo
- PDF
- assinatura eletrônica
- publicação oficial automatizada

**Critério de conclusão**
- existe registro normativo estruturado servindo como fonte da composição da comissão

---

## BE-DOM-03 — Introduzir composição da comissão

- **Status:** PLANNED
- **Prioridade:** Alta
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** —
- **Dependências:** BE-DOM-01 e BE-DOM-02 recomendadas antes

**Objetivo**
Criar a composição formal da comissão.

**Escopo**
- vincular usuário à comissão
- distinguir titular e suplente
- permitir vigência e ativação/inativação

**Fora do escopo**
- substituição automática
- gestão sofisticada de impedimentos
- assinatura efetiva do parecer

**Critério de conclusão**
- a composição da comissão passa a ser fonte institucional do sistema

**Observações**
- o padrão institucional desejado é 3 titulares e 2 suplentes, mas a modelagem não deve ser rigidamente hardcoded

---

## BE-DOM-04 — Introduzir perfil Assistente da Comissão

- **Status:** PLANNED
- **Prioridade:** Média
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** —
- **Dependências:** Nenhuma rígida, mas preferencialmente após BE-DOM-01

**Objetivo**
Prever o papel administrativo-operacional da comissão.

**Papel sugerido**
- `COMMISSION_ASSISTANT`

**Pode**
- visualizar processos CESAD
- apoiar atividades administrativas
- apoiar preparação de portarias e minutas, quando permitido

**Não pode**
- assinar parecer
- deliberar como membro
- homologar

**Critério de conclusão**
- o domínio e os contracts passam a prever formalmente esse perfil

---

# BLOCO 5 — Ponte entre Comissão e Parecer

Objetivo: conectar a base institucional da comissão ao parecer CESAD de etapa.

---

## BE-STR-01 — Modelar signatários esperados do parecer CESAD

- **Status:** PLANNED
- **Prioridade:** Alta
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** —
- **Dependências:** BE-DOM-01, BE-DOM-02 e BE-DOM-03 recomendadas antes

**Objetivo**
Separar:
- quem integra a comissão
- de quem deve assinar um parecer específico

**Escopo**
- modelar signatários esperados do parecer CESAD
- derivar inicialmente os signatários ordinários a partir dos titulares
- manter explícita a separação entre signatário esperado e assinatura efetiva

**Fora do escopo**
- assinatura final do parecer
- PDF
- documento formal completo
- suplência operacional
- refatoração global de `SignatureRecord`

**Critério de conclusão**
- o parecer CESAD passa a poder ter signatários esperados próprios, sem quebrar os documentos simples

**Observações**
- nesta fase, apenas titulares entram como signatários esperados ordinários
- suplentes ficam modelados, mas não participam automaticamente

---

# BLOCO 6 — Evolução Documental do Parecer CESAD

Objetivo: formalizar documentalmente o parecer e suportar assinatura colegiada.

---

## BE-FLOW-10A — Formalizar documento do parecer CESAD

- **Status:** PLANNED
- **Prioridade:** Média
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** —
- **Dependências:** BE-STR-01

**Objetivo**
Criar o documento formal derivado do parecer CESAD de etapa.

---

## BE-FLOW-10B — Implementar assinatura do parecer CESAD

- **Status:** PLANNED
- **Prioridade:** Média
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** —
- **Dependências:** BE-FLOW-10A

**Objetivo**
Conectar:
- signatários esperados
- assinaturas efetivas

**Observações**
- não alterar a regra estável dos documentos simples em `SignatureRecord`

---

## BE-FLOW-10C — Implementar substituição explícita por suplente

- **Status:** PLANNED
- **Prioridade:** Média
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** —
- **Dependências:** BE-FLOW-10B e modelagem mínima de suplência

**Objetivo**
Permitir:
- titular impedido
- suplente substitui
- justificativa registrada
- trilha auditável

**Observações**
- não deve haver automatismo de substituição nesta fase

---

# BLOCO 7 — Dívida Técnica e Evolução Estrutural

Objetivo: reduzir débitos técnicos que não são bloqueadores imediatos, mas precisam entrar no radar.

---

## BE-TECH-01 — Migrar a configuração depreciada do Prisma

- **Status:** PLANNED
- **Prioridade:** Baixa
- **Responsável atual:** —
- **Auditoria necessária:** Não obrigatória
- **Commit associado:** —
- **Dependências:** Nenhuma

**Objetivo**
Migrar configuração depreciada do Prisma para formato compatível com versões futuras.

---

## BE-TECH-02 — Revisar estrutura de workspaces (worker / cron)

- **Status:** PLANNED
- **Prioridade:** Baixa
- **Responsável atual:** —
- **Auditoria necessária:** Não obrigatória
- **Commit associado:** —
- **Dependências:** Nenhuma

**Objetivo**
Revisar diretórios planejados ainda não materializados como workspaces reais.

---

## BE-TECH-03 — Limpeza de placeholders e estruturas provisórias

- **Status:** PLANNED
- **Prioridade:** Baixa
- **Responsável atual:** —
- **Auditoria necessária:** Não obrigatória
- **Commit associado:** —
- **Dependências:** Nenhuma

**Objetivo**
Reduzir ruído estrutural do projeto, removendo placeholders e estruturas provisórias desnecessárias.

---

# Itens já concluídos antes desta reorganização

Esses itens foram tratados e aprovados anteriormente, permanecendo fora da fila ativa atual:

- saneamento do fluxo documental e regra de `artifactPath`
- integridade de assinaturas no banco e na aplicação para documentos simples

Eles não devem ser reabertos sem motivo técnico real.

---

# Ordem recomendada de execução

1. `BE-SEC-01`
2. `BE-SEC-02`

3. `BE-QUAL-01`
4. `BE-QUAL-02`
5. `BE-QUAL-03`

6. `ALIGN-01`
7. `ALIGN-02`
8. `ALIGN-03`
9. `AUDIT-01`
10. `ALIGN-04`
11. `CESAD-READ-01`

12. `BE-OPS-01`
13. `BE-ARCH-01`

14. `BE-DOM-01`
15. `BE-DOM-02`
16. `BE-DOM-03`
17. `BE-DOM-04`

18. `BE-STR-01`

19. `BE-FLOW-10A`
20. `BE-FLOW-10B`
21. `BE-FLOW-10C`

22. `BE-TECH-01`
23. `BE-TECH-02`
24. `BE-TECH-03`

---

# Instrução padrão para prompts futuros

Sempre que um agente de IA for usado, o prompt deve seguir esta lógica:

- consultar `docs/backend-implementation-tracker.md`
- localizar o bloco/feature ativo
- localizar a task autorizada
- implementar somente aquela task
- não avançar para a próxima
- não mudar status sem autorização explícita
- devolver:
  - resumo técnico
  - arquivos alterados
  - diffs
  - validações executadas
  - observações e limitações

---

# Template operacional por task

Usar este template ao registrar evolução de uma task:

## `[TASK-ID] — [NOME DA TASK]`

- **Status:** PLANNED | ACTIVE | IMPLEMENTED | AUDITED | APPROVED | DONE | BLOCKED
- **Responsável atual:** —
- **Auditoria necessária:** Sim | Não
- **Commit associado:** —
- **Data da última atualização:** YYYY-MM-DD

### Resumo
—

### Arquivos alterados
- —

### Validações executadas
- —

### Observações
- —

---

# Encerramento

Este documento deve ser mantido atualizado durante toda a evolução do backend.

Ele é a fonte operacional de verdade para:

- ordem das implementações
- task ativa
- status real de execução
- relação entre implementação, auditoria e aprovação

Ao final do ciclo do backend, este tracker poderá ser arquivado ou movido para histórico.