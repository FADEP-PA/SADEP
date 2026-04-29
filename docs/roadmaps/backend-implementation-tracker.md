# AEP-PA Backend Implementation Tracker

**Status:** Controle operacional das implementações do backend  
**Versão:** 1.8.3
**Data:** 2026-04-28
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
- `./backend-implementation-tracker.md`

## Painel transversal do projeto
- `./problemas-atuais-do-projeto.md`

## Regra de convivência entre os documentos

- o **tracker** governa a **ordem do roadmap backend**, suas dependências e a task ativa autorizada;
- o arquivo **`./problemas-atuais-do-projeto.md`** registra o panorama amplo do projeto, incluindo backend, frontend, infraestrutura, build, DX e lacunas gerais;
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
   - `docs/roadmaps/backend-implementation-tracker.md`
   - `docs/roadmaps/problemas-atuais-do-projeto.md`
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
**Nenhuma task ativa formal após a conclusão da BE-ARCH-01C sem confirmação humana**

## Próxima candidata recomendada
**BE-ARCH-01D — Alinhar frontend de sessão (retomável com escopo reduzido)**

A varredura arquitetural da `BE-ARCH-01` foi concluída, a `BE-ARCH-01A` foi fechada como decisão documental/aprovada, a `BE-ARCH-01B` foi implementada, auditada e aprovada com revalidação backend do usuário autenticado, e a `BE-ARCH-01C` foi implementada/aprovada com centralização dos contratos mínimos de auth/session em `packages/contracts`.

A varredura técnica geral de 2026-04-29 confirmou que a `BE-ARCH-01D` continua necessária. A pausa temporária por revalidação do ambiente frontend foi removida após a `FT-27/DX-01`: `npm install` foi executado na raiz, `npm ls next` passou com `next@15.5.15`, `frontend:check`, build e typecheck do frontend passaram usando `Next.js 15.5.15`, e não houve alteração em arquivos versionados. A `BE-ARCH-01D` pode ser retomada com escopo reduzido.

Escopo futuro reduzido da `BE-ARCH-01D`:

- bootstrap de sessão;
- consumo de `/auth/me`;
- tratamento idempotente de `401`;
- preservação de sessão em `403`;
- falhas não-401 não devem limpar sessão indevidamente;
- UX mínima de sessão expirada.

Fora do escopo da `BE-ARCH-01D`:

- backend;
- contracts;
- refresh token;
- cookies;
- revogação;
- logout server-side;
- CESAD;
- workflow;
- homologação;
- regras processuais.

Antes de implementar a `BE-ARCH-01D`, preservar essa revalidação como pré-condição atendida e não ampliar o escopo além de sessão.

## Contexto atual
A `BE-STR-01` foi aprovada e consolidou a modelagem dos signatários esperados do parecer CESAD como snapshot persistido no nível do `CesadStageOpinion`.

Com isso, o bloqueio estrutural de domínio para congelamento dos signatários esperados foi removido. O snapshot passa a ser derivado da comissão vigente e da composição vigente no fluxo `ISSUE_CESAD_OPINION`, preservando `User.name` em `nameSnapshot` e mantendo o assistente fora da assinatura.

O bootstrap determinístico local do backend foi aprovado na `BE-OPS-03`, consolidando `npm run backend:bootstrap` como fluxo oficial de preparo local com `prisma generate`, `db:prepare:local`, `db push --skip-generate`, seed e `db:check`.

A `BE-OPS-02` foi aprovada e mitigou a instabilidade operacional do `prisma generate` no Windows com uma guarda prévia que detecta processos `node.exe` relacionados ao backend, testes ou Prisma antes da tentativa de atualização do engine nativo.

A `BE-OPS-04` foi aprovada e consolidou o fluxo explícito de build e start de produção do backend. O backend passou a usar `npm run backend:build` para compilar `@aep-pa/contracts`, executar `prisma generate` e compilar a aplicação com `tsc -p tsconfig.app.json`; `npm run backend:start:prod` passou a executar o artefato compilado com Node, mantendo `start:dev` separado no fluxo de desenvolvimento.

A `BE-TECH-01` foi aprovada e removeu a configuração Prisma depreciada baseada em `package.json#prisma`, migrando o seed para `apps/backend/prisma.config.ts` sem alterar o fluxo funcional do backend. O bootstrap local oficial, o uso de `db push`, o guard operacional do Prisma no Windows, o seed endurecido com `DEV_SEED_PASSWORD` e a limitação histórica de `prisma migrate dev` permaneceram separados e preservados.

