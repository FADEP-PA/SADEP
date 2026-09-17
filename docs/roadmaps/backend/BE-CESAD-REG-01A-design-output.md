# BE-CESAD-REG-01A — Entregável de design: contratos, payloads e eventos

**Dev:** Lucas
**Data:** 2026-06-30
**Status:** Concluído — pronto para handoff a Pedro (01B/01C) e Edgar (01D/01F)
**Task de origem:** [`BE-CESAD-REG-01A`](./tasks/BE-CESAD-REG-01A-domain-contracts-events.md)
**ADR:** [ADR-006](../../architecture/adr/adr-006-cesad-commission-management-and-rollover.md)

Este documento é o resultado da varredura técnica exigida pela `BE-CESAD-REG-01A`. Nenhum código funcional foi alterado. Ele define o estado atual real, os contratos, eventos, erros, o plano de testes por fatia e — principalmente — os achados que mudam o desenho assumido pela ADR-006.

---

## 1. Sumário executivo (leia primeiro)

A base CESAD está mais madura do que a ADR-006 assume. O domínio já tem `CesadCommission`, `CesadCommissionAct`, `CesadCommissionMember`, `CesadStageAssignment` e o ciclo de expected signers/assinatura, tudo persistido e auditado por etapa. O que falta é exatamente a camada administrativa de mutação (criar, editar, encerrar, superseder, rollover).

Três achados alteram o plano original:

1. **Auditoria administrativa não cabe no `AuditEvent` atual.** `AuditEvent.evaluationProcessId` é obrigatório (não-nulo, `onDelete: Restrict`). Os eventos `CESAD_COMMISSION_CREATED/UPDATED/CLOSED/SUPERSEDED/ACT_REGISTERED/MEMBER_ADDED` **não pertencem a um processo**. Será preciso uma trilha própria — há precedente claro: `AuthAuditEvent`. **Isso exige migration e, portanto, complementa a ADR-006**, que dizia "sem schema". Ver seção 6 e 10.

2. **O rollover (01E) já tem um irmão entregue e auditado: `BE-CESAD-ASSIGN-REPLACE-01`.** Existe `POST /processes/:id/stages/:sequence/cesad-stage-assignment/supersede` (action `SUPERSEDE_CESAD_STAGE_ASSIGNMENT`). Ele cobre o caso "trocar comissão **antes** de qualquer parecer/signer/documento". O 01E começa exatamente onde aquele bloqueia: parecer em draft, documento `READY_FOR_SIGNATURE` e documento parcialmente assinado. A fronteira precisa ser explícita para não duplicar nem regredir o que está auditado. Ver seção 11.

3. **Os contracts atuais são todos read-only (`*Ref`).** Não existe nenhum DTO/payload de escrita CESAD nos contracts compartilhados. Todos os DTOs de mutação são novos. Ver seções 4 e 5.

**Recomendação de dono do service de vigência:** Pedro (01B). Justificativa na seção 9.

---

## 2. Estado atual do schema (o que já existe)

Arquivo: `apps/backend/prisma/schema.prisma`.

### 2.1 `CesadCommission` (linhas 412-429)

```
id, name, description?, status (CesadCommissionStatus @default(ACTIVE)),
effectiveStartDate (DateTime), effectiveEndDate (DateTime?),
createdAt, updatedAt
@@index([status]) @@index([effectiveStartDate])
```

- `status` enum: `ACTIVE | INACTIVE | SUPERSEDED`.
- **Não há** constraint de não-sobreposição de vigência no banco — isso é responsabilidade de service/transação (coerente com a ADR).
- Relações: `acts`, `members`, `stageAssignments`, `stageOpinionExpectedSigners`, `finalOpinionExpectedSigners`.

### 2.2 `CesadCommissionAct` (linhas 431-451)

```
id, commissionId, actType (CONSTITUTION|AMENDMENT|RENEWAL),
number (String), year (Int),
signedAt?, publishedAt?, validityStartDate?, validityEndDate?,
summary?, referenceText?, createdAt, updatedAt
```

