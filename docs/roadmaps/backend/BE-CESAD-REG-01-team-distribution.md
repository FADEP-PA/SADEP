# Distribuição de Time — BE-CESAD-REG-01

**Data:** 30/06/2026
**Épico:** Cadastro e gerenciamento formal de Comissões CESAD
**ADR de referência:** [ADR-006](../../architecture/adr/adr-006-cesad-commission-management-and-rollover.md)
**Baseline de design (01A):** [`BE-CESAD-REG-01A-design-output.md`](./BE-CESAD-REG-01A-design-output.md)
**Time:** Lucas · Pedro · Edgar

---

## Atribuição por Dev

| Dev | Tasks | Papel |
|---|---|---|
| **Lucas** | 01A → 01E | Fundação e Rollover |
| **Pedro** | 01B → 01C | Criação e Edição |
| **Edgar** | 01D → 01F | Encerramento e Seed |

---

## Lucas — Fundação e Rollover

### BE-CESAD-REG-01A — Contratos, DTOs, Eventos e Plano de Testes

> Executa **primeiro**. Desbloqueia todos os outros.

- Varredura técnica completa do schema atual (`CesadCommission`, `CesadCommissionAct`, `CesadCommissionMember`, `CesadStageAssignment`)
- Definir DTOs de criação, edição e encerramento
- Definir eventos de auditoria (`CESAD_COMMISSION_CREATED`, `CESAD_COMMISSION_CLOSED`, etc.)
- Mapear quais services serão alterados por 01B, 01C, 01D e 01E
- Definir dono do service de vigência (Pedro ou Edgar — evitar duplicação da regra D-1)
- Plano de testes para todas as fatias

**Entrega:** contratos aprovados pelo time antes de qualquer PR de implementação.

---

### BE-CESAD-REG-01E — Rollover de Processos em Andamento

> Executa **por último**. Aguarda 01B + 01C + 01D merged e estáveis.

- Detectar assignment pertencente a comissão fora de vigência
- Verificar se existe parecer/documento consolidado (não tocar)
- Superseder atos preparatórios não consolidados
- Criar nova assignment para comissão vigente
- Recriar expected signers com base na nova comissão
- Impedir assinaturas pendentes da comissão anterior de consolidarem documento antigo
- Auditar rollover com metadados completos

**Risco:** afeta `CesadStageAssignment`, `CesadStageOpinionExpectedSigner`, `ProcessDocument` e `SignatureRecord`.

---

## Pedro — Criação e Edição

### BE-CESAD-REG-01B — Criar Comissão com Ato e Composição Inicial

> Aguarda **01A**.

- `POST /cesad/commissions`
- Receber dados da portaria/ato e composição inicial
- Validar mínimo de 3 titulares e 2 suplentes
- Bloquear `COMMISSION_ASSISTANT` como membro formal
- Bloquear vigência sobreposta
- Encerrar automaticamente comissão anterior sem data fim (D-1)
- Transação atômica: comissão + ato + membros ou rollback
- Auditar: `CESAD_COMMISSION_CREATED`, `CESAD_COMMISSION_ACT_REGISTERED`, `CESAD_COMMISSION_MEMBER_ADDED`

---

### BE-CESAD-REG-01C — Editar Comissão Ainda Não Utilizada

> Aguarda **01B**.

- `PUT /cesad/commissions/:id` ou `PATCH /cesad/commissions/:id`
- Permitir edição somente se a comissão **não tiver** `CesadStageAssignment` associado
- Revalidar vigência, composição mínima e membros ao editar
- Bloquear alterações estruturais em comissão já usada processualmente
- Auditar: `CESAD_COMMISSION_UPDATED`

---

## Edgar — Encerramento e Seed

### BE-CESAD-REG-01D — Encerrar ou Superseder Comissão

> Aguarda **01A**. Pode começar em paralelo com 01B após alinhamento com Pedro.

- `POST /cesad/commissions/:id/close`
- `POST /cesad/commissions/:id/supersede`
- Encerramento não pode produzir sobreposição ou apagar membros/atos/assignments
- Encerramento retroativo bloqueado se afetar ato consolidado
- Supersessão: comissão anterior recebe fim em D-1
- Assignments históricos permanecem apontando para comissão anterior
- Auditar: `CESAD_COMMISSION_CLOSED`, `CESAD_COMMISSION_SUPERSEDED`