No eixo de alinhamento backend/frontend, ficou registrada como necessidade futura a exposição de um snapshot operacional mais rico e role-scoped para o servidor, reduzindo heurísticas hoje existentes no frontend. Para essa futura frente, já está fechada a seguinte regra de negócio sobre leitura do parecer CESAD pelo servidor:
- nas etapas **1, 2 e 3**, o servidor poderá visualizar o parecer CESAD após sua **conclusão** e **assinatura integral**;
- na etapa **4**, o servidor somente poderá visualizar o parecer CESAD após sua **conclusão**, **assinatura integral** e **notificação formal**.

A `BE-OPS-01` foi aprovada e concluiu o hardening operacional de credenciais previsíveis de desenvolvimento, sem reabrir o bootstrap local, a mitigação do `prisma generate` no Windows, o fluxo de build/start de produção, o domínio CESAD ou a estratégia ampla de autenticação web. Com a `BE-ARCH-01A` fechada como decisão documental/aprovada, a `BE-ARCH-01B` aprovada e a `BE-ARCH-01C` concluída/aprovada, a `BE-ARCH-01D` permanece necessária e retomável após a revalidação operacional do ambiente frontend pela `FT-27`, mantendo refresh token, cookies HttpOnly, revogação, rotação e logout server-side fora da próxima implementação da frente.

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

## ALIGN-05 — Expor snapshot operacional do servidor e flags de autoavaliação

- **Status:** DONE
- **Prioridade:** Alta
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** `feat(processes): add intern workspace snapshot and reduce frontend heuristics`
- **Dependências:** ALIGN-04 concluída antes; não depende de reabertura de CESAD, bootstrap ou produção

**Objetivo**
Reduzir heurísticas críticas do frontend expondo um snapshot operacional role-scoped para o servidor, com etapa atual, contextos documentais e flags operacionais derivadas no backend.

**Escopo**
- expor etapa atual do processo para o servidor
- expor autoavaliação com contexto documental em contrato compartilhado
- expor flags operacionais como:
  - `canEditSelfEvaluation`
  - `canSubmitSelfEvaluation`
  - `canSignSupervisorEvaluation`
  - `canSignSelfEvaluation`
- preferir endpoint específico de workspace do servidor, em vez de inflar o workflow público genérico
- reduzir inferências locais hoje existentes no `intern-server-workspace` e no agregador transversal de processos

**Fora do escopo**
- migrations
- Prisma config
- reabertura da `BE-STR-01`
- redesign do domínio CESAD
- homologação completa
- placeholders de administração/homologação sem backend específico
- CI/CD
- Docker

**Observações**
- foi criado o endpoint role-scoped `GET /processes/:id/intern-workspace`
- o servidor passou a ter snapshot operacional próprio com etapa atual, contexto documental, autoavaliação, avaliação da chefia, `capabilities` e `cesadOpinionAccess`
- as flags principais de autoavaliação e assinatura passaram a ser derivadas no backend
- `canSubmitSelfEvaluation` representa permissão de regra de negócio para tentar submissão; a validação de conteúdo obrigatório permanece no frontend e no endpoint de submissão
- a regra de leitura do parecer CESAD pelo servidor foi implementada por etapa, dependendo de `ProcessDocument` formal do tipo `CESAD_OPINION` assinado integralmente
- o frontend do servidor deixou de depender das heurísticas críticas mais relevantes, incluindo montagem manual de snapshot por múltiplas chamadas, dedução de etapa por macrostatus, wrappers baseados em `403` e dedução local das principais permissões operacionais
- a leitura consolidada CESAD, os signatários esperados do parecer e as flags centrais da avaliação da chefia já estão maduras e não devem ser reabertas
- regra já fechada para leitura do parecer CESAD pelo servidor:
  - etapas **1, 2 e 3**: leitura após **conclusão** e **assinatura integral**
  - etapa **4**: leitura apenas após **conclusão**, **assinatura integral** e **notificação formal**
- a `ALIGN-05` foi concluída sem alterar a task ativa do bloco operacional

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

- **Status:** DONE
- **Prioridade:** Média
- **Responsável atual:** —
- **Auditoria necessária:** Não obrigatória
- **Commit associado:** `chore(backend): remove predictable development credentials`
- **Dependências:** Nenhuma rígida

