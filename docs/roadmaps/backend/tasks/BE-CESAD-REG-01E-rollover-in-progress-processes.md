# BE-CESAD-REG-01E — Rollover de processos em andamento

**Dev:** Lucas
**Status:** Pendente
**Depende de:** BE-CESAD-REG-01A, 01B, 01C, 01D (todos merged e estáveis)

> Task de maior risco do épico. Não iniciar antes de 01B + 01C + 01D estabilizados.

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

- [ ] Definir endpoint na varredura (opção: `POST /processes/:id/stages/:sequence/cesad-stage-assignment/rollover`)
- [ ] Confirmar autorizações: `ADMIN`, `HOMOLOGATION_AUTHORITY` e possivelmente `CESAD_MEMBER` da nova comissão

---

## Detecção e elegibilidade

- [ ] Detectar que a assignment ativa pertence a comissão que perdeu vigência
- [ ] Verificar se existe parecer/documento consolidado na etapa
- [ ] Bloquear rollover quando documento já está `SIGNED` com assinaturas completas

---

## Ações de rollover

- [ ] Preservar pareceres/documentos consolidados (não tocar)
- [ ] Superseder ou invalidar atos preparatórios não consolidados
- [ ] Criar nova `CesadStageAssignment` para a comissão vigente
- [ ] Manter assignment anterior como referência histórica (não sobrescrever)
- [ ] Recriar `CesadStageOpinionExpectedSigner` com base na nova comissão vigente
- [ ] Impedir que assinaturas pendentes da comissão anterior consolidem documento antigo

---

## Auditoria

- [ ] Emitir `CESAD_COMMISSION_ROLLOVER_APPLIED` com processo, etapa, assignment anterior, nova comissão, documentos supersedados, expected signers cancelados, usuário executor e motivo

---

## Testes

- [ ] Rollover sem parecer iniciado
- [ ] Rollover com draft
- [ ] Rollover com documento `READY_FOR_SIGNATURE`
- [ ] Rollover com documento parcialmente assinado
- [ ] Bloqueio de rollover quando documento já está `SIGNED`
- [ ] Bloqueio de assinatura pendente da comissão anterior após rollover
- [ ] Nova assignment criada para comissão vigente
- [ ] Assignment anterior preservada
- [ ] Auditoria criada com metadados completos
- [ ] Idempotência ou conflito claro em segunda tentativa

---

## Critérios de aceite

- [ ] Atos consolidados não são alterados
- [ ] Atos preparatórios da comissão anterior não produzem efeito final
- [ ] Nova comissão vigente consegue emitir parecer válido
- [ ] Histórico permanece consultável
- [ ] Auditoria explica a transição de competência

---

## Paralelização

Não deve ser implementada em paralelo com 01B, 01C ou 01D. Pode ser estudada em paralelo em nível de análise, mas a implementação deve ocorrer depois da estabilização do cadastro/encerramento da comissão.
