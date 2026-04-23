# AEP-PA Backend Implementation Tracker

**Status:** Controle operacional das implementações do backend  
**Versão:** 1.6.0  
**Data:** 2026-04-23  
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
4. **Fluxo ponta a ponta operacional antes de refinamentos institucionais**
5. **Modelagem correta do domínio CESAD antes da assinatura colegiada**
6. **Hardening operacional e dívida técnica seguem importantes, mas não devem impedir evolução estrutural do domínio**
7. **Formalização documental e assinatura colegiada do parecer CESAD apenas depois da base institucional estabilizada**

Essa ordem reduz risco de regressão e evita construir regras institucionais sobre abstrações frágeis.

O projeto já saiu da fase de desalinhamentos críticos de fluxo e entrou em um momento em que as próximas grandes entregas dependem mais da **modelagem correta do domínio da Comissão CESAD** do que de pequenos ajustes isolados. Por isso, o roadmap passa agora a priorizar a **institucionalização explícita da comissão**.

---

# Estado atual

## Bloco/feature ativa
**BLOCO 4 — Institucionalização da Comissão CESAD**

## Task ativa
**CESAD-DOM-01D — Introduzir perfil Assistente da Comissão**

## Contexto atual
Após a conclusão do bloco de segurança, estabilização técnica, alinhamento frontend/backend, fechamento do fluxo operacional até a CESAD, alinhamento da leitura consolidada da etapa CESAD, criação da entidade institucional mínima da comissão, modelagem do ato normativo / portaria da Comissão CESAD e modelagem da composição formal da comissão, o próximo passo estrutural do projeto é introduzir formalmente o perfil de assistente da comissão.

A partir daqui, o sistema já reconhece a comissão como **entidade institucional própria** em sua fundação mínima, e deve avançar gradualmente para:

- identidade explícita
- ato normativo de constituição/alteração
- composição formal
- titulares e suplentes
- vigência
- base futura para signatários esperados do parecer
- previsão do papel de assistente da comissão

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
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** `fix(backend): harden workflow process access and block unsafe supervisor access`
- **Dependências:** Nenhuma

**Observações**
- workflow, history e transition passaram a exigir autorização contextual por processo
- `ADMIN` não possui bypass automático
- `IMMEDIATE_SUPERVISOR` foi bloqueado nos endpoints públicos do workflow por ausência de fonte autoritativa segura naquele contexto
- a resolução do vínculo legítimo da chefia foi tratada na task seguinte

---

## BE-SEC-02 — Corrigir autorização por vínculo na avaliação da chefia

- **Status:** DONE
- **Prioridade:** Crítica
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** `fix(backend): enforce supervisor stage binding in supervisor evaluations`
- **Dependências:** BE-SEC-01 recomendada antes

**Observações**
- a autorização da avaliação da chefia passou a usar `ProcessStage.responsibleSupervisorUserId`
- `ADMIN` não possui bypass automático
- leitura, draft, submit e retificação ficaram restritos à chefia responsável da etapa

---

# BLOCO 2 — Estabilização Técnica do Backend

Objetivo: garantir que o backend esteja testável e confiável para evolução.

---

## BE-QUAL-01 — Corrigir typecheck do backend

- **Status:** DONE
- **Prioridade:** Crítica
- **Responsável atual:** —
- **Auditoria necessária:** Não obrigatória
- **Commit associado:** `docs: atualiza checklist e registra be-qual-01 como saneada`
- **Dependências:** Nenhuma

**Observações**
- o typecheck do backend não apresenta mais falha reproduzível na árvore atual

---

## BE-QUAL-02 — Restabelecer execução da suíte de testes do backend

- **Status:** DONE
- **Prioridade:** Crítica
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** `docs: atualiza checklist e tracker para registrar be-qual-02 como saneada`
- **Dependências:** BE-QUAL-01 recomendada antes

**Observações**
- a suíte do backend não apresenta mais falha reproduzível na árvore atual

---

## BE-QUAL-03 — Alinhar a estratégia de testes do backend

- **Status:** DONE
- **Prioridade:** Crítica
- **Responsável atual:** —
- **Auditoria necessária:** Não obrigatória, mas recomendada
- **Commit associado:** `chore(backend): align test strategy and split app/spec typecheck`
- **Dependências:** BE-QUAL-01 e BE-QUAL-02

**Observações**
- o modelo híbrido de testes foi estabilizado
- warnings do Prisma permanecem como pendência técnica separada

---

# BLOCO 2A — Alinhamento Frontend/Backend