---

### BE-CESAD-REG-01F — Seed Local Mínimo

> Aguarda **01B** (modelo de criação estável).

- Criar comissão CESAD vigente no ambiente de desenvolvimento
- Ato fictício com tipo, número, ano e vigência
- 3 usuários `CESAD_MEMBER` titulares
- 2 usuários `CESAD_MEMBER` suplentes
- 1 usuário `COMMISSION_ASSISTANT` separado (sem vínculo como membro formal)
- Seed idempotente (rodar duas vezes sem duplicar)
- Falhar explicitamente em `NODE_ENV=production`

---

## Fases de Execução

```
         Fase 1        Fase 2              Fase 3         Fase 4
Lucas:  [──01A──]  [suporte/revisão]  [suporte/revisão]  [──01E──]
Pedro:  [aguarda]  [────01B─────────] [──01C──]          [livre  ]
Edgar:  [aguarda]  [────01D─────────] [─01F─]            [livre  ]
                        ↑
               alinhar regra D-1
               (Pedro + Edgar)
```

### Fase 1 — Somente Lucas
Lucas executa 01A. Pedro e Edgar aguardam. Sem contratos definidos não há implementação possível.

### Fase 2 — Pedro e Edgar em paralelo, Lucas de suporte
Pedro inicia 01B. Edgar inicia 01D. **Antes de codar**, Pedro e Edgar definem quem é o dono do service de vigência para evitar duplicação da regra D-1.

### Fase 3 — Pedro e Edgar continuam, Lucas de suporte
Pedro emenda para 01C (01B merged). Edgar emenda para 01F (01B disponível).

### Fase 4 — Somente Lucas
Lucas executa 01E após 01B + 01C + 01D merged e estáveis.

---

## Critério de Avanço entre Fases

| Avanço | Condição |
|---|---|
| 01A → Fase 2 | Lucas entrega contratos e plano aprovados pelo time |
| 01B merged → 01C | Pedro confirma criação transacional estável e testada |
| 01B + 01C + 01D merged → 01E | Três PRs no `develop`, Lucas inicia rollover |

---

## Ponto de Coordenação Crítico

**Pedro (01B) e Edgar (01D)** tocam na mesma regra:

> _Quando nova comissão posterior é cadastrada, a comissão anterior sem data fim recebe encerramento automático em D-1._

Definir no início da Fase 2 quem centraliza essa lógica no service. A outra task chama o mesmo service — sem duplicar a regra.

---

## Riscos

| Risco | Ação |
|---|---|
| Iniciar 01B ou 01D antes de 01A fechar | Bloquear. Contratos indefinidos = retrabalho garantido. |
| Pedro e Edgar duplicarem a regra D-1 | Alinhar dono do service antes do primeiro commit da Fase 2. |
| 01E iniciar antes de 01B+01C+01D estabilizarem | Bloquear. Rollover depende de assignments, documentos e expected signers estáveis. |
| 01F commitar com dados reais | Revisão obrigatória antes de merge. Seed deve falhar em produção. |

---

## Links das Tasks

| Task | Documento |
|---|---|
| Épico | [BE-CESAD-REG-01](./tasks/BE-CESAD-REG-01-commission-registration-management.md) |
| 01A | [Contratos, DTOs, Eventos](./tasks/BE-CESAD-REG-01A-domain-contracts-events.md) |
| 01B | [Criar Comissão](./tasks/BE-CESAD-REG-01B-create-commission-with-act-and-members.md) |
| 01C | [Editar Comissão](./tasks/BE-CESAD-REG-01C-edit-unused-commission.md) |
| 01D | [Encerrar/Superseder](./tasks/BE-CESAD-REG-01D-close-supersede-commission.md) |
| 01E | [Rollover](./tasks/BE-CESAD-REG-01E-rollover-in-progress-processes.md) |
| 01F | [Seed Local](./tasks/BE-CESAD-REG-01F-local-seed-current-commission.md) |