- **Diferença vs. payload da ADR/01B:** o ato no banco tem `validityStartDate`/`validityEndDate` próprios (vigência do ato), campos que o payload previsto em 01B **não** inclui. Decisão necessária em 01B: ou aceitar esses campos no payload, ou deixá-los nulos no MVP. Recomendo expor opcionalmente (não bloquear).

### 2.3 `CesadCommissionMember` (linhas 453-476)

```
id, commissionId, userId, actId?,
roleType (TITULAR|SUPLENTE), startDate (DateTime), endDate (DateTime?),
createdAt, updatedAt
```

- `actId` opcional liga o membro ao ato que o nomeou.
- **Não há** unique `(commissionId, userId)` — a regra "usuário não duplicado na composição" é de service.
- **Não há** flag de "ativo" no member; atividade do membro é derivada de `startDate`/`endDate` + `user.isActive`.

### 2.4 `CesadStageAssignment` (linhas 544-573)

```
id, processId, processStageId, commissionId,
status (ACTIVE|SUPERSEDED|CANCELED @default(ACTIVE)),
assignedAt, assignedByUserId?, assignmentReason?, referenceDate,
supersededAt?, supersededByAssignmentId?, supersededReason?,
createdAt, updatedAt
@@index([processStageId, status]) + outros
```

- Autorrelação de supersessão já existe (`supersededByAssignment` / `supersededAssignments`).
- A unicidade "1 assignment ACTIVE por etapa" é garantida em service (não há unique parcial). Confirmado em `ensureActiveCesadStageAssignment`.

### 2.5 Enums de auditoria já existentes (`AuditEventType`, linhas 41-71)

Relacionados a CESAD hoje: `SENT_TO_CESAD`, `CESAD_STAGE_OPINION_STARTED/DRAFT_SAVED/COMPLETED`, `CESAD_STAGE_ASSIGNMENT_SUPERSEDED`, `CESAD_OPINION_STARTED/ISSUED/SIGNED`, `CESAD_FINAL_OPINION_*`. **Nenhum** evento administrativo de comissão (`CESAD_COMMISSION_*`) existe ainda.

### 2.6 `DocumentStatus` (linhas 83-89) e `ProcessDocument` (296-316)

`DRAFT | CONSOLIDATED | READY_FOR_SIGNATURE | SIGNED | INVALIDATED_OR_SUPERSEDED`.

- `ProcessDocument` já tem `opinionKind` (`STAGE | FINAL_CONCLUSIVE`) e unique `(evaluationProcessId, processStageId, documentType)`.
- O estado `INVALIDATED_OR_SUPERSEDED` **existe no enum mas hoje só é lido defensivamente** (`process-documents.service.ts:1253, 1348, 1374`) — nenhum fluxo atual **escreve** esse status. Isso é exatamente o gancho que o 01E vai precisar acionar pela primeira vez. Ver seção 11.

---

## 3. Estado atual dos services/controllers (o que já roda)

| Componente | Arquivo | Papel hoje |
|---|---|---|
| `CesadCommissionsService` | `src/cesad/cesad-commissions.service.ts` | **Read-only**: `listCommissions`, `getCommissionById` |
| `CesadCommissionsController` | `src/cesad/cesad-commissions.controller.ts` | `GET /cesad/commissions`, `GET /cesad/commissions/:id` — **somente ADMIN** |
| `CesadCurrentCommissionService` | `src/cesad/cesad-current-commission.service.ts` | Resolve comissão vigente por data + warnings |
| `CesadCommissionActsService` | `src/cesad/cesad-commission-acts.service.ts` | Read-only de atos |
| `CesadCommissionMembersService` | `src/cesad/cesad-commission-members.service.ts` | Read-only de membros |
| `CesadContextAuthorizationService` | `src/cesad/authorization/cesad-context-authorization.service.ts` | Autorização contextual por assignment ativa |
| `ensureActiveCesadStageAssignment` | `src/processes/processes.service.ts:868` | Cria/reusa assignment no `SEND_TO_CESAD` |
| `supersede...` (ASSIGN-REPLACE) | `src/processes/processes.service.ts:220-415` | Reatribuição manual pré-parecer |
| Derivação de signers | `src/processes/stage-closure-guard.service.ts:150-238` | Congela titulares da comissão atribuída |

