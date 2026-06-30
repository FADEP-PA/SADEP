# BE-CESAD-REG-01C — Editar comissão ainda não utilizada

**Dev:** Pedro
**Status:** Pendente
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

- [ ] Criar `PUT /cesad/commissions/:id` ou `PATCH /cesad/commissions/:id` (confirmar na 01A)
- [ ] Proteger com guard de role (`ADMIN`, `HOMOLOGATION_AUTHORITY`)
- [ ] Bloquear demais perfis

---

## Validação principal

- [ ] Verificar se a comissão existe
- [ ] Verificar se a comissão **não possui** `CesadStageAssignment` associado
- [ ] Bloquear qualquer edição estrutural se houver uso processual

---

## Validações de edição

- [ ] Revalidar vigência — bloquear se nova vigência conflitar
- [ ] Revalidar composição mínima (3 titulares, 2 suplentes)
- [ ] Revalidar membros existentes e ativos
- [ ] Bloquear `COMMISSION_ASSISTANT` como membro formal
- [ ] Bloquear usuário duplicado

---

## Persistência

- [ ] Operação transacional (tudo ou rollback)

---

## Auditoria

- [ ] Emitir `CESAD_COMMISSION_UPDATED` com campos alterados e valores anteriores/novos

---

## Testes

- [ ] Edição por `ADMIN`
- [ ] Edição por `HOMOLOGATION_AUTHORITY`
- [ ] Bloqueio para demais perfis
- [ ] Bloqueio quando há `CesadStageAssignment`
- [ ] Bloqueio de vigência conflitante
- [ ] Bloqueio por composição mínima inválida
- [ ] Bloqueio de `COMMISSION_ASSISTANT` como membro
- [ ] Auditoria da alteração com valores anteriores e novos
- [ ] Transação atômica em caso de erro

---

## Critérios de aceite

- [ ] Edição permitida apenas antes de uso processual
- [ ] Comissão já usada permanece imutável estruturalmente
- [ ] Leitura de comissão atual continua consistente
- [ ] Nenhuma reescrita histórica
- [ ] Testes cobrem permissões, bloqueios e auditoria

---

## Paralelização

Pode ser planejada em paralelo com 01D em nível de documentação, mas a implementação deve ser coordenada para evitar conflitos nos mesmos services de comissão.
