# BE-CESAD-REG-01A — Contratos de domínio, payloads e eventos

**Dev:** Lucas
**Status:** Pendente
**Depende de:** BE-CESAD-REG-01, ADR-006
**Desbloqueia:** 01B, 01C, 01D, 01E, 01F

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

- [ ] Revisar modelo `CesadCommission` e enums relacionados
- [ ] Revisar modelo `CesadCommissionAct`
- [ ] Revisar modelo `CesadCommissionMember`
- [ ] Revisar `CesadStageAssignment` e todos os pontos de uso da comissão vigente
- [ ] Mapear `CesadCurrentCommissionService` — como resolve a comissão vigente hoje
- [ ] Mapear como `SEND_TO_CESAD` cria ou reutiliza `CesadStageAssignment`
- [ ] Mapear como expected signers são derivados da composição titular vigente
- [ ] Levantar quais enums de auditoria já existem
- [ ] Mapear como o projeto trata documentos `READY_FOR_SIGNATURE`, `SIGNED` e `INVALIDATED_OR_SUPERSEDED`
- [ ] Verificar risco de colisão com `BE-CESAD-ASSIGN-REPLACE-01`
- [ ] Mapear controllers/services read-only existentes de comissão

---

## Contratos

- [ ] Listar contratos existentes a reutilizar
- [ ] Definir DTO de criação de comissão (`create`)
- [ ] Definir DTO de edição de comissão (`update`)
- [ ] Definir DTO de encerramento/supersessão (`close/supersede`)
- [ ] Definir DTO de leitura enriquecida de comissão
- [ ] Confirmar ou ajustar payload mínimo previsto em 01B

---

## Eventos de auditoria

- [ ] Definir evento `CESAD_COMMISSION_CREATED`
- [ ] Definir evento `CESAD_COMMISSION_UPDATED`
- [ ] Definir evento `CESAD_COMMISSION_CLOSED`
- [ ] Definir evento `CESAD_COMMISSION_SUPERSEDED`
- [ ] Definir evento `CESAD_COMMISSION_ACT_REGISTERED`
- [ ] Definir evento `CESAD_COMMISSION_MEMBER_ADDED`
- [ ] Definir evento `CESAD_COMMISSION_ROLLOVER_APPLIED`
- [ ] Confirmar metadados mínimos de cada evento

---

## Erros padronizados

- [ ] Definir erro para vigência conflitante
- [ ] Definir erro para composição mínima inválida
- [ ] Definir erro para membro incompatível (`COMMISSION_ASSISTANT`)
- [ ] Definir erro para edição de comissão já usada em processo

---

## Plano de implementação

- [ ] Definir dono do service de vigência (Pedro ou Edgar — evitar duplicação da regra D-1)
- [ ] Documentar plano de testes obrigatório para 01B
- [ ] Documentar plano de testes obrigatório para 01C
- [ ] Documentar plano de testes obrigatório para 01D
- [ ] Documentar plano de testes obrigatório para 01E
- [ ] Confirmar se ADR-006 é suficiente ou precisa de complemento
- [ ] Aprovar contratos com o time antes de liberar implementação

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

- [ ] Nenhum código funcional alterado sem necessidade explícita
- [ ] Contratos e eventos definidos antes da 01B iniciar
- [ ] Riscos de schema e workflow mapeados
- [ ] Próximas fatias podem ser executadas por pessoas diferentes sem ambiguidade

---

## Paralelização

Deve ser executada antes das fatias de implementação backend. Após concluída, libera 01B, 01C, 01D, 01F e a especificação frontend.
