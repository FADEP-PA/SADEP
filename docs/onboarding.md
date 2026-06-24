# Guia para Novos Desenvolvedores — SADEP

Bem-vindo ao SADEP. Este documento cobre o que você precisa saber para começar a contribuir: o domínio do problema, a arquitetura, o fluxo do processo, o que já está pronto e como trabalhar no projeto.

Leia do começo ao fim na primeira vez. Depois use como referência.

---

## 1. O que é o SADEP

**SADEP** é o Sistema de Avaliação de Desempenho de Estágio Probatório do Estado do Pará.

Ele gerencia o rito administrativo formal pelo qual servidores públicos em estágio probatório são avaliados, com rastreabilidade jurídica completa.

**Ponto crítico:** o SADEP não é um CRUD. É um sistema orientado a estados, com workflow processual formal. Cada ação só pode ocorrer se o processo estiver no estado correto, e toda ação relevante é auditada.

---

## 2. Configuração local (faça isso primeiro)

O guia completo está em [`docs/setup/local-setup.md`](./setup/local-setup.md). Os comandos essenciais:

```powershell
# 1. Instalar dependências
npm install

# 2. Criar o .env do backend
Copy-Item apps\backend\.env.example apps\backend\.env
# Edite apps\backend\.env e defina JWT_SECRET, REFRESH_TOKEN_HMAC_SECRET e DEV_SEED_PASSWORD

# 3. Preparar o banco local (gera, migra, popula e verifica)
npm run backend:bootstrap

# 4. Subir o backend (terminal 1)
npm run backend:start:dev

# 5. Subir o frontend (terminal 2)
npm run frontend:start:dev
```

URLs locais:
- Frontend: `http://localhost:5000`
- Backend: `http://localhost:3000`
- Healthcheck: `http://localhost:3000/health`

Credenciais de desenvolvimento (senha = valor de `DEV_SEED_PASSWORD`):

| Perfil | E-mail |
|---|---|
| Admin | `admin@sadep.local` |
| Chefia | `supervisor@sadep.local` |
| CESAD | `cesad@sadep.local` |
| Assistente da Comissão | `assistant@sadep.local` |
| Autoridade Homologadora | `authority@sadep.local` |
| Servidor | `server@sadep.local` |

---

## 3. O domínio em 10 minutos

### O que o sistema gerencia

Servidores públicos do Estado do Pará em estágio probatório passam por um processo administrativo formal de avaliação. No **Caso 2** (ingresso após 31/07/2015) — que é o único caso coberto pelo MVP — o processo tem:

- **1 processo administrativo único** por servidor
- **4 etapas avaliativas** internas e obrigatórias
- Cada etapa possui ciclo documental próprio
- Ao final das 4 etapas, há um parecer conclusivo final da CESAD
- Depois do parecer final, o processo vai para homologação, notificação e ciência

### Os atores do processo

| Role | Quem é | O que faz |
|---|---|---|
| `INTERN_SERVER` | Servidor avaliado | Preenche autoavaliação, assina documentos, visualiza resultados |
| `IMMEDIATE_SUPERVISOR` | Chefia imediata | Preenche avaliação, assina documentos da etapa |
| `CESAD_MEMBER` | Membro da comissão CESAD | Elabora pareceres, assina documentos, analisa recursos |
| `COMMISSION_ASSISTANT` | Assistente administrativo da CESAD | Leitura e apoio, sem escrita de parecer nem transição de workflow |
| `HOMOLOGATION_AUTHORITY` | Autoridade homologadora | Decide sobre homologação, assina notificação |
| `ADMIN` | Administrador do sistema | Acesso administrativo amplo, executa transições controladas |

### O ciclo de cada etapa

Cada uma das 4 etapas percorre este ciclo:

