# BE-CESAD-REG-01D — Encerrar ou superseder comissão

**Dev:** Edgar
**Status:** Pendente
**Depende de:** BE-CESAD-REG-01A (coordenar vigência D-1 com Pedro/01B)

---

## Objetivo

Implementar o encerramento formal e a supersessão de comissões CESAD, preservando histórico e evitando reescrita de atos já praticados.

---

## Fora do escopo

- Criar nova comissão com composição inicial (tratado em 01B)
- Editar comissão ainda não utilizada (tratado em 01C)
- Rollover de processos em andamento (tratado em 01E)
- Frontend
- Seed local

---

## Regras de encerramento

- Encerramento não pode produzir sobreposição ou lacuna incorreta sem decisão expressa
- Encerramento retroativo deve ser bloqueado se afetar ato consolidado
- Se comissão tiver atos preparatórios pendentes, a consequência deve ser tratada pela frente de rollover (01E)
- Encerrar comissão não deve apagar membros, atos ou assignments

## Regras de supersessão

- Nova comissão posterior pode superseder a anterior
- Se a anterior estiver sem data fim, receberá fim em D-1
- Assignments antigos permanecem apontando para a comissão anterior
- Atos consolidados da anterior permanecem válidos
- Atos preparatórios pendentes devem ser tratados por 01E

---

## Perfis autorizados

Permitidos: `ADMIN`, `HOMOLOGATION_AUTHORITY`

Bloqueados: `CESAD_MEMBER`, `COMMISSION_ASSISTANT`, `IMMEDIATE_SUPERVISOR`, `INTERN_SERVER`

---

## Endpoints

- [ ] Criar `POST /cesad/commissions/:id/close`
- [ ] Criar `POST /cesad/commissions/:id/supersede`
- [ ] Proteger com guard de role (`ADMIN`, `HOMOLOGATION_AUTHORITY`)
- [ ] Bloquear demais perfis

---

## Regras de encerramento

- [ ] Bloquear encerramento que produza sobreposição de vigência
- [ ] Bloquear encerramento retroativo que afete ato consolidado
- [ ] Encerrar comissão não apaga membros, atos ou assignments
- [ ] Sinalizar atos preparatórios pendentes (tratamento de rollover é responsabilidade de 01E)

---

## Regras de supersessão

- [ ] Comissão anterior sem data fim recebe fim em D-1 ao ser supersedida
- [ ] Assignments históricos permanecem apontando para a comissão anterior
- [ ] Atos consolidados da anterior permanecem válidos
- [ ] Atos preparatórios pendentes apenas sinalizados — tratamento em 01E

---

## Persistência

- [ ] Operação transacional (tudo ou rollback)

---

## Auditoria

- [ ] Emitir `CESAD_COMMISSION_CLOSED` com data fim, motivo e indicadores de assignments/atos
- [ ] Emitir `CESAD_COMMISSION_SUPERSEDED` com comissão sucessora quando houver

---

## Testes

- [ ] Encerramento por `ADMIN`
- [ ] Encerramento por `HOMOLOGATION_AUTHORITY`
- [ ] Bloqueio para demais perfis
- [ ] Encerramento de comissão sem assignments
- [ ] Encerramento de comissão com assignments históricos sem apagar vínculos
- [ ] Bloqueio de encerramento retroativo que afete ato consolidado
- [ ] Supersessão com encerramento D-1
- [ ] Auditoria de encerramento e supersessão

---

## Critérios de aceite

- [ ] Histórico preservado
- [ ] Nenhuma assignment sobrescrita
- [ ] Nenhum documento consolidado invalidado
- [ ] Fluxos pendentes apenas sinalizados para 01E
- [ ] Leitura da comissão atual continua consistente por data

---

## Paralelização

Pode ser planejada em paralelo com 01C. A implementação deve ser coordenada com 01B se ambas alterarem regras de vigência/encerramento D-1.
