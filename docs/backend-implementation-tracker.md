# AEP-PA Backend Implementation Tracker

**Status:** Controle operacional das implementações do backend  
**Versão:** 1.3.0  
**Data:** 2026-04-17  
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

1. **Segurança primeiro**
2. **Backend testável antes de novas features**
3. **Hardening operacional antes de expansão maior**
4. **Base institucional da CESAD antes da assinatura colegiada**
5. **Evolução documental e de assinatura do parecer CESAD depois da base de domínio**

Essa ordem reduz risco de regressão e evita construir novas regras sobre uma base insegura ou inconsistente.

---

# Estado atual

## Bloco/feature ativa
**BLOCO 1 — Segurança e Autorização**

## Task ativa
**BE-SEC-02 — Corrigir autorização por vínculo na avaliação da chefia**

## Contexto atual
Antes de retomar os incrementos funcionais da CESAD e da formalização documental, o backend precisa estabilizar:

- autorização por vínculo de processo;
- segurança da avaliação da chefia;
- typecheck e testes executáveis;
- rastreabilidade operacional mínima;
- coerência entre tracker e checklist de correções.

---

# Tracker de Tasks

---

# BLOCO 1 — Segurança e Autorização

Objetivo: eliminar vulnerabilidades de autorização por vínculo de processo.

Essas tasks devem ser executadas antes de qualquer nova evolução funcional.

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
- a fonte autoritativa de vínculo da chefia ainda não existe no módulo de processos
- a resolução completa do vínculo legítimo da chefia permanece pendente para a continuidade do roadmap

---

## BE-SEC-02 — Corrigir autorização por vínculo na avaliação da chefia

- **Status:** ACTIVE
- **Prioridade:** Crítica
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** —
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

---

# BLOCO 2 — Estabilização Técnica do Backend

Objetivo: garantir que o backend esteja testável e confiável para evolução.

---

## BE-QUAL-01 — Corrigir typecheck do backend

- **Status:** PLANNED
- **Prioridade:** Crítica
- **Responsável atual:** —
- **Auditoria necessária:** Não obrigatória, salvo mudança ampla
- **Commit associado:** —
- **Dependências:** Nenhuma

**Problema**  
O typecheck do backend falha por inconsistência de dependências e configuração de testes.

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

---

## BE-QUAL-02 — Restabelecer execução da suíte de testes do backend

- **Status:** PLANNED
- **Prioridade:** Crítica
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** —
- **Dependências:** BE-QUAL-01 recomendada antes

**Problema**  
A suíte do backend falha por incompatibilidade entre fixtures/testes e o schema Prisma atual.

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

---

## BE-QUAL-03 — Alinhar a estratégia de testes do backend

- **Status:** PLANNED
- **Prioridade:** Crítica
- **Responsável atual:** —
- **Auditoria necessária:** Não obrigatória, mas recomendada
- **Commit associado:** —
- **Dependências:** BE-QUAL-01 e BE-QUAL-02

**Problema**  
O backend está com estratégia híbrida e pouco clara entre runner customizado e Jest, o que confunde manutenção e cobertura.

**Arquivos principais**
- `apps/backend/package.json`
- `apps/backend/src/processes/tests/run.ts`
- `apps/backend/src/**/*.spec.ts`

**Escopo**
- definir runner oficial
- definir papel do Jest
- alinhar scripts e documentação mínima
- reduzir ambiguidade da estratégia de testes

**Fora do escopo**
- refatoração massiva de todas as specs
- aumento amplo de cobertura

**Critério de conclusão**
- estratégia oficial documentada e refletida em scripts
- equipe consegue saber qual comando deve ser usado como referência

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
- **Dependências:** Nenhuma

**Problema**
Credenciais e segredos previsíveis de desenvolvimento estão versionados e documentados.

**Arquivos principais**
- `apps/backend/prisma/seed.ts`
- `apps/backend/.env.example`
- `docs/local-setup.md`

**Escopo**
- remover segredos previsíveis
- usar placeholders seguros
- ajustar documentação para uso local seguro

**Fora do escopo**
- política completa de segredos para produção
- rotação real de credenciais em ambiente externo

**Critério de conclusão**
- nenhum segredo previsível relevante permanece como padrão recomendado

---

## BE-ARCH-01 — Revisar estratégia de autenticação web

- **Status:** PLANNED
- **Prioridade:** Média
- **Responsável atual:** —
- **Auditoria necessária:** Não nesta fase
- **Commit associado:** —
- **Dependências:** Nenhuma

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
- **Dependências:** estabilização mínima do backend recomendada antes

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

6. `BE-OPS-01`
7. `BE-ARCH-01`

8. `BE-DOM-01`
9. `BE-DOM-02`
10. `BE-DOM-03`
11. `BE-DOM-04`

12. `BE-STR-01`

13. `BE-FLOW-10A`
14. `BE-FLOW-10B`
15. `BE-FLOW-10C`

16. `BE-TECH-01`
17. `BE-TECH-02`
18. `BE-TECH-03`

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