```
1. Chefia preenche avaliação (SupervisorEvaluation: DRAFT → SUBMITTED)
2. Servidor assina a avaliação → processo vai para AGUARDANDO_ASSINATURA
3. Servidor preenche autoavaliação (SelfEvaluation: DRAFT → SUBMITTED)
4. Chefia assina a autoavaliação → processo vai para EM_ANALISE_CESAD
5. CESAD elabora parecer da etapa (CesadStageOpinion: DRAFT → COMPLETED)
6. Membros CESAD assinam o documento do parecer → documento fica SIGNED
7. CESAD emite o parecer (ISSUE_CESAD_OPINION) → processo vai para PARECER_EMITIDO
8. [Nas etapas 1–3] CESAD conclui a etapa (COMPLETE_CURRENT_STAGE) → processo volta para EM_AVALIACAO com a próxima etapa ativa
   [Na etapa 4] CESAD conclui a etapa → processo permanece em PARECER_EMITIDO, sem etapa ativa
```

### O ciclo do parecer conclusivo final (após a 4ª etapa)

```
9.  CESAD elabora parecer conclusivo final (CesadFinalOpinion: DRAFT → COMPLETED)
10. Membros CESAD assinam o documento final → documento fica SIGNED
11. CESAD envia à homologação (sendToHomologation) → processo registra sentToHomologationAt
12. [BE-HOMOLOG-01 — ainda não implementado]
    Autoridade homologadora decide → processo vai para HOMOLOGADO
13. Servidor é notificado → processo vai para NOTIFICADO
14. Servidor registra ciência → processo vai para CIENTE
15. Processo é encerrado → ENCERRADO
```

### O diagrama de estados macro

```
EM_AVALIACAO
    ↓ RELEASE_FOR_SERVER_SIGNATURE (chefia submete avaliação)
AGUARDANDO_ASSINATURA
    ↓ SEND_TO_CESAD (chefia envia após servidor assinar autoavaliação)
EM_ANALISE_CESAD
    ↓ ISSUE_CESAD_OPINION (CESAD emite parecer da etapa)
PARECER_EMITIDO
    ↓ COMPLETE_CURRENT_STAGE nas etapas 1, 2 e 3 → volta para EM_AVALIACAO
    ↓ COMPLETE_CURRENT_STAGE na etapa 4 → permanece PARECER_EMITIDO
    ↓ sendToHomologation (após parecer final assinado)
HOMOLOGADO → NOTIFICADO → CIENTE → ENCERRADO

(EM_ANALISE_CESAD pode voltar para EM_AVALIACAO via REQUEST_ADJUSTMENT)
```

### Regras jurídicas que nunca podem ser violadas

- Avaliação assinada é **imutável**; qualquer correção exige fluxo próprio de devolução/ajuste
- Parecer exige assinatura de **todos** os membros obrigatórios da CESAD antes de ser considerado emitido
- Homologação final só pode ocorrer **após** o parecer conclusivo final estar assinado
- Reavaliação por recurso não apaga histórico; apenas supera formalmente o ato contestado
- Toda ação crítica exige **auditoria** — sem auditoria, a implementação é inválida

---

## 4. A estrutura do código

### Monorepo (npm workspaces)

```
apps/
  backend/    — NestJS + Prisma + SQLite (dev) — porta 3000
  frontend/   — Next.js 15 App Router + TypeScript — porta 5000
  cron/       — Reservado, sem execução no MVP
  worker/     — Reservado, sem execução no MVP
packages/
  contracts/  — Tipos e enums TypeScript compartilhados (backend ↔ frontend)
```

### Backend (`apps/backend/src/`)

```
auth/                     — JWT, refresh token sessions, guards, logout
processes/                — Motor de workflow, processos, 4 etapas
  cesad-final-opinions/   — Parecer conclusivo final + envio à homologação
  supervisor-evaluations/ — Avaliações da chefia
  self-evaluations/       — Autoavaliações do servidor
  tests/                  — Testes de integração do domínio
cesad/                    — Comissões, membros, atos, autorizações contextuais
application/
  documents/              — Documentos processuais, SignatureRecord
common/                   — Filtros, guards, pipes, utils
infrastructure/
  database/               — PrismaService
config/                   — Validação de variáveis de ambiente
```