**Observações**
- senhas hardcoded dos usuários seed foram removidas
- usuários, e-mails e roles seed foram preservados para testes locais
- o seed passou a exigir `DEV_SEED_PASSWORD` e todos os usuários seed locais usam essa senha
- o seed passou a bloquear execução em `NODE_ENV=production`
- `JWT_SECRET` passou a ser obrigatório, com mínimo de 32 caracteres
- o fallback fraco de `JWT_SECRET` foi removido
- `.env.example` e documentação local foram atualizados para orientar `JWT_SECRET` e `DEV_SEED_PASSWORD`
- testes foram ajustados para segredos de 32+ caracteres
- validações principais passaram: `typecheck`, `typecheck:spec`, suíte backend, build e `backend:bootstrap` com variáveis configuradas
- validações negativas passaram: ausência de `DEV_SEED_PASSWORD`, ausência de `JWT_SECRET`, `JWT_SECRET` curto e seed em produção
- `git grep` confirmou ausência das credenciais antigas versionadas e dos segredos antigos de teste

---

## BE-OPS-02 — Estabilizar `prisma generate` no ambiente Windows

- **Status:** DONE
- **Prioridade:** Alta
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** `chore(backend): guard prisma generate on windows`
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
- foi adicionada guarda operacional antes de `prisma generate` no Windows
- o generate agora falha cedo com orientação útil quando há lock provável por processo `node.exe` relacionado ao backend, testes ou Prisma
- `backend:bootstrap` permaneceu como fluxo oficial e continua chamando `prisma generate`
- o guard lista PIDs e command lines relevantes, mas não mata processos automaticamente e não remove arquivos `.tmp`
- a validação incluiu cenário normal de `prisma:generate`, `backend:bootstrap`, validação negativa com processo Node relacionado, typecheck e suíte de testes do backend
- o typecheck padrão do backend não cobre automaticamente scripts operacionais; a validação do guard ficou apoiada no fluxo real e na simulação negativa guiada

---

## BE-OPS-03 — Criar bootstrap determinístico do backend

- **Status:** DONE
- **Prioridade:** Alta
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** `chore(backend): add deterministic local bootstrap workflow`
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
- o backend passou a ter fluxo oficial de bootstrap local via `npm run backend:bootstrap`
- o fluxo local encadeia `prisma generate`, `db:prepare:local`, `prisma db push --schema prisma/schema.prisma --skip-generate`, `prisma:seed` e `db:check`
- o preflight `db:check` valida acesso à tabela `User` e presença mínima do seed, orientando a execução do bootstrap quando o banco não está pronto
- a documentação local passou a orientar `db push` como fluxo local oficial compatível com o estado atual do repositório
- `db:prepare:local` foi introduzido como compatibilidade cirúrgica para SQLite local legado; não substitui a correção futura das migrations históricas e não deve ser tratado como modelo geral de evolução de schema

---

## BE-OPS-04 — Definir build e start de produção do backend

- **Status:** DONE
- **Prioridade:** Média
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** `chore(backend): add compiled production build and start flow`
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

**Observações**
- o backend passou a ter fluxo explícito de build e start de produção via `npm run backend:build` e `npm run backend:start:prod`
- produção passou a executar Node sobre o artefato compilado, enquanto `start:dev` permaneceu separado e baseado em `ts-node`
- o build do backend compila `@aep-pa/contracts`, executa `prisma generate` e compila a aplicação com `tsc -p tsconfig.app.json`
- houve ajuste mínimo em `@aep-pa/contracts` para viabilizar runtime compilado: build CommonJS em `dist/` e `exports.require` apontando para `dist/index.js`
- `main` e `types` de `@aep-pa/contracts` permaneceram apontando para `src/index.ts`; refinamento mais amplo do pacote compartilhado pode permanecer associado a `BE-ARCH-02`

---

## BE-ARCH-01 — Revisar estratégia de autenticação web

- **Status:** PLANNED
- **Prioridade:** Média
- **Responsável atual:** —
- **Auditoria necessária:** Não nesta fase
- **Commit associado:** —
- **Dependências:** Nenhuma rígida

**Diagnóstico da varredura**
- a autenticação atual usa bearer JWT stateless
- o JWT expira em `1h`
- não há refresh token
- não há revogação
- o logout atual é apenas limpeza local no frontend
- o token fica persistido no frontend em `localStorage` ou `sessionStorage`
- `/auth/me` hoje ecoa o payload do token válido, sem leitura viva do banco
- o backend não revalida usuário existente, `isActive` e role atual a cada request autenticada
- a estratégia atual é aceitável apenas temporariamente para desenvolvimento local e não é suficiente para homologação/produção institucional

