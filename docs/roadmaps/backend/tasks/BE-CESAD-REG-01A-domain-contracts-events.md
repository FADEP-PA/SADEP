# BE-CESAD-REG-01A — Contratos de domínio, payloads e eventos

**Dev:** Lucas
**Status:** Concluída — varredura e desenho técnico entregues (2026-06-30)
**Depende de:** BE-CESAD-REG-01, ADR-006
**Desbloqueia:** 01B, 01C, 01D, 01E, 01F
**Entregável de design:** [`BE-CESAD-REG-01A-design-output.md`](../BE-CESAD-REG-01A-design-output.md)

---

## Objetivo

Consolidar o desenho técnico antes de implementar endpoints de mutação da comissão CESAD.

Esta task deve mapear o estado atual do schema, contracts, controllers, services e auditoria, definindo os contratos públicos e eventos mínimos para as próximas fatias.

---

## Fora do escopo

- Implementar endpoints
- Alterar schema Prisma
- Criar migrations
- Alterar frontend
- Criar seed
- Implementar rollover
- Alterar assinatura CESAD ou homologação

---

## Regras de negócio a preservar

- Resolver comissão vigente por data de referência
- Permitir comissão futura/agendada sem job de ativação
- Bloquear vigência sobreposta
- Permitir encerramento automático D-1 de comissão anterior sem data fim quando nova comissão posterior for cadastrada
- Exigir 3 titulares e 2 suplentes
- Impedir `COMMISSION_ASSISTANT` como membro formal
- Preservar atos consolidados
- Tratar atos preparatórios por rollover explícito e auditável em task própria

---

## Entregáveis esperados

- Lista de contratos existentes a reutilizar
- Lista de contratos novos ou campos adicionais necessários
- Proposta de DTOs para `create`, `update`, `close/supersede` e leitura enriquecida
- Proposta de eventos de auditoria
- Plano de implementação para 01B, 01C, 01D e 01E
- Confirmação se a ADR-006 é suficiente ou precisa de complemento

---

## Varredura técnica

- [x] Revisar modelo `CesadCommission` e enums relacionados
- [x] Revisar modelo `CesadCommissionAct`
- [x] Revisar modelo `CesadCommissionMember`
- [x] Revisar `CesadStageAssignment` e todos os pontos de uso da comissão vigente
- [x] Mapear `CesadCurrentCommissionService` — como resolve a comissão vigente hoje
- [x] Mapear como `SEND_TO_CESAD` cria ou reutiliza `CesadStageAssignment`
- [x] Mapear como expected signers são derivados da composição titular vigente
- [x] Levantar quais enums de auditoria já existem
- [x] Mapear como o projeto trata documentos `READY_FOR_SIGNATURE`, `SIGNED` e `INVALIDATED_OR_SUPERSEDED`
- [x] Verificar risco de colisão com `BE-CESAD-ASSIGN-REPLACE-01`
- [x] Mapear controllers/services read-only existentes de comissão

---

## Contratos

- [x] Listar contratos existentes a reutilizar
- [x] Definir DTO de criação de comissão (`create`)
- [x] Definir DTO de edição de comissão (`update`)
- [x] Definir DTO de encerramento/supersessão (`close/supersede`)
- [x] Definir DTO de leitura enriquecida de comissão
- [x] Confirmar ou ajustar payload mínimo previsto em 01B

> Detalhamento completo em [`BE-CESAD-REG-01A-design-output.md`](../BE-CESAD-REG-01A-design-output.md), seções 4 e 5.

---

## Eventos de auditoria

- [x] Definir evento `CESAD_COMMISSION_CREATED`
- [x] Definir evento `CESAD_COMMISSION_UPDATED`
- [x] Definir evento `CESAD_COMMISSION_CLOSED`
- [x] Definir evento `CESAD_COMMISSION_SUPERSEDED`
- [x] Definir evento `CESAD_COMMISSION_ACT_REGISTERED`
- [x] Definir evento `CESAD_COMMISSION_MEMBER_ADDED`
- [x] Definir evento `CESAD_COMMISSION_ROLLOVER_APPLIED`
- [x] Confirmar metadados mínimos de cada evento

> **Achado bloqueante:** `AuditEvent` exige `evaluationProcessId` (não-nulo). Os 6 primeiros eventos são administrativos e **não** têm processo. Decisão de design em [`BE-CESAD-REG-01A-design-output.md`](../BE-CESAD-REG-01A-design-output.md), seção 6.

---

## Erros padronizados

- [x] Definir erro para vigência conflitante
- [x] Definir erro para composição mínima inválida
- [x] Definir erro para membro incompatível (`COMMISSION_ASSISTANT`)
- [x] Definir erro para edição de comissão já usada em processo

> Catálogo de erros em [`BE-CESAD-REG-01A-design-output.md`](../BE-CESAD-REG-01A-design-output.md), seção 7.

---

## Plano de implementação

- [x] Definir dono do service de vigência (Pedro ou Edgar — evitar duplicação da regra D-1)
- [x] Documentar plano de testes obrigatório para 01B
- [x] Documentar plano de testes obrigatório para 01C
- [x] Documentar plano de testes obrigatório para 01D
- [x] Documentar plano de testes obrigatório para 01E
- [x] Confirmar se ADR-006 é suficiente ou precisa de complemento
- [ ] Aprovar contratos com o time antes de liberar implementação *(pendente — handoff humano com Pedro e Edgar)*

> Plano por fatia e dono do service de vigência em [`BE-CESAD-REG-01A-design-output.md`](../BE-CESAD-REG-01A-design-output.md), seções 8 e 9.

---

## Testes que deverão ser planejados

- Resolução temporal de comissão futura, vigente e encerrada
- Bloqueio de vigência sobreposta
- Composição mínima inválida
- Bloqueio de assistente como membro
- Bloqueio de edição estrutural de comissão usada
- Auditoria de criação/alteração
- Rollover com documento pendente, em task própria

---

## Critérios de aceite

- [x] Nenhum código funcional alterado sem necessidade explícita
- [x] Contratos e eventos definidos antes da 01B iniciar
- [x] Riscos de schema e workflow mapeados
- [x] Próximas fatias podem ser executadas por pessoas diferentes sem ambiguidade

---

## Paralelização

Deve ser executada antes das fatias de implementação backend. Após concluída, libera 01B, 01C, 01D, 01F e a especificação frontend.