O arquivo mais importante para entender o workflow:
- [`apps/backend/src/processes/workflow-catalog.ts`](../apps/backend/src/processes/workflow-catalog.ts) — define as 5 transições possíveis

O schema do banco:
- [`apps/backend/prisma/schema.prisma`](../apps/backend/prisma/schema.prisma) — todas as entidades

### Frontend (`apps/frontend/src/`)

```
app/
  (authenticated)/        — Rotas protegidas (AuthGuard + AppShell)
    admin/
    cesad-comissao/
    chefia-imediata/
    homologacao-autoridade/
    processos/
    servidor-estagiario/
features/                 — Módulos de feature (auth, process, cesad, etc.)
shared/
  api/                    — http-client com retry automático de 401
  auth/                   — AuthProvider, AuthGuard, access token em memória
```

### Contratos compartilhados (`packages/contracts/`)

Exporta enums e tipos TypeScript usados tanto pelo backend quanto pelo frontend: `ProcessStatus`, `UserRole`, `AuditEventType`, etc. Sempre que ambos os lados precisam concordar num valor, ele vive aqui.

### Autenticação

- **Access token** (JWT): mantido em memória no frontend, nunca em `localStorage`
- **Refresh token** (opaco): enviado via cookie `HttpOnly`
- A cada request, o backend revalida o usuário no banco (usuário inativo ou role divergente → 401)
- Logout é server-side, revoga a sessão e limpa o cookie

---

## 5. As entidades de domínio principais

| Entidade | Papel |
|---|---|
| `EvaluationProcess` | Processo administrativo único — tem status macro + 4 stages |
| `ProcessStage` | Uma das 4 etapas — lifecycle por `startedAt`/`endedAt` |
| `SupervisorEvaluation` | Avaliação da chefia por etapa (DRAFT → SUBMITTED) |
| `SelfEvaluation` | Autoavaliação do servidor por etapa (DRAFT → SUBMITTED) |
| `CesadStageOpinion` | Parecer CESAD de etapa (DRAFT → COMPLETED) |
| `CesadFinalOpinion` | Parecer conclusivo final (DRAFT → COMPLETED → `sentToHomologationAt`) |
| `CesadCommission` | Comissão CESAD com vigência e membros |
| `CesadStageAssignment` | Vínculo persistido comissão–processo–etapa (criado no SEND_TO_CESAD) |
| `ProcessDocument` | Documento processual formal (DRAFT → READY_FOR_SIGNATURE → SIGNED) |
| `SignatureRecord` | Registro de assinatura individual (PENDING → COMPLETED) |
| `AuditEvent` | Trilha de auditoria imutável de todos os atos relevantes |
| `UserSession` | Sessão ativa com refresh token (HttpOnly cookie) |

### Lifecycle de etapa

```
futura:    startedAt = null,   endedAt = null
ativa:     startedAt != null,  endedAt = null    ← única ativa por vez
concluída: startedAt != null,  endedAt != null
```

Nunca há mais de uma etapa ativa simultaneamente. Etapas futuras não recebem documentos, avaliações ou pareceres.

---

## 6. O estado atual do desenvolvimento

### Backend — implementado

- Auth completo (login, JWT, refresh token sessions, logout, rotação, revogação)
- CRUD básico de processos + materialização das 4 etapas
- SupervisorEvaluation e SelfEvaluation (draft → submit → documentos → assinaturas)
- CESAD: comissões, membros, atos, autorização contextual por assignment
- CesadStageOpinion + assinaturas colegiadas de etapa
- ISSUE_CESAD_OPINION com guarda documental
- COMPLETE_CURRENT_STAGE (encerra etapa e ativa a próxima, ou mantém PARECER_EMITIDO na 4ª)
- CesadFinalOpinion (eligibility, draft, complete, consolidatedSnapshot)
- Assinaturas colegiadas do parecer final
- **sendToHomologation** — envio formal à homologação (commit `a0e5b2d`)