### 3.1 Como `CesadCurrentCommissionService` resolve a vigente (confirmado)

`getCurrentCommission(referenceDate?)` busca `cesadCommission.findMany` com:
- `status = ACTIVE`
- `effectiveStartDate <= referenceDate`
- `effectiveEndDate = null OR >= referenceDate`

Se **0** → `NotFoundException`. Se **>1** → `ConflictException`. Membros filtrados pela mesma janela temporal + `user.isActive`. Há `warnings[]` (sem titular ativo, membro inativo, múltiplos atos relevantes, membro fora da janela). **Esta é a query canônica de vigência** que 01B/01C/01D devem reutilizar, não reescrever.

### 3.2 Como `SEND_TO_CESAD` cria a assignment (confirmado)

`ensureActiveCesadStageAssignment` (`processes.service.ts:868`):
1. Busca assignments `ACTIVE` da etapa. Se >1 → conflito. Se 1 → reusa.
2. Se 0 → busca comissões `ACTIVE` vigentes em `assignedAt` (mesma query da 3.1). **0 → BadRequest; >1 → Conflict** (não infere silenciosamente — coerente com ADR-003/006).
3. Cria assignment `ACTIVE` com `referenceDate = assignedAt`.

### 3.3 Como expected signers são derivados (confirmado)

`ensureCompletedCesadStageOpinionAndFreezeExpectedSignersForStage` (`stage-closure-guard.service.ts:150`):
- Exige opinion `COMPLETED`; idempotente se já há signers.
- Lê a comissão **da assignment ativa** (não a vigente do dia).
- Seleciona membros `TITULAR`, na janela de `frozenAt`, com `user.role != COMMISSION_ASSISTANT` e `user.isActive`.
- `createMany` com snapshots (`nameSnapshot`, `emailSnapshot`, `roleTypeSnapshot`), `derivationType = ACTIVE_TITULAR`, `frozenAt`.

> Implicação para 01E: ao fazer rollover, recriar signers significa **congelar a partir da nova assignment**, espelhando exatamente esta função. Reaproveitar a lógica, não duplicar a regra de seleção de titular.

---

## 4. Contratos existentes a reutilizar

Todos em `packages/contracts/src/`. São **read-only** (`*Ref`, datas como `string` ISO):

| Contrato | Arquivo | Reuso |
|---|---|---|
| `CesadCommissionRef` | `types/cesad-commission.ts` | Resposta de create/update/list/close |
| `CesadCommissionActRef` | `types/cesad-commission-act.ts` | Ato dentro das respostas |
| `CesadCommissionMemberRef` | `types/cesad-commission-member.ts` | Membro nas respostas |
| `CesadCurrentCommissionReadRef` | `types/cesad-current-commission.ts` | Leitura enriquecida (base p/ leitura administrativa) |
| Enums | `enums/cesad-commission-status.ts`, `cesad-commission-act-type.ts`, `cesad-commission-member-role-type.ts` | Reuso direto |
| `UserRole` | `enums/user-role.ts` | Guards |

**Convenção confirmada:** entidade de domínio (`Date`) em `src/domain/cesad-commissions/*.entity.ts` → mapper `toRef` no service → contrato `*Ref` (`string`). Toda fatia nova segue esse triplo.

---

## 5. Contratos e DTOs novos (a criar)

> Nenhum existe hoje. DTOs de validação ficam em `apps/backend/src/cesad/dto/` (pasta nova; convenção igual a `processes/dto/*.dto.ts` com `class-validator`). Os tipos de **resposta** compartilhados vão em `packages/contracts/src/types/`.

### 5.1 Create (01B) — `CreateCesadCommissionDto`

Alinhado ao payload da 01B, com ajuste para os campos de ato já existentes no schema:

