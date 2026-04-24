# AEP-PA Backend Implementation Tracker

**Status:** Controle operacional das implementações do backend  
**Versão:** 1.8.0  
**Data:** 2026-04-24  
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

# Relação com a documentação transversal do projeto

Este tracker **não substitui** o documento transversal de problemas do projeto.

## Fonte operacional do backend
- `docs/backend-implementation-tracker.md`

## Painel transversal do projeto
- `docs/problemas-atuais-do-projeto.md`

## Regra de convivência entre os documentos

- o **tracker** governa a **ordem do roadmap backend**, suas dependências e a task ativa autorizada;
- o arquivo **`problemas-atuais-do-projeto.md`** registra o panorama amplo do projeto, incluindo backend, frontend, infraestrutura, build, DX e lacunas gerais;
- itens do documento transversal **só entram no fluxo do tracker** quando forem convertidos em task backend explícita, com escopo e ordem definidos aqui.

Essa separação evita que o agente trate todo problema transversal como backlog backend imediatamente executável.

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
   - `docs/problemas-atuais-do-projeto.md`
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
6. **Identidade canônica das pessoas antes do congelamento documental de signatários**
7. **Problemas operacionais críticos do backend devem ser registrados sem desorganizar a trilha de domínio já em curso**
8. **Formalização documental e assinatura colegiada do parecer CESAD apenas depois da base institucional estabilizada**

Essa ordem reduz risco de regressão e evita construir regras institucionais ou documentais sobre abstrações frágeis.

---

# Estado atual

## Bloco/feature ativo
**BLOCO 3 — Hardening Operacional e Dívida Técnica Imediata**

## Task ativa
**BE-OPS-03 — Criar bootstrap determinístico do backend**

## Contexto atual
A `BE-STR-01` foi aprovada e consolidou a modelagem dos signatários esperados do parecer CESAD como snapshot persistido no nível do `CesadStageOpinion`.

Com isso, o bloqueio estrutural de domínio para congelamento dos signatários esperados foi removido. O snapshot passa a ser derivado da comissão vigente e da composição vigente no fluxo `ISSUE_CESAD_OPINION`, preservando `User.name` em `nameSnapshot` e mantendo o assistente fora da assinatura.

O foco ativo do roadmap backend volta para a estabilização operacional. A próxima task autorizada é o bootstrap determinístico do backend, considerando problemas já registrados como:
- instabilidade de `prisma generate` em ambiente Windows;
- bootstrap local dependente de preparo manual do banco;
- ausência de fluxo consolidado de build/start de produção;
- fragilidades nos pacotes compartilhados do monorepo.  

Esses itens permanecem no backlog backend explícito e agora orientam a prioridade operacional da `BE-OPS-03`.

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

Objetivo: reduzir riscos operacionais e débitos técnicos importantes do backend, sem quebrar a trilha principal de domínio já em curso.

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
- deixou de ser a melhor próxima task diante da necessidade de modelagem estrutural da comissão e identidade canônica do usuário

---

## BE-OPS-02 — Estabilizar `prisma generate` no ambiente Windows

- **Status:** PLANNED
- **Prioridade:** Alta
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** —
- **Dependências:** Nenhuma rígida

**Objetivo**
Remover a fragilidade operacional observada no fluxo de geração do Prisma Client em ambiente Windows.

**Escopo**
- diagnosticar e mitigar o `EPERM` ao renomear `query_engine-windows.dll.node`
- revisar interferência de processos `node` ativos durante generate
- separar, se necessário, o fluxo de generate do runtime dev
- documentar procedimento local reproduzível

**Fora do escopo**
- migração da configuração Prisma deprecada
- correção da migration histórica que bloqueia `prisma migrate dev`

**Observações**
- o problema foi validado no documento transversal do projeto
- esse item trata lock operacional do engine, não o problema histórico de migration

---

## BE-OPS-03 — Criar bootstrap determinístico do backend

- **Status:** ACTIVE
- **Prioridade:** Alta
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** —
- **Dependências:** Nenhuma rígida

**Objetivo**
Eliminar a dependência de preparo manual e implícito do banco para que o backend funcione localmente de forma previsível.

**Escopo**
- definir fluxo único de bootstrap local
- ordenar `generate`, sync/migrate e `seed`
- documentar sequência mínima funcional
- validar comportamento guiado quando o banco não estiver pronto

**Fora do escopo**
- CI/CD completo
- build de produção
- reestruturação global de scripts raiz

**Observações**
- o backend hoje depende de sincronização manual do banco e seed para funcionar de forma confiável
- esse item deve reduzir erros 500 de ambiente não preparado

---

## BE-OPS-04 — Definir build e start de produção do backend

- **Status:** PLANNED
- **Prioridade:** Média
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** —
- **Dependências:** BE-OPS-03 recomendada antes

**Objetivo**
Definir fluxo claro de build compilada e start de produção para o backend.

**Escopo**
- separar scripts de dev/test/prod
- substituir dependência principal em `ts-node` por build compilada no fluxo de produção
- validar boot do artefato compilado