Objetivo: corrigir desalinhamentos reais de contrato entre frontend e backend que comprometiam fluxos de uso, autorização prática e leitura operacional do sistema.

---

## ALIGN-01 — Alinhar fluxo de assinatura do servidor estagiário entre frontend e backend

- **Status:** DONE
- **Prioridade:** Crítica
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** `fix(frontend): align intern signature flow with document signing endpoint`
- **Dependências:** saneamento do bloco crítico de backend concluído

**Observações**
- a assinatura do servidor passou a usar o endpoint documental correto
- a UI passou a decidir disponibilidade com base em `documentContext.internSignaturePending` e `workflow.status === AGUARDANDO_ASSINATURA`

---

## ALIGN-02 — Alinhar snapshot/tela da chefia com a política real de acesso do backend

- **Status:** DONE
- **Prioridade:** Crítica
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** `fix(processes): add supervisor workspace snapshot and stop using public workflow endpoints`
- **Dependências:** ALIGN-01 recomendada antes

**Observações**
- a workspace da chefia passou a usar endpoint seguro dedicado
- supervisor permaneceu bloqueado nos endpoints públicos
- as flags operacionais passaram a ser calculadas no backend

---

## ALIGN-03 — Alinhar matriz de permissões entre menu, guards e backend

- **Status:** DONE
- **Prioridade:** Alta
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** `fix(frontend): align operational navigation and guards with backend permissions`
- **Dependências:** ALIGN-01 e ALIGN-02 recomendadas antes

**Observações**
- menu e guards foram alinhados à matriz real do backend
- `ADMIN` deixou de aparecer como operador de áreas sem suporte backend
- `/processos` foi restringida aos perfis hoje compatíveis com a tela atual

---

## ALIGN-04 — Alinhar fluxo de autoavaliação do servidor e assinatura da autoavaliação pela chefia no frontend

- **Status:** DONE
- **Prioridade:** Crítica
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** `feat(frontend): add self-evaluation flow and supervisor signature in process workspaces`
- **Dependências:** ALIGN-01, ALIGN-02 e ALIGN-03 concluídas antes

**Observações**
- o frontend passou a expor o fluxo de autoavaliação do servidor
- a chefia passou a visualizar e assinar a autoavaliação pela interface
- o fluxo operacional ponta a ponta até a CESAD ficou fechado na UI
- houve um fix residual posterior para limpar marcadores de conflito de merge no frontend, sem mudança de regra de negócio

---

## AUDIT-01 — Separar histórico processual público de eventos documentais

- **Status:** DONE
- **Prioridade:** Alta
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** `fix(backend): filter public workflow history by semantic transition metadata`
- **Dependências:** ALIGN-01 a ALIGN-03 podiam ocorrer antes, mas não eram estritamente bloqueantes

**Observações**
- o histórico público passou a exigir correspondência semântica entre `eventType` e `metadata.action`
- eventos com `metadata.origin === 'PROCESS_DOCUMENT'` deixaram de entrar na timeline pública
- o audit trail interno permaneceu intacto

---

## CESAD-READ-01 — Alinhar leitura consolidada da CESAD aos eventos realmente persistidos

- **Status:** DONE
- **Prioridade:** Alta
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** `feat(cesad): align consolidated read with stage opinion events and functional snapshot`
- **Dependências:** ALIGN-04 recomendada antes

**Observações**
- a leitura consolidada passou a reconhecer a família `CESAD_STAGE_OPINION_*`
- o snapshot passou a expor `cesadStageOpinion`
- o parecer funcional da etapa passou a ser visível sem depender de documento formal futuro
- a semântica macro de `CESAD_OPINION_ISSUED` foi preservada e não foi misturada com `CESAD_STAGE_OPINION_COMPLETED`

---

# BLOCO 3 — Hardening Operacional e Dívida Técnica Imediata

Objetivo: reduzir riscos operacionais e débitos técnicos que continuam importantes, mas não são a frente principal neste momento.

---

## BE-OPS-01 — Remover credenciais previsíveis de desenvolvimento

- **Status:** PLANNED
- **Prioridade:** Média
- **Responsável atual:** —
- **Auditoria necessária:** Não obrigatória
- **Commit associado:** —
- **Dependências:** Nenhuma rígida

**Observações**
- permanece relevante
- deixou de ser a melhor próxima task diante da necessidade de modelagem estrutural da comissão

---

## BE-ARCH-01 — Revisar estratégia de autenticação web