```ts
{
  commission: {
    name: string;                      // obrigatório, não vazio
    description?: string | null;
    effectiveStartDate: string;        // ISO
    effectiveEndDate?: string | null;  // ISO
  };
  act: {
    actType: 'CONSTITUTION' | 'AMENDMENT' | 'RENEWAL';
    number: string;
    year: number;
    signedAt?: string | null;
    publishedAt?: string | null;
    validityStartDate?: string | null; // existe no schema — expor opcional
    validityEndDate?: string | null;   // existe no schema — expor opcional
    summary?: string | null;
    referenceText?: string | null;
  };
  members: Array<{
    userId: string;
    roleType: 'TITULAR' | 'SUPLENTE';
    startDate: string;                 // ISO, dentro da vigência da comissão
    endDate?: string | null;
  }>;
}
```

### 5.2 Update (01C) — `UpdateCesadCommissionDto`

Mesma forma do create, porém **todos os blocos opcionais** (PATCH parcial). Validação central: bloquear se a comissão tem `CesadStageAssignment`. Recomendo `PATCH /cesad/commissions/:id` (não `PUT`), porque a edição é parcial e a substituição total reabriria a discussão de composição inteira.

### 5.3 Close / Supersede (01D)

```ts
// POST /cesad/commissions/:id/close
{ effectiveEndDate: string; reason: string; }

// POST /cesad/commissions/:id/supersede
{ successorCommissionId: string; reason: string; }
```

### 5.4 Resposta enriquecida (todas as fatias) — `CesadCommissionDetailRef`

Novo tipo de resposta de mutação/leitura administrativa, reusando os refs existentes:

```ts
interface CesadCommissionDetailRef {
  commission: CesadCommissionRef;
  acts: CesadCommissionActRef[];
  members: CesadCommissionMemberRef[];
  isUsedInProcess: boolean;   // existe CesadStageAssignment? (governa edição em 01C)
  temporalSituation: 'FUTURE' | 'CURRENT' | 'CLOSED' | 'SUPERSEDED' | 'INACTIVE';
}
```

> `temporalSituation` deriva de datas + status (tabela da ADR-006), **não** é coluna nova. Centralizar esse cálculo num helper compartilhado evita divergência entre as fatias.

### 5.5 Index de contracts

Adicionar os novos tipos de resposta a `packages/contracts/src/types/index.ts`. DTOs de request com `class-validator` **não** vão para contracts (são server-side), seguindo o padrão de `processes/dto`.

---

## 6. Eventos de auditoria — ACHADO BLOQUEANTE

### 6.1 O problema

`AuditEvent` (schema linha 278-294):

```
evaluationProcessId String          // OBRIGATÓRIO
evaluationProcess   EvaluationProcess @relation(... onDelete: Restrict)
```

Os 6 eventos administrativos da ADR-006 **não têm processo**:
`CESAD_COMMISSION_CREATED`, `CESAD_COMMISSION_UPDATED`, `CESAD_COMMISSION_CLOSED`, `CESAD_COMMISSION_SUPERSEDED`, `CESAD_COMMISSION_ACT_REGISTERED`, `CESAD_COMMISSION_MEMBER_ADDED`.

Não há `evaluationProcessId` para anexá-los. Forçar um processo "fake" violaria a semântica descrita em `docs/domain/audit-event-semantics.md`.

Apenas `CESAD_COMMISSION_ROLLOVER_APPLIED` (01E) **é** process-bound e cabe no `AuditEvent` atual.

### 6.2 Decisão de design recomendada

Criar uma trilha de auditoria administrativa própria, **espelhando o precedente já existente `AuthAuditEvent`** (schema linha 214-230), que também não é process-bound:

```prisma
model CesadCommissionAuditEvent {
  id            String   @id @default(cuid())
  eventType     CesadCommissionAuditEventType
  commissionId  String?
  actId         String?
  actorUserId   String?
  actorRole     UserRole?
  beforeState   Json?
  afterState    Json?
  metadata      Json?
  occurredAt    DateTime @default(now())
  // relações opcionais com onDelete: SetNull
  @@index([eventType, occurredAt])
  @@index([commissionId])
  @@index([actorUserId])
}

enum CesadCommissionAuditEventType {
  CESAD_COMMISSION_CREATED
  CESAD_COMMISSION_UPDATED
  CESAD_COMMISSION_CLOSED
  CESAD_COMMISSION_SUPERSEDED
  CESAD_COMMISSION_ACT_REGISTERED
  CESAD_COMMISSION_MEMBER_ADDED
}
```