**Fora do escopo**
- pipeline completa de deploy
- containerização obrigatória
- automações de infraestrutura

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

## BE-ARCH-02 — Fortalecer pacotes compartilhados do monorepo

- **Status:** PLANNED
- **Prioridade:** Média
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** —
- **Dependências:** Nenhuma rígida

**Objetivo**
Dar maturidade operacional aos pacotes compartilhados do monorepo, especialmente `contracts` e `config`.

**Escopo**
- revisar forma de build e consumo do `packages/contracts`
- reduzir acoplamento direto em `src`
- estruturar melhor o pacote `config`
- melhorar clareza de uso entre apps

**Fora do escopo**
- redesign completo da arquitetura do monorepo
- refactor transversal em todos os imports sem necessidade prática

---

## BE-TECH-01 — Migrar a configuração depreciada do Prisma

- **Status:** PLANNED
- **Prioridade:** Média
- **Responsável atual:** —
- **Auditoria necessária:** Não obrigatória
- **Commit associado:** —
- **Dependências:** Nenhuma

**Observações**
- warnings continuam aparecendo nos testes
- `prisma migrate dev` permanece impedido por migration histórica anterior no shadow database SQLite: `20260415113000_increment_10b_cesad_stage_opinion_artifact`
- a falha decorre do uso de `ALTER TABLE ... ADD CONSTRAINT` nessa migration histórica
- as migrations recentes do macrobloco CESAD foram validadas isoladamente e não são as causadoras
- essa task deve cobrir a migração de `package.json#prisma` para `prisma.config.ts`, sem confundir isso com o lock operacional do generate em Windows

---

## BE-TECH-02 — Revisar estrutura de workspaces (worker / cron)

- **Status:** PLANNED
- **Prioridade:** Baixa
- **Responsável atual:** —
- **Auditoria necessária:** Não obrigatória
- **Commit associado:** —
- **Dependências:** Nenhuma

**Observações**
- `worker` e `cron` existem na estrutura, mas ainda não entregam funcionalidade real
- revisar se entram como escopo concreto ou saem da promessa arquitetural imediata

---

## BE-TECH-03 — Limpeza de placeholders e estruturas provisórias do backend

- **Status:** PLANNED
- **Prioridade:** Baixa
- **Responsável atual:** —
- **Auditoria necessária:** Não obrigatória
- **Commit associado:** —
- **Dependências:** Nenhuma

---

# BLOCO 4 — Institucionalização da Comissão CESAD

Objetivo: transformar a CESAD em entidade institucional explícita do sistema, deixando de tratá-la apenas como um conjunto de usuários com role `CESAD_MEMBER`.

Esse bloco criou a base correta para:

- governança da comissão
- ato normativo de constituição/alteração
- composição formal
- titulares e suplentes
- vigência
- papel do assistente da comissão
- leitura vigente institucional

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
- a relação com a comissão foi modelada como 1:N
- a leitura administrativa básica foi adicionada e restrita a `ADMIN`
- não houve ponteiro de ato vigente nem antecipação de composição/signatários

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
- ativação/inativação derivada
- referência ao ato normativo correspondente, quando aplicável

**Fora do escopo**
- substituição automática
- gestão avançada de impedimento
- assinatura efetiva do parecer

**Observações**
- a composição formal passou a existir como entidade histórica própria
- `actId` ficou opcional para rastreabilidade
- a leitura administrativa básica foi adicionada e restrita a `ADMIN`
- não houve antecipação de assistente, signatários ou autorização funcional
- a integridade temporal foi reforçada por SQL manual/trigger
- o harness de testes reaproveita o bloco SQL da migration real

---

## CESAD-DOM-01D — Introduzir perfil Assistente da Comissão

- **Status:** DONE
- **Prioridade:** Média
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** `feat(rbac): add commission assistant read-only role for cesad workflows`
- **Dependências:** CESAD-DOM-01A recomendada antes

**Objetivo**
Prever formalmente o papel administrativo-operacional da comissão.

**Pode**
- visualizar processos CESAD
- apoiar rotinas administrativas
- apoiar leitura operacional da etapa
- apoiar preparação futura de minutas/portarias, quando permitido

**Não pode**
- assinar parecer
- deliberar como membro
- homologar

**Observações**
- o assistente foi introduzido como role global
- não foi incluído em `CesadCommissionMember`
- ganhou apenas leitura operacional mínima no eixo CESAD
- permaneceu fora de deliberação, assinatura e homologação

---

## CESAD-DOM-01E — Expor leitura da comissão vigente e da composição vigente

- **Status:** DONE
- **Prioridade:** Alta
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** `feat(cesad): add current commission consolidated read`
- **Dependências:** CESAD-DOM-01A, 01B, 01C e 01D

**Objetivo**
Disponibilizar leitura operacional consolidada da comissão vigente e de sua composição vigente.

**Escopo**
- consulta da comissão vigente por `referenceDate`
- derivação da composição vigente pela janela temporal dos membros
- `relatedActs` como contexto documental
- `warnings` para anomalias não bloqueantes
- leitura read-only para `ADMIN`, `CESAD_MEMBER` e `COMMISSION_ASSISTANT`