- **Status:** PLANNED
- **Prioridade:** Média
- **Responsável atual:** —
- **Auditoria necessária:** Não nesta fase
- **Commit associado:** —
- **Dependências:** Nenhuma rígida

**Observações**
- ainda importante como análise arquitetural
- não é o principal bloqueio estrutural do momento

---

## BE-TECH-01 — Migrar a configuração depreciada do Prisma

- **Status:** PLANNED
- **Prioridade:** Baixa
- **Responsável atual:** —
- **Auditoria necessária:** Não obrigatória
- **Commit associado:** —
- **Dependências:** Nenhuma

**Observações**
- warnings continuam aparecendo nos testes
- permanece como dívida técnica de baixa prioridade
- `prisma migrate dev` permanece impedido por migration histórica anterior no shadow database SQLite: `20260415113000_increment_10b_cesad_stage_opinion_artifact`
- a falha decorre do uso de `ALTER TABLE ... ADD CONSTRAINT` nessa migration histórica; a migration da `CESAD-DOM-01A` para `CesadCommission` foi validada isoladamente e não é a causadora
- a `CESAD-DOM-01B` também validou sua nova migration por execução controlada, sem alterar o diagnóstico dessa dívida histórica
- essa dívida deve ser corrigida em task técnica futura específica para restaurar o fluxo local de migrations

---

## BE-TECH-02 — Revisar estrutura de workspaces (worker / cron)

- **Status:** PLANNED
- **Prioridade:** Baixa
- **Responsável atual:** —
- **Auditoria necessária:** Não obrigatória
- **Commit associado:** —
- **Dependências:** Nenhuma

---

## BE-TECH-03 — Limpeza de placeholders e estruturas provisórias

- **Status:** PLANNED
- **Prioridade:** Baixa
- **Responsável atual:** —
- **Auditoria necessária:** Não obrigatória
- **Commit associado:** —
- **Dependências:** Nenhuma

---

# BLOCO 4 — Institucionalização da Comissão CESAD

Objetivo: transformar a CESAD em entidade institucional explícita do sistema, deixando de tratá-la apenas como um conjunto de usuários com role `CESAD_MEMBER`.

Esse bloco deve criar a base correta para:

- governança da comissão
- ato normativo de constituição/alteração
- composição formal
- titulares e suplentes
- vigência
- papel do assistente da comissão
- signatários esperados do parecer em etapa posterior

---

## CESAD-DOM-01A — Modelar entidade Comissão CESAD

- **Status:** DONE
- **Prioridade:** Alta
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** `feat(cesad): add cesad commission domain foundation`
- **Dependências:** estabilização mínima do fluxo CESAD concluída

**Objetivo**
Introduzir a comissão CESAD como entidade própria do domínio.

**Escopo**
- entidade explícita de comissão
- identidade institucional da comissão
- status/vigência básica
- base para vínculo com ato normativo e composição

**Fora do escopo**
- signatários esperados
- assinatura colegiada
- formalização documental do parecer
- substituição por suplente
- deliberação colegiada

**Critério de conclusão**
- o sistema passa a reconhecer uma comissão CESAD explícita, separada da mera role de usuário

**Observações**
- a Comissão CESAD passou a existir como entidade institucional explícita com status e vigência básica
- a leitura administrativa básica foi adicionada em `GET /cesad/commissions` e `GET /cesad/commissions/:id`, restrita a `ADMIN`
- não houve antecipação de composição, portaria, assistente, signatários ou assinatura colegiada

---

## CESAD-DOM-01B — Modelar ato normativo / portaria da comissão

- **Status:** DONE
- **Prioridade:** Alta
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** `feat(cesad): add commission normative act domain foundation`
- **Dependências:** CESAD-DOM-01A

**Objetivo**
Registrar o instrumento formal que constitui, altera ou renova a comissão.

**Escopo**
- número
- ano
- tipo do ato
- data de publicação/assinatura
- vigência
- resumo/referência textual
- vínculo com a comissão

**Fora do escopo**
- geração automática de documento
- PDF
- publicação oficial
- integração externa

**Observações**
- o ato normativo passou a existir como entidade histórica própria
- a relação com a comissão foi modelada como `CesadCommission` 1:N `CesadCommissionAct`
- a leitura administrativa básica foi adicionada em `GET /cesad/commission-acts` e `GET /cesad/commission-acts/:id`, com filtro opcional por `commissionId`, restrita a `ADMIN`
- não houve ponteiro de ato vigente nem antecipação de composição, signatários ou uso operacional da comissão