- `CESAD_COMMISSION_ROLLOVER_APPLIED` permanece em `AuditEvent` (é process-bound) e deve ser **adicionado ao enum `AuditEventType`** existente, com mapeamento em `process-type-mappers.ts:48` (`toDatabaseAuditEventType`).
- Metadados mínimos por evento: executor (`actorUserId`), papel (`actorRole`), `occurredAt`, comissão, ato/membros afetados, vigência anterior/nova, motivo, e — quando aplicável — `isUsedInProcess`. (ADR-006 seção Auditoria.)

### 6.3 Consequência de processo

Isto **introduz schema/migration**, que a ADR-006 declarou fora de escopo. É um complemento necessário. Ver seção 10 (complemento à ADR) e seção 8 (em qual fatia cai a migration).

---

## 7. Erros padronizados (catálogo)

Seguindo o padrão NestJS já usado nos services CESAD (`BadRequestException`, `ConflictException`, `ForbiddenException`, `NotFoundException`):

| Situação | Exceção | Mensagem-base |
|---|---|---|
| Vigência sobreposta | `ConflictException` | "A vigência informada conflita com outra comissão CESAD já cadastrada; ajuste o período." |
| Composição < 3 titulares ou < 2 suplentes | `BadRequestException` | "A comissão exige no mínimo 3 titulares e 2 suplentes." |
| `COMMISSION_ASSISTANT` como membro | `BadRequestException` | "COMMISSION_ASSISTANT não pode integrar a composição formal da comissão." |
| Usuário duplicado na composição | `BadRequestException` | "Usuário não pode aparecer duas vezes na composição vigente." |
| Membro fora da vigência da comissão | `BadRequestException` | "A vigência do membro deve estar dentro da vigência da comissão." |
| Usuário inexistente/inativo | `BadRequestException` | "Membro deve ser usuário existente e ativo." |
| Edição de comissão já usada | `ConflictException` | "Comissão já utilizada em processo não admite alteração estrutural." |
| Comissão não encontrada | `NotFoundException` | "CESAD commission not found." (já existente) |
| Encerramento retroativo sobre ato consolidado | `ConflictException` | "Encerramento retroativo bloqueado: afeta ato consolidado." |
| Perfil não autorizado | `ForbiddenException` | "Apenas ADMIN e HOMOLOGATION_AUTHORITY podem administrar comissões." |

> Recomendo centralizar essas mensagens/factory num único arquivo (`cesad-commission-errors.ts`) para 01B–01E reusarem — evita divergência de texto entre fatias.

---

## 8. Plano de implementação por fatia

### 8.1 Ordem de migrations (importante)

A migration da trilha de auditoria administrativa (seção 6.2) é pré-requisito de 01B (que já precisa auditar criação). **Recomendo uma fatia de schema enxuta no início de 01B** (ou uma micro-fatia `01A-bis` se o time preferir isolar): adiciona `CesadCommissionAuditEvent` + enum, e adiciona `CESAD_COMMISSION_ROLLOVER_APPLIED` a `AuditEventType`. Sem isso, 01B não consegue cumprir seu próprio critério de auditoria.

### 8.2 01B — Criar (Pedro)

- Migration de auditoria administrativa (8.1).
- Helper compartilhado de vigência (`resolveOverlap`, `closePreviousOpenEndedAtDMinus1`) — **dono: Pedro** (seção 9).
- Endpoint `POST /cesad/commissions`, guard `ADMIN + HOMOLOGATION_AUTHORITY`.
- Transação: comissão + ato + membros + evento `CESAD_COMMISSION_CREATED`/`_ACT_REGISTERED`/`_MEMBER_ADDED`.
- Reusar query de vigência da seção 3.1.

### 8.3 01C — Editar (Pedro)

- `PATCH /cesad/commissions/:id`.
- Guard de uso: `count(CesadStageAssignment where commissionId)` > 0 → bloquear estrutural.
- Reusar helper de vigência de Pedro.
- Evento `CESAD_COMMISSION_UPDATED` com before/after.

### 8.4 01D — Encerrar/Superseder (Edgar)