**Decisão incremental fechada na `BE-ARCH-01A`**
- a sessão web do AEP-PA continuará, nesta etapa, baseada em bearer JWT
- o token continuará sendo enviado pelo frontend no header `Authorization: Bearer`
- a expiração atual de `1h` permanece por enquanto
- o token não deve ser tratado como fonte suficiente da verdade sobre o usuário
- o backend deve evoluir para revalidar, em cada request autenticada, se o usuário ainda existe, está ativo e mantém role válida
- o endpoint `/auth/me` deve deixar de ser mero eco do payload do token e passar a refletir o estado atual do usuário persistido
- se o usuário for removido, desativado ou ficar inconsistente, a sessão deve falhar com `401`
- mudanças de role exigem cautela; para a primeira implementação segura, divergência relevante entre token e banco deve invalidar a sessão com `401`, salvo se o código existente indicar estratégia mais segura
- o frontend continuará apenas reagindo a `401`, limpando a sessão local por enquanto
- refresh token, revogação, rotação, cookies HttpOnly e logout server-side ficam fora do escopo imediato
- a auditoria de eventos de autenticação continua obrigatória antes de homologação/produção, mas será tratada em subtask própria
- a estratégia atual permanece aceitável apenas para desenvolvimento local/MVP assistido e não é suficiente para homologação/produção institucional

**Próxima ação recomendada**
- retomar `BE-ARCH-01D — Alinhar frontend de sessão` com escopo reduzido, pois o ambiente frontend foi revalidado pela `FT-27/DX-01`
- a `BE-ARCH-01D` deve ter escopo reduzido a bootstrap de sessão, `/auth/me`, tratamento idempotente de `401`, preservação de `403`, falhas não-401 sem limpeza indevida de sessão, invalidadores e UX mínima de sessão expirada
- o foco imediato da `BE-ARCH-01D` deve ser alinhar a sessão do frontend sem reabrir backend, contracts, CESAD, workflow, homologação, regras processuais, refresh token, cookies, revogação ou logout server-side
- `BE-ARCH-01E` e `BE-ARCH-01F` permanecem posteriores e não devem ser marcadas como concluídas nesta etapa

**Subtasks planejadas**
- [x] **BE-ARCH-01A — Fechar semântica de sessão web**
  - Decisão documental/aprovada: manter bearer JWT temporariamente com expiração de `1h`, evoluir `/auth/me` para leitura viva do usuário atual, exigir revalidação backend de usuário existente/ativo/role válida, invalidar sessão com `401` quando o usuário estiver inexistente/inativo/inconsistente e manter refresh token, cookies HttpOnly, revogação, rotação e logout server-side fora desta etapa.

- [x] **BE-ARCH-01B — Revalidar usuário atual no backend**
  - **Status:** APPROVED
  - **Commit associado:** `feat(auth): revalidate authenticated users`
  - A `AuthService` passou a resolver o usuário vivo a partir do payload JWT, consultando o banco por `sub` e validando existência, `isActive` e role persistida válida.
  - O `JwtAuthGuard` passou a validar o JWT e, em seguida, revalidar o usuário atual no banco antes de injetar `request.user`.
  - Usuário inexistente, inativo ou com divergência relevante de role entre token e banco passou a invalidar a sessão com `401`.
  - O endpoint `/auth/me` deixou de ser mero eco do payload e passou a refletir o estado persistido atual do usuário autenticado.
  - `request.user` permaneceu restrito ao contrato compatível `sub`, `email`, `name` e `role`, sem expor campos internos.
  - Houve cobertura unitária e integrada para `AuthService`, `/auth/me` e `/auth/admin-check`, com inclusão explícita de `auth.service.spec.ts` na suíte Jest.
  - Validações executadas/aprovadas: `npm run typecheck --workspace @aep-pa/backend`, `npm run typecheck:spec --workspace @aep-pa/backend`, `npm run test --workspace @aep-pa/backend`, `npm run backend:build` e `npm run db:check --workspace @aep-pa/backend`.
  - Observação operacional: o `backend:build` exigiu nova tentativa após a liberação esperada do guard do Windows enquanto um processo Node de testes ainda encerrava.
  - Observação de teste: logs `401` e `403` durante a suíte integrada eram esperados, pois os testes exercitam fluxos negativos e terminaram com sucesso.
  - Fora do escopo preservado: refresh token, cookies HttpOnly, revogação, logout server-side, rotação, alteração de storage frontend, alteração em `packages/contracts`, alteração em seed, alteração em roles existentes, autorização CESAD, workflow, Prisma schema e migrations.

