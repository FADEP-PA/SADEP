# BE-CESAD-REG-01C — Editar comissão ainda não utilizada

**Dev:** Pedro
**Status:** Concluída
**Depende de:** BE-CESAD-REG-01A, BE-CESAD-REG-01B (preferencialmente)

---

## Objetivo

Permitir edição controlada de comissão CESAD que ainda não tenha sido usada em processo, preservando a segurança histórica da aplicação.

---

## Fora do escopo

- Retificação formal de comissão já usada
- Alteração de atos consolidados
- Rollover de processos em andamento
- Encerramento/supersessão formal
- Frontend
- Seed

---

## Regra principal

Se a comissão já tiver sido usada em `CesadStageAssignment`, bloquear alterações estruturais.

Alterações estruturais incluem:
- Vigência
- Status
- Ato/portaria principal
- Membros titulares e suplentes
- Composição mínima
- Dados que afetem competência ou validade de atos

## Alterações permitidas (sem uso processual)

- Corrigir nome/descrição
- Ajustar vigência, desde que sem conflito
- Ajustar ato/portaria
- Alterar composição
- Trocar titulares/suplentes
- Ajustar datas de membros dentro da vigência da comissão

## Alterações não permitidas nesta fatia

- Editar comissão já usada
- Reabrir documento assinado
- Alterar expected signers já congelados
- Trocar comissão de processo
- Corrigir erro material de comissão usada (task futura de retificação formal)

---

## Perfis autorizados

Permitidos: `ADMIN`, `HOMOLOGATION_AUTHORITY`

Bloqueados: `CESAD_MEMBER`, `COMMISSION_ASSISTANT`, `IMMEDIATE_SUPERVISOR`, `INTERN_SERVER`

---

## Endpoint

- [x] Criar `PUT /cesad/commissions/:id` ou `PATCH /cesad/commissions/:id` (confirmar na 01A)
- [x] Proteger com guard de role (`ADMIN`, `HOMOLOGATION_AUTHORITY`)
- [x] Bloquear demais perfis

---

## Validação principal

- [x] Verificar se a comissão existe
- [x] Verificar se a comissão **não possui** `CesadStageAssignment` associado
- [x] Bloquear qualquer edição estrutural se houver uso processual

---

## Validações de edição

- [x] Revalidar vigência — bloquear se nova vigência conflitar
- [x] Revalidar composição mínima (3 titulares, 2 suplentes)
- [x] Revalidar membros existentes e ativos
- [x] Bloquear `COMMISSION_ASSISTANT` como membro formal
- [x] Bloquear usuário duplicado

---

## Persistência

- [x] Operação transacional (tudo ou rollback)

---

## Auditoria

- [x] Emitir `CESAD_COMMISSION_UPDATED` com campos alterados e valores anteriores/novos

---

## Testes

- [x] Edição por `ADMIN`
- [x] Edição por `HOMOLOGATION_AUTHORITY`
- [x] Bloqueio para demais perfis
- [x] Bloqueio quando há `CesadStageAssignment`
- [x] Bloqueio de vigência conflitante
- [x] Bloqueio por composição mínima inválida
- [x] Bloqueio de `COMMISSION_ASSISTANT` como membro
- [x] Auditoria da alteração com valores anteriores e novos
- [x] Transação atômica em caso de erro

---

## Critérios de aceite

- [x] Edição permitida apenas antes de uso processual
- [x] Comissão já usada permanece imutável estruturalmente
- [x] Leitura de comissão atual continua consistente
- [x] Nenhuma reescrita histórica
- [x] Testes cobrem permissões, bloqueios e auditoria

---

## Paralelização

Pode ser planejada em paralelo com 01D em nível de documentação, mas a implementação deve ser coordenada para evitar conflitos nos mesmos services de comissão.