### Backend — próximas prioridades

| Task | Descrição |
|---|---|
| **`BE-HOMOLOG-01`** | Fluxo de homologação, notificação e ciência — próxima prioridade |
| `BE-AUDIT-AUTH-01` | Auditoria persistida de eventos de autenticação |
| `SEC-HARD-01` | Rate limit + CSRF + hardening HTTP |

### Frontend — o que existe

- Login + auth flow completo (JWT em memória + refresh cookie)
- AppShell, AuthGuard e menu RBAC por perfil
- Página `/processos` (entrada manual de ID)
- `CesadStageReadWorkspace` — lê o endpoint `/processes/:id/stages/:seq/consolidated-read` com dados reais
- Workspace de homologação (scaffold preparado, sem backend funcional ainda)
- Vários componentes: StageTimeline, ProcessHistory, SupervisorEvaluationWorkspace, InternWorkspace

### Frontend — scaffolds sem implementação

Os diretórios abaixo existem com apenas `.gitkeep` — não têm código funcional. Não implemente nada neles sem contrato backend correspondente:

`features/autoavaliacao/`, `features/avaliacoes/`, `features/cesad-comissao/`, `features/chefia-imediata/`, `features/documentos-oficiais/`, `features/notificacoes-ciencia/`, `features/servidor-estagiario/`, entre outros.

---

## 7. Como implementar uma nova feature

Antes de escrever código:

1. **Leia o roadmap** — [`docs/roadmaps/backend/active.md`](./roadmaps/backend/active.md) e [`docs/roadmaps/cross-cutting/active-problems.md`](./roadmaps/cross-cutting/active-problems.md)
2. **Entenda o impacto no workflow** — a transição já está no catálogo? Precisa de nova transição?
3. **Entenda o impacto documental** — há documento formal envolvido?
4. **Entenda o impacto em auditoria** — qual audit event será criado?

Ao implementar:

1. Implemente o domínio (entidade, status, service)
2. Adicione a transição no workflow-catalog se necessário
3. Implemente as guardas de completude
4. Adicione auditoria obrigatória
5. Implemente o endpoint (controller)
6. Escreva testes

### Validações obrigatórias antes de qualquer PR

```powershell
# Contratos
npm run build --workspace @sadep/contracts

# Backend
npm run prisma:generate --workspace @sadep/backend
npm run typecheck --workspace @sadep/backend
npm run typecheck:spec --workspace @sadep/backend
npm run test --workspace @sadep/backend

# Frontend
npm run frontend:check

# Git
git diff --check
```

Se qualquer uma dessas validações falhar, o código não está pronto.

---

## 8. Princípios que não podem ser violados

1. **Orientação a estados** — toda transição passa pelo `workflow-catalog.ts`, nunca por mutação direta de status
2. **Imutabilidade após assinatura** — documento assinado não pode ser editado; só substituído por fluxo formal
3. **Determinismo temporal** — timestamps do banco são a fonte da verdade; nunca use data do frontend
4. **Regras centralizadas no backend** — o frontend nunca decide elegibilidade, estados disponíveis ou bloqueios
5. **Auditoria obrigatória** — toda ação crítica gera `AuditEvent`; sem auditoria a implementação é inválida

---

## 9. Onde encontrar cada coisa

### Entender o domínio e o fluxo

| O que você quer entender | Onde ler |
|---|---|
| Fluxo das 4 etapas, recursos, homologação | [`docs/workflow/four-stage-flow-and-appeals.md`](./workflow/four-stage-flow-and-appeals.md) |
| Documentos do processo, ciclo documental | [`docs/domain/document-modeling-catalog.md`](./domain/document-modeling-catalog.md) |
| Instrumentos de avaliação (Anexos I–V) | [`docs/domain/evaluation-instruments.md`](./domain/evaluation-instruments.md) |
| Semântica dos eventos de auditoria | [`docs/domain/audit-event-semantics.md`](./domain/audit-event-semantics.md) |

### Decisões arquiteturais