- [x] **BE-ARCH-01C — Compartilhar contratos de auth/session**
  - **Status:** APPROVED
  - **Commit associado:** `chore(auth): share auth session contracts`
  - Foi criado `packages/contracts/src/types/auth.ts`, consolidando os contratos compartilhados mínimos `AuthenticatedUserRef`, `LoginRequest` e `LoginResponse`.
  - Os novos contratos passaram a ser exportados em `packages/contracts/src/types/index.ts`, preservando o barrel root do pacote sem refactor estrutural amplo.
  - O backend passou a reaproveitar `AuthenticatedUserRef` via alias local `AuthenticatedUser`, preservando compatibilidade com os imports já existentes no app.
  - `AuthService.login()` passou a ser tipado com `LoginResponse`, sem alterar o shape real de `POST /auth/login`.
  - O controller de login passou a usar `LoginRequest` apenas como referência de shape para a validação manual já existente, preservando o comportamento atual de erro.
  - O frontend passou a reaproveitar `AuthenticatedUserRef` e `LoginResponse` por meio de `apps/frontend/src/shared/auth/auth-types.ts`.
  - `AuthSession` e `rememberMe` permaneceram locais no frontend, e `LoginInput` continuou local como composição de `LoginRequest` com `rememberMe`.
  - `JwtPayload` permaneceu local no backend, sem alteração do payload JWT real.
  - `GET /auth/me` manteve o shape real atual, retornando diretamente o contrato compatível do usuário autenticado.
  - A duplicação básica de contratos de auth/session entre backend e frontend foi mitigada sem alteração de comportamento funcional.
  - Validações executadas/aprovadas: `npm run build --workspace @aep-pa/contracts`, `node -e "require('@aep-pa/contracts')"`, `npm run typecheck --workspace @aep-pa/backend`, `npm run typecheck:spec --workspace @aep-pa/backend`, `npm run test --workspace @aep-pa/backend`, `npm run backend:build`, `npm run typecheck --workspace @aep-pa/frontend` e `npm run build --workspace @aep-pa/frontend`.
  - Fora do escopo preservado: `SessionReadResponse`, `expiresAt`, refresh token, cookies HttpOnly, revogação, logout server-side, auditoria, alteração de storage frontend, alteração de UI, refactor amplo de `packages/contracts`, `BE-ARCH-02`, CESAD, workflow, Prisma e migrations.

- [ ] **BE-ARCH-01D — Alinhar frontend de sessão**
  - Status operacional: retomável com escopo reduzido após revalidação do ambiente frontend pela `FT-27/DX-01`.
  - Evidência de revalidação: `npm install` executado na raiz; `npm ls next` passou com `next@15.5.15`; `frontend:check`, build e typecheck do frontend passaram usando `Next.js 15.5.15`; não houve alteração em arquivos versionados.
  - Escopo futuro reduzido: bootstrap de sessão, `/auth/me`, tratamento idempotente de `401`, preservação de `403`, falhas não-401 sem limpeza indevida de sessão, invalidadores e UX mínima de sessão expirada.
  - Fora do escopo: backend, contracts, refresh token, cookies, revogação, logout server-side, CESAD, workflow, homologação e regras processuais.
  - Antes da implementação: manter a frente restrita a sessão e não reabrir decisões já estabilizadas por `BE-ARCH-01A`, `BE-ARCH-01B`, `BE-ARCH-01C` e `FT-27/DX-01`.

- [ ] **BE-ARCH-01E — Definir estratégia de produção para refresh/revogação**
  - Avaliar refresh token, revogação, logout server-side, rotação e cookies HttpOnly para homologação/produção.

- [ ] **BE-ARCH-01F — Auditar e testar eventos de autenticação**
  - Definir e cobrir eventos como login bem-sucedido, login falho, logout, refresh, revogação, alteração de role e desativação.

**Fora do escopo da primeira implementação**
- refresh token
- cookies HttpOnly
- revogação
- logout server-side
- rotação
- troca de storage no frontend
- redesign amplo de permissões
- correção do gap CESAD por processo dentro da mesma task

---

## BE-SEC-03 — Fortalecer autorização contextual CESAD por processo

- **Status:** PLANNED
- **Prioridade:** Alta
- **Responsável atual:** —
- **Auditoria necessária:** Sim
- **Commit associado:** —
- **Dependências:** Nenhuma rígida