---

## CESAD-DOM-01C — Modelar composição formal da comissão

- **Status:** DONE
- **Prioridade:** Alta
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** `feat(cesad): add formal commission membership domain model`
- **Dependências:** CESAD-DOM-01A e CESAD-DOM-01B recomendadas antes

**Objetivo**
Criar a composição formal da comissão, vinculando usuários à entidade institucional.

**Escopo**
- vínculo usuário-comissão
- tipo de composição
- titular / suplente
- vigência
- ativação/inativação
- referência ao ato normativo correspondente, quando aplicável

**Fora do escopo**
- substituição automática
- gestão avançada de impedimento
- assinatura efetiva do parecer

**Observações**
- a composição formal passou a existir como entidade histórica própria por meio de `CesadCommissionMember`
- `actId` ficou opcional para rastreabilidade e vínculo ao ato normativo quando aplicável
- a leitura administrativa básica foi adicionada em `GET /cesad/commission-members` e `GET /cesad/commission-members/:id`, com filtro opcional por `commissionId` e `roleType`, restrita a `ADMIN`
- não houve antecipação de assistente, signatários esperados, autorização funcional, assinatura colegiada ou regra rígida `3 titulares e 2 suplentes`
- a integridade temporal foi reforçada por SQL manual/trigger para bloquear sobreposição temporal indevida e rejeitar `endDate < startDate`
- o harness de testes reaproveita o bloco SQL da migration real para aplicar essas constraints extras no ambiente de teste

---

## CESAD-DOM-01D — Introduzir perfil Assistente da Comissão

- **Status:** PLANNED
- **Prioridade:** Média
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** —
- **Dependências:** CESAD-DOM-01A recomendada antes

**Objetivo**
Prever formalmente o papel administrativo-operacional da comissão.

**Pode**
- visualizar processos CESAD
- apoiar rotinas administrativas
- apoiar preparação de minutas/portarias, quando permitido

**Não pode**
- assinar parecer
- deliberar como membro
- homologar

---

## CESAD-DOM-01E — Expor leitura da comissão vigente e da composição vigente

- **Status:** PLANNED
- **Prioridade:** Alta
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** —
- **Dependências:** CESAD-DOM-01A, 01B e 01C

**Objetivo**
Disponibilizar leitura operacional da comissão vigente e de sua composição vigente.

**Escopo**
- consulta da comissão ativa
- consulta da composição ativa
- distinção entre titulares, suplentes e assistente
- base para futuras regras de signatários esperados

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
- **Dependências:** CESAD-DOM-01A a CESAD-DOM-01E recomendadas antes

**Objetivo**
Separar:
- quem integra a comissão
- de quem deve assinar um parecer específico

**Escopo**
- modelar signatários esperados do parecer CESAD
- derivar inicialmente signatários ordinários a partir da composição vigente
- manter explícita a separação entre signatário esperado e assinatura efetiva

**Fora do escopo**
- assinatura final do parecer
- PDF
- documento formal completo
- suplência operacional automática

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

---

## BE-FLOW-10B — Implementar assinatura do parecer CESAD

- **Status:** PLANNED
- **Prioridade:** Média
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** —
- **Dependências:** BE-FLOW-10A

---

## BE-FLOW-10C — Implementar substituição explícita por suplente

- **Status:** PLANNED
- **Prioridade:** Média
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** —
- **Dependências:** BE-FLOW-10B e modelagem mínima de suplência

---

# Itens já concluídos antes desta reorganização

Esses itens foram tratados e aprovados anteriormente e não devem ser reabertos sem necessidade técnica real:

- saneamento do fluxo documental e regra de `artifactPath`
- integridade de assinaturas no banco e na aplicação para documentos simples
- fechamento do fluxo ponta a ponta até a CESAD
- alinhamento da leitura consolidada da etapa CESAD ao fluxo funcional real

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
9. `ALIGN-04`
10. `AUDIT-01`
11. `CESAD-READ-01`

12. `CESAD-DOM-01A`
13. `CESAD-DOM-01B`
14. `CESAD-DOM-01C`
15. `CESAD-DOM-01D`
16. `CESAD-DOM-01E`

17. `BE-STR-01`

18. `BE-FLOW-10A`
19. `BE-FLOW-10B`
20. `BE-FLOW-10C`

21. `BE-OPS-01`
22. `BE-ARCH-01`
23. `BE-TECH-01`
24. `BE-TECH-02`
25. `BE-TECH-03`

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