**Fora do escopo**
- eleição automática de ato vigente
- signatários esperados
- assinatura colegiada
- persistência institucional do assistente

**Observações**
- a leitura consolidada da comissão vigente foi exposta em endpoint próprio
- a vigência passou a ser resolvida principalmente pela própria comissão
- a composição vigente passou a ser derivada pela janela temporal dos membros
- `relatedActs` entrou apenas como contexto documental
- `COMMISSION_ASSISTANT` pode ler, mas segue fora da composição formal

---

# BLOCO 5 — Ponte entre Identidade, Comissão e Parecer

Objetivo: preparar a camada de signatários esperados do parecer CESAD sobre uma base de identidade canônica e comissão vigente estável.

---

## BE-IDENT-01 — Introduzir nome canônico no User antes do snapshot de signatários

- **Status:** DONE
- **Prioridade:** Alta
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** `feat(identity): add canonical user name across auth and session flows`
- **Dependências:** CESAD-DOM-01E concluída antes

**Objetivo**
Introduzir um campo explícito, confiável e canônico de nome no `User`, para servir como fonte de verdade para exibição institucional e para futuro congelamento em `nameSnapshot` dos signatários esperados do parecer CESAD.

**Escopo**
- adicionar campo `name` ao `User`
- ajustar persistência/migration
- ajustar seed
- propagar nome por auth/login/me
- ajustar sessão/frontend
- substituir, quando couber, exibições sintéticas derivadas de email
- manter `displayName` legado apenas onde ele já existir como contrato de apresentação, trocando a fonte para `User.name`

**Fora do escopo**
- modelagem de signatários esperados
- assinatura colegiada
- documento formal do parecer
- nova fonte de nome dentro da comissão/composição
- duplicação de nome em `CesadCommissionMember`
- refactor amplo de nomenclatura de contratos só por estética

**Observações**
- `User` passou a ter `name` obrigatório e se consolidou como fonte canônica do nome institucional
- persistência, seed, `AuthenticatedUser`, login, JWT, `verifyToken`, `/auth/me`, sessão e frontend passaram a propagar `name`
- os principais usos de nome derivado de email foram substituídos, preservando `displayName` legado apenas onde isso reduziu risco
- `CesadCommissionMember` continuou sem duplicação de nome e a leitura da comissão vigente passou a expor `user.name`
- a validação da migration nova foi feita de forma controlada sobre esquema legado mínimo do `User`, sem bloquear a aprovação da task

---

## BE-STR-01 — Modelar signatários esperados do parecer CESAD

- **Status:** DONE
- **Prioridade:** Alta
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** `feat(cesad): add expected signers snapshot for stage opinions`
- **Dependências:** BE-IDENT-01 concluída antes

**Objetivo**
Separar:
- quem integra a comissão
- de quem deve assinar um parecer específico

**Escopo**
- modelar signatários esperados do parecer CESAD
- derivar inicialmente signatários ordinários a partir da composição vigente
- congelar snapshot no momento em que o parecer for colocado para assinatura
- manter explícita a separação entre signatário esperado e assinatura efetiva

**Fora do escopo**
- assinatura final do parecer
- PDF
- documento formal completo
- suplência operacional completa
- reformulação de `SignatureRecord` nesta etapa

**Observações**
- os signatários esperados passaram a existir como snapshot persistido no `CesadStageOpinion`, por meio de relação 1:N com `CesadStageOpinionExpectedSigner`
- o freeze ocorre no fluxo `ISSUE_CESAD_OPINION`
- a derivação usa a comissão vigente e inclui apenas membros titulares vigentes por padrão
- `User.name` passou a ser preservado em `nameSnapshot`, com `User.email` em `emailSnapshot`
- o assistente permanece fora da assinatura
- a substituição explícita por suplente ficou apenas preparada no modelo, por `EXPLICIT_SUBSTITUTION` e `substitutedCommissionMemberId`
- não houve implementação de afastamento formal, assinatura efetiva, PDF, documento formal completo `CESAD_OPINION` nem mudança em `SignatureRecord`

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
- institucionalização mínima da Comissão CESAD
- leitura consolidada da comissão vigente

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

17. `BE-IDENT-01`
18. `BE-STR-01`

19. `BE-FLOW-10A`
20. `BE-FLOW-10B`
21. `BE-FLOW-10C`

22. `BE-OPS-02`
23. `BE-OPS-03`
24. `BE-OPS-04`
25. `BE-OPS-01`
26. `BE-ARCH-01`
27. `BE-ARCH-02`
28. `BE-TECH-01`
29. `BE-TECH-02`
30. `BE-TECH-03`

---

# Instrução padrão para prompts futuros

Sempre que um agente de IA for usado, o prompt deve seguir esta lógica:

- consultar `docs/backend-implementation-tracker.md`
- consultar `docs/problemas-atuais-do-projeto.md`
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
- integração do roadmap backend com o painel transversal de problemas do projeto

Ao final do ciclo do backend, este tracker poderá ser arquivado ou movido para histórico.