- `POST /cesad/commissions/:id/close` e `/supersede`.
- **Consome** o helper de vigência de Pedro (não reimplementa D-1).
- Preservar assignments; bloquear encerramento retroativo sobre ato consolidado (definição de "consolidado": doc `SIGNED` + todas assinaturas `COMPLETED`, conforme ADR-006).
- Eventos `CESAD_COMMISSION_CLOSED` / `_SUPERSEDED`.

### 8.5 01E — Rollover (Lucas) — ver seção 11 para fronteira

- `POST /processes/:id/stages/:sequence/cesad-stage-assignment/rollover` (nome distinto de `supersede`).
- Primeiro fluxo do projeto a **escrever** `DocumentStatus.INVALIDATED_OR_SUPERSEDED`.
- Recriar signers espelhando `stage-closure-guard` (seção 3.3).
- Evento `CESAD_COMMISSION_ROLLOVER_APPLIED` em `AuditEvent` (process-bound).

### 8.6 01F — Seed (Edgar) — ver seção 12

---

## 9. Dono do service de vigência: **Pedro (01B)**

A regra de vigência (não-sobreposição + encerramento D-1 da anterior sem data fim) é **escrita pela primeira vez no momento da criação** (01B). 01D (encerrar/superseder) também a toca, mas sempre **depois** que a criação já a estabeleceu.

**Decisão:** Pedro cria um `CesadCommissionValidityService` (ou helper em `src/cesad/`) com no mínimo:
- `assertNoOverlap(effectiveStartDate, effectiveEndDate, exceptCommissionId?)`
- `closePreviousOpenEndedAtDMinus1(newStartDate, tx)`
- `resolveTemporalSituation(commission, referenceDate)`

Edgar (01D) **consome** esse service. Nenhuma das duas fatias reescreve a regra. Isso resolve o ponto de coordenação crítico antes do primeiro commit da Fase 2.

---

## 10. Complemento à ADR-006 (a ADR é suficiente?)

**Quase.** A ADR-006 é suficiente em regra de negócio (vigência, composição, rollover, atos consolidados vs. preparatórios). Mas declara explicitamente "não há alteração de schema/migrations", e a varredura mostra que **isso não se sustenta**: a auditoria administrativa exige tabela/enum novos (seção 6).

**Recomendação:** registrar um adendo curto na ADR-006 (ou ADR-007) reconhecendo que:
1. A auditoria administrativa CESAD usa trilha própria (`CesadCommissionAuditEvent`), não o `AuditEvent` process-bound.
2. `CESAD_COMMISSION_ROLLOVER_APPLIED` é a única exceção process-bound.
3. A primeira escrita de `INVALIDATED_OR_SUPERSEDED` nasce em 01E.

Sem esse adendo, 01B nasce em contradição formal com a ADR que a originou.

---

## 11. Fronteira com `BE-CESAD-ASSIGN-REPLACE-01` (risco de colisão — 01E)

`BE-CESAD-ASSIGN-REPLACE-01` (concluída/auditada) entregou `POST /processes/:id/stages/:sequence/cesad-stage-assignment/supersede`. Ele **bloqueia** a troca quando já existe:
- `CesadStageOpinion` da etapa, ou
- `CesadStageOpinionExpectedSigner` da etapa, ou
- `ProcessDocument.CESAD_OPINION` da etapa.

Ou seja, ele cobre apenas o caso "antes de qualquer artefato". Confirmado em `processes.service.ts:300-334`.

**O 01E começa exatamente onde aquele para.** Tabela de divisão de responsabilidade:

| Estado da etapa | Responsável | Mecanismo |
|---|---|---|
| Sem parecer, sem signer, sem doc | **ASSIGN-REPLACE-01 (já existe)** | `supersede` manual |
| Parecer em `DRAFT` | **01E** | rollover: descartar/referenciar draft + nova assignment + novos signers |
| Documento `READY_FOR_SIGNATURE` | **01E** | rollover: `INVALIDATED_OR_SUPERSEDED` + nova assignment |
| Documento parcialmente assinado | **01E** | rollover: impedir assinaturas pendentes + referência histórica |
| Documento `SIGNED` (todas assinaturas) | **ninguém** | imutável — bloquear rollover |