| Decisão | Onde ler |
|---|---|
| Por que workflow próprio (sem BPM externa) | [`docs/architecture/adr/adr-001-workflow-engine-strategy.md`](./architecture/adr/adr-001-workflow-engine-strategy.md) |
| Estratégia de sessão (refresh token + cookie HttpOnly) | [`docs/architecture/adr/adr-002-session-refresh-revocation-strategy.md`](./architecture/adr/adr-002-session-refresh-revocation-strategy.md) |
| CesadStageAssignment (vínculo comissão–etapa) | [`docs/architecture/adr/adr-003-cesad-stage-assignment.md`](./architecture/adr/adr-003-cesad-stage-assignment.md) |
| Progressão das 4 etapas | [`docs/architecture/adr/adr-004-four-stage-progression.md`](./architecture/adr/adr-004-four-stage-progression.md) |
| Parecer conclusivo final (CesadFinalOpinion) | [`docs/architecture/adr/adr-005-final-cesad-opinion-modeling.md`](./architecture/adr/adr-005-final-cesad-opinion-modeling.md) |

### Estado atual do projeto

| O que você quer saber | Onde ler |
|---|---|
| O que está implementado no backend | [`docs/roadmaps/backend/active.md`](./roadmaps/backend/active.md) |
| Histórico do que foi implementado | [`docs/roadmaps/backend/resolved.md`](./roadmaps/backend/resolved.md) |
| O que está implementado no frontend | [`docs/roadmaps/frontend/active.md`](./roadmaps/frontend/active.md) |
| Problemas transversais ativos | [`docs/roadmaps/cross-cutting/active-problems.md`](./roadmaps/cross-cutting/active-problems.md) |

### Regras arquiteturais obrigatórias

| Recurso | Onde ler |
|---|---|
| Regras gerais (leia antes de qualquer implementação) | [`AGENTS.md`](../AGENTS.md) |
| Como usar a workflow-engine | [`docs/skills/workflow-engine-skill.md`](./skills/workflow-engine-skill.md) |
| Como modelar documentos processuais | [`docs/skills/process-document-skill.md`](./skills/process-document-skill.md) |

---

## 10. Perguntas frequentes de novos devs

**"Posso mudar diretamente o `status` do processo no banco?"**
Não. Toda mudança de status passa pela workflow-engine em `processes.service.ts`. Mudar diretamente viola as guardas e não registra auditoria.

**"Posso editar uma avaliação depois que o servidor assinou?"**
Não. Assinatura é imutável. Qualquer correção exige um fluxo formal de retorno/ajuste com trilha auditável.

**"O frontend pode checar se o usuário tem permissão para uma ação?"**
Pode mostrar/esconder botões, mas a decisão real de autorização sempre ocorre no backend. O frontend nunca é a última linha de defesa.

**"Posso criar um novo estado de processo para simplificar algo?"**
Evite. O `ProcessStatus` deve permanecer estável. Detalhes de estado interno (recurso, etapa, documento) ficam em entidades próprias.

**"Como sei se minha implementação está correta?"**
Rode as validações obrigatórias (seção 7). Se os typechecks e testes passam e `git diff --check` está limpo, o código está pronto para revisão.

**"O SQLite em dev é OK para testes reais?"**
Para desenvolvimento local e testes de integração, sim. Para produção/homologação, será trocado por PostgreSQL. Não commite `apps/backend/prisma/dev.db`.

---

## 11. Regra de ouro

Na dúvida sobre qualquer decisão de domínio, workflow ou documentação, a hierarquia é:

1. Regras jurídicas e processuais consolidadas
2. [`AGENTS.md`](../AGENTS.md)
3. Documentos normativos de domínio (`docs/domain/`, `docs/workflow/`)
4. ADRs (`docs/architecture/adr/`)
5. Roadmaps operacionais (`docs/roadmaps/`)
6. Setup e DX (`docs/setup/`)

Qualquer simplificação de interface ou conveniência de implementação cede a esses documentos.
