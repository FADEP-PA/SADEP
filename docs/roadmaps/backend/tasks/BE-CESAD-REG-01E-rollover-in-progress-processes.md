# BE-CESAD-REG-01E — Rollover de processos em andamento

**Dev:** Lucas
**Status:** Fatia segura entregue — supersessão de atos preparatórios deferida (ver "Escopo entregue vs deferido")
**Depende de:** BE-CESAD-REG-01A, 01B, 01C, 01D (todos merged e estáveis)

> Task de maior risco do épico. Não iniciar antes de 01B + 01C + 01D estabilizados.

---

## Escopo entregue vs deferido

**Entregue nesta fatia** (`feat/be-cesad-reg-01e-rollover`):

- Endpoint `POST /processes/:id/stages/:sequence/cesad-stage-assignment/rollover`.
- Rollover temporal do caso **"sem parecer iniciado"** (ADR-006, primeira linha): quando a comissão atribuída perdeu vigência e ainda não há parecer/expected signers/documento CESAD na etapa, a comissão vigente assume — assignment anterior supersedada (preservada), nova assignment criada, auditoria `CESAD_COMMISSION_ROLLOVER_APPLIED`.
- Resolução automática da comissão vigente por data (diferente do `supersede`, que recebe `newCommissionId` explícito).
- Guardas: comissão anterior ainda vigente, processo fora de `EM_ANALISE_CESAD`, perfil não autorizado, ausência/multiplicidade de comissão vigente, e bloqueio quando já há ato CESAD na etapa.
- Provado contra Postgres real (8/8 cenários) e specs de integração no runner.

**Deferido para task própria de supersessão de parecer** (`BE-CESAD-REG-01E-B` sugerida):

- Rollover com parecer em `DRAFT`, documento `READY_FOR_SIGNATURE` e documento parcialmente assinado.
- Invalidação de documento preparatório (`INVALIDATED_OR_SUPERSEDED`) e cancelamento de assinaturas pendentes.
- Recriação de expected signers para a nova comissão.

**Motivo do deferimento:** superseder um `CesadStageOpinion` já iniciado exige quebrar o invariante 1:1 `processStageId` (ou deletar registros), o que o próprio [ADR-005](../../../architecture/adr/adr-005-final-cesad-opinion-modeling.md) rejeitou por alto risco de regressão em código auditado (pareceres de etapa, expected signers, leitura consolidada). A [ADR-006](../../../architecture/adr/adr-006-cesad-commission-management-and-rollover.md) já previa tratar isso "conforme modelagem futura". Fazê-lo aqui, de forma destrutiva/intrusiva, violaria a imutabilidade jurídica do domínio.

---

## Objetivo

Permitir que a comissão CESAD vigente assuma processos em andamento que ainda não possuem parecer CESAD consolidado, preservando atos anteriores como referência histórica e impedindo que documentos parcialmente assinados pela comissão anterior produzam ato final.

---

## Fora do escopo

- Cadastro de comissão
- Edição de comissão
- Encerramento administrativo de comissão
- Frontend
- Homologação, notificação e ciência
- Mudança em parecer final, salvo se a varredura identificar dependência específica

---

## Regra central

A mudança de comissão afeta atos preparatórios, não atos consolidados.

Um ato está consolidado quando:
- Documento correspondente está `SIGNED`
- Todas as assinaturas esperadas estão `COMPLETED`
- Ato colegiado está documentalmente completo

---

## Casos de rollover

| Situação | Resultado esperado |
|---|---|
| Sem parecer iniciado | Nova comissão vigente assume a etapa/processo |
| Parecer em draft | Draft anterior vira referência histórica; nova comissão inicia parecer |
| Parecer funcional completo, documento não assinado | Documento/parecer preparatório deve ser supersedado |
| Documento `READY_FOR_SIGNATURE` | Documento deve ser supersedado antes de novo parecer válido |
| Documento parcialmente assinado | Assinaturas pendentes devem ser impedidas; documento anterior vira referência |
| Documento `SIGNED` com todas assinaturas | Não aplicar rollover; ato permanece válido |

---

## Riscos

- Afeta documentos, expected signers e assinaturas
- Pode conflitar com `BE-CESAD-ASSIGN-REPLACE-01` se não houver separação clara
- Pode exigir novo status ou metadata para expected signers supersedados
- Pode exigir ajustes em leitura consolidada para exibir referências históricas

---

## Endpoint

- [x] Definir endpoint na varredura (`POST /processes/:id/stages/:sequence/cesad-stage-assignment/rollover`)
- [x] Confirmar autorizações: `ADMIN`, `HOMOLOGATION_AUTHORITY` (reusa a política do supersede; `CESAD_MEMBER` da nova comissão não incluído nesta fatia)

---

## Detecção e elegibilidade

- [x] Detectar que a assignment ativa pertence a comissão que perdeu vigência
- [x] Verificar se existe parecer/documento consolidado na etapa
- [x] Bloquear rollover quando documento já está `SIGNED` com assinaturas completas *(coberto pelo bloqueio de qualquer ato CESAD iniciado na etapa)*

---

## Ações de rollover

- [x] Preservar pareceres/documentos consolidados (não tocar)
- [ ] Superseder ou invalidar atos preparatórios não consolidados *(deferido — ver "Escopo entregue vs deferido")*
- [x] Criar nova `CesadStageAssignment` para a comissão vigente
- [x] Manter assignment anterior como referência histórica (não sobrescrever)
- [ ] Recriar `CesadStageOpinionExpectedSigner` com base na nova comissão vigente *(deferido)*
- [ ] Impedir que assinaturas pendentes da comissão anterior consolidem documento antigo *(deferido)*

---

## Auditoria

- [x] Emitir `CESAD_COMMISSION_ROLLOVER_APPLIED` com processo, etapa, assignment anterior, nova comissão, usuário executor e motivo

---

## Testes

- [x] Rollover sem parecer iniciado
- [ ] Rollover com draft *(deferido — atualmente bloqueado)*
- [ ] Rollover com documento `READY_FOR_SIGNATURE` *(deferido — atualmente bloqueado)*
- [ ] Rollover com documento parcialmente assinado *(deferido — atualmente bloqueado)*
- [x] Bloqueio de rollover quando há ato CESAD iniciado/consolidado na etapa
- [ ] Bloqueio de assinatura pendente da comissão anterior após rollover *(deferido)*
- [x] Nova assignment criada para comissão vigente
- [x] Assignment anterior preservada
- [x] Auditoria criada com metadados completos
- [x] Idempotência/conflito claro em segunda tentativa

---

## Critérios de aceite

- [x] Atos consolidados não são alterados
- [x] Atos preparatórios da comissão anterior não produzem efeito final *(garantido por bloqueio nesta fatia; supersessão ativa fica na task deferida)*
- [x] Nova comissão vigente consegue emitir parecer válido *(no caso sem parecer iniciado)*
- [x] Histórico permanece consultável
- [x] Auditoria explica a transição de competência

---

## Paralelização

Não deve ser implementada em paralelo com 01B, 01C ou 01D. Pode ser estudada em paralelo em nível de análise, mas a implementação deve ocorrer depois da estabilização do cadastro/encerramento da comissão.