**Diretrizes para 01E não colidir:**
- Usar **nome de ação distinto** (`rollover`, não `supersede`) e endpoint distinto.
- **Não** alterar o comportamento já auditado de `SUPERSEDE_CESAD_STAGE_ASSIGNMENT`.
- A motivação também difere: `supersede` é troca administrativa explícita (informa `newCommissionId`); o rollover é consequência de **perda de vigência temporal** e resolve a nova comissão vigente (não recebe `newCommissionId` arbitrário).
- Pode ser necessário um status/metadata para expected signers "supersedados" — hoje não existe; avaliar em 01E.

---

## 12. Achados para 01F (seed) — gap real

O seed atual (`apps/backend/prisma/seed.ts`) **não cria nenhuma comissão** e tem apenas **1** `CESAD_MEMBER` e **1** `COMMISSION_ASSISTANT`. Para a composição mínima (3 titulares + 2 suplentes), 01F precisará:

- Adicionar **mais 4 usuários `CESAD_MEMBER`** (hoje há 1; precisa de 5 para 3+2).
- Manter o único `COMMISSION_ASSISTANT` **fora** da composição.
- Criar 1 `CesadCommission` vigente + 1 `CesadCommissionAct` + 5 `CesadCommissionMember`.

Pontos a preservar do seed atual (já corretos): guarda `NODE_ENV=production` (linha 84), senha via `DEV_SEED_PASSWORD` (linha 88), idempotência via `upsert`. O seed roda em `backend:bootstrap` seguido de `db:check` (`apps/backend/package.json:17-18`) — 01F deve manter `db:check` verde.

---

## 13. Checklist de validação que cada fatia deve rodar

Padrão confirmado no histórico de `BE-CESAD-ASSIGN-REPLACE-01`:
- `npm run build --workspace @sadep/contracts`
- `npm run prisma:generate --workspace @sadep/backend`
- `npm run typecheck --workspace @sadep/backend` e `typecheck:spec`
- `npm run test --workspace @sadep/backend`
- `npx prisma validate --schema apps/backend/prisma/schema.prisma`
- `git diff --check`

---

## 14. Plano de testes por fatia

### 01B
Criação por ADMIN; por HOMOLOGATION_AUTHORITY; bloqueio dos demais 4 perfis; < 3 titulares; < 2 suplentes; assistant como membro; usuário duplicado; vigência sobreposta; encerramento D-1 da anterior sem data fim; comissão futura não vira atual antes da data; membro fora da vigência; transação (rollback em erro parcial); auditoria dos 3 eventos.

### 01C
Edição por ADMIN/HOMOLOGATION_AUTHORITY; bloqueio dos demais; bloqueio quando há `CesadStageAssignment`; vigência conflitante; composição mínima inválida; assistant como membro; auditoria `UPDATED` com before/after; atomicidade.

### 01D
Close/supersede por ADMIN/HOMOLOGATION_AUTHORITY; bloqueio dos demais; close sem assignments; close com assignments históricos sem apagar vínculos; bloqueio de encerramento retroativo sobre ato consolidado; supersede com D-1; auditoria `CLOSED`/`SUPERSEDED`.

### 01E
Rollover sem parecer; com draft; com `READY_FOR_SIGNATURE`; com doc parcialmente assinado; bloqueio quando `SIGNED`; bloqueio de assinatura pendente da comissão anterior após rollover; nova assignment criada; assignment anterior preservada; signers recriados a partir da nova comissão; auditoria; idempotência/conflito na 2ª tentativa; **teste de regressão garantindo que `SUPERSEDE_CESAD_STAGE_ASSIGNMENT` continua intacto**.

---

## 15. Pendência de handoff (única ação humana restante)

Aprovar estes contratos com Pedro e Edgar e confirmar:
1. Aceitam a trilha `CesadCommissionAuditEvent` própria (seção 6) e a micro-fatia de schema no início de 01B (seção 8.1)?
2. Pedro assume o `CesadCommissionValidityService` (seção 9)?
3. Registramos o adendo à ADR-006 (seção 10) antes de 01B?

Com esses três "sim", 01B e 01D podem começar em paralelo.