**Objetivo**
Revisar endpoints CESAD sensíveis para exigir vínculo contextual real da comissão ou do assistente com o processo e a etapa, em vez de aceitar apenas role global combinada com status do processo.

**Observações**
- achado crítico separado da `BE-ARCH-01`
- trata-se de problema de autorização por processo, não de estratégia de sessão
- revisar especialmente leitura consolidada CESAD e parecer CESAD por etapa
- severidade alta/crítica antes de homologação/produção

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

- **Status:** DONE
- **Prioridade:** Média
- **Responsável atual:** —
- **Auditoria necessária:** Não obrigatória
- **Commit associado:** `chore(backend): migrate prisma config`
- **Dependências:** Nenhuma

**Observações**
- `apps/backend/prisma.config.ts` foi criado
- o seed foi migrado do antigo `package.json#prisma` para `prisma.config.ts`
- o bloco `package.json#prisma` foi removido de `apps/backend/package.json`
- os scripts atuais do backend foram preservados
- `npm run backend:bootstrap` continua sendo o fluxo oficial local
- `prisma db push --schema prisma/schema.prisma --skip-generate` continua sendo o fluxo local oficial nesta etapa
- `DEV_SEED_PASSWORD` continua obrigatório para o seed local
- o guard operacional do Prisma no Windows foi preservado
- `dotenv` foi declarado explicitamente no workspace backend
- a documentação operacional foi atualizada em `README.md`, `apps/backend/README.md` e `docs/setup/local-setup.md`
- o warning de `package.json#prisma` deixou de aparecer em `npm run prisma:generate --workspace @aep-pa/backend`
- validações passaram: `npm run prisma:generate --workspace @aep-pa/backend`, `npm run backend:bootstrap` com `DEV_SEED_PASSWORD` configurado, `npm run db:check --workspace @aep-pa/backend`, `npm run typecheck --workspace @aep-pa/backend`, `npm run typecheck:spec --workspace @aep-pa/backend`, `npm run test --workspace @aep-pa/backend`, `npm run backend:build` e `node -e "require.resolve('prisma/config')"`
- validações negativas/limitações preservadas: `npm run backend:bootstrap` falhou corretamente sem `DEV_SEED_PASSWORD`; `npm run backend:build` foi inicialmente bloqueado pelo guard do Windows enquanto um processo de teste ainda encerrava; `npm run prisma:migrate:dev --workspace @aep-pa/backend` continuou falhando por limitação histórica conhecida de SQLite/shadow database na migration `20260415113000_increment_10b_cesad_stage_opinion_artifact`
- `prisma migrate dev` permanece impedido por migration histórica anterior no shadow database SQLite: `20260415113000_increment_10b_cesad_stage_opinion_artifact`
- a falha decorre do uso de `ALTER TABLE ... ADD CONSTRAINT` nessa migration histórica
- as migrations recentes do macrobloco CESAD foram validadas isoladamente e não são as causadoras
- não houve alteração em `schema.prisma`
- não houve alteração em migrations históricas
- não houve correção da limitação de `prisma:migrate:dev`
- não houve alteração em workflow, CESAD, autenticação, permissões, contratos ou frontend

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
12. `ALIGN-05`

13. `CESAD-DOM-01A`
14. `CESAD-DOM-01B`
15. `CESAD-DOM-01C`
16. `CESAD-DOM-01D`
17. `CESAD-DOM-01E`

18. `BE-IDENT-01`
19. `BE-STR-01`

20. `BE-FLOW-10A`
21. `BE-FLOW-10B`
22. `BE-FLOW-10C`

23. `BE-OPS-02`
24. `BE-OPS-03`
25. `BE-OPS-04`
26. `BE-OPS-01`
27. `BE-ARCH-01A`
28. `BE-ARCH-01B`
29. `BE-ARCH-01C`
30. `BE-ARCH-01D`
31. `BE-ARCH-01E`
32. `BE-ARCH-01F`
33. `BE-SEC-03`
34. `BE-ARCH-02`
35. `BE-TECH-01`
36. `BE-TECH-02`
37. `BE-TECH-03`

---

# Instrução padrão para prompts futuros

Sempre que um agente de IA for usado, o prompt deve seguir esta lógica:

- consultar `docs/roadmaps/backend-implementation-tracker.md`
- consultar `docs/roadmaps/problemas-atuais-do-projeto.md`
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
