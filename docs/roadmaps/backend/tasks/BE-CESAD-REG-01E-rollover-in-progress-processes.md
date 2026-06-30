# BE-CESAD-REG-01E — Rollover de processos em andamento

## Status

Pendente / especificada / alta sensibilidade / executar apos estabilizar cadastro e encerramento.

## Relacao com o epico

Task filha de `BE-CESAD-REG-01`.

Implementa a parte mais sensivel da `ADR-006`: substituicao explicita e auditavel de atos preparatorios quando a comissao vigente muda.

## Objetivo

Permitir que a comissao CESAD vigente assuma processos em andamento que ainda nao possuem parecer CESAD consolidado, preservando atos anteriores como referencia historica e impedindo que documentos parcialmente assinados pela comissao anterior produzam ato final.

## Escopo

- Detectar que a assignment atual pertence a comissao que perdeu vigencia.
- Verificar se existe parecer/documento consolidado.
- Preservar pareceres/documentos consolidados.
- Superseder ou invalidar atos preparatorios nao consolidados.
- Criar nova assignment para a comissao vigente quando aplicavel.
- Recriar expected signers com base na nova comissao vigente.
- Impedir assinaturas pendentes da comissao anterior de consolidarem documento antigo.
- Auditar rollover.

## Fora do escopo

- Cadastro de comissao.
- Edicao de comissao.
- Encerramento administrativo de comissao.
- Frontend.
- Homologacao, notificacao e ciencia.
- Mudanca em parecer final, salvo se a varredura identificar dependencia especifica.

## Regra central

A mudanca de comissao afeta atos preparatorios, nao atos consolidados.

Um ato esta consolidado quando:

- documento correspondente esta `SIGNED`;
- todas as assinaturas esperadas estao `COMPLETED`;
- ato colegiado esta documentalmente completo.

## Casos de rollover

| Situacao | Resultado esperado |
|---|---|
| Sem parecer iniciado | Nova comissao vigente assume a etapa/processo. |
| Parecer em draft | Draft anterior vira referencia historica ou e descartado conforme regra futura; nova comissao inicia parecer. |
| Parecer funcional completo, mas documento nao assinado | Documento/parecer preparatorio deve ser supersedado. |
| Documento `READY_FOR_SIGNATURE` | Documento deve ser supersedado antes de novo parecer valido. |
| Documento parcialmente assinado | Assinaturas pendentes devem ser impedidas; documento anterior vira referencia. |
| Documento `SIGNED` com todas assinaturas | Nao aplicar rollover; ato permanece valido. |

## Endpoints possiveis

A definir na varredura tecnica. Opcoes:

```http
POST /processes/:id/stages/:sequence/cesad-stage-assignment/rollover
```

ou integrar a validacao nos fluxos existentes de parecer/assinatura, exigindo rollover antes de prosseguir.

## Regras de autorizacao

A confirmar na implementacao, mas a orientacao inicial e:

Permitidos:

- `ADMIN`;
- `HOMOLOGATION_AUTHORITY`;
- possivelmente `CESAD_MEMBER` da nova comissao, apenas para iniciar a atuacao quando o processo estiver sob sua competencia.

Bloqueados:

- comissao anterior fora de vigencia;
- `COMMISSION_ASSISTANT` para mutacao;
- chefia;
- servidor.

## Auditoria esperada

Evento futuro esperado:

- `CESAD_COMMISSION_ROLLOVER_APPLIED`.

Metadata minima:

- processo;
- etapa;
- assignment anterior;
- comissao anterior;
- nova comissao;
- documentos supersedados;
- expected signers cancelados/supersedados;
- usuario executor;
- motivo;
- data de referencia.

## Testes obrigatorios

- Rollover sem parecer iniciado.
- Rollover com draft.
- Rollover com documento `READY_FOR_SIGNATURE`.
- Rollover com documento parcialmente assinado.
- Bloqueio de rollover quando documento ja esta `SIGNED`.
- Bloqueio de assinatura pendente da comissao anterior apos rollover.
- Nova assignment criada para comissao vigente.
- Assignment anterior preservada.
- Auditoria criada.
- Idempotencia ou conflito claro em segunda tentativa.

## Riscos

- Afeta documentos, expected signers e assinaturas.
- Pode conflitar com `BE-CESAD-ASSIGN-REPLACE-01` se nao houver separacao clara.
- Pode exigir novo status ou metadata para expected signers supersedados.
- Pode exigir ajustes em leitura consolidada para exibir referencias historicas.

## Criterios de aceite

- Atos consolidados nao sao alterados.
- Atos preparatorios da comissao anterior nao produzem efeito final.
- Nova comissao vigente consegue emitir parecer valido.
- Historico permanece consultavel.
- Auditoria explica a transicao de competencia.

## Dependencias

- `BE-CESAD-REG-01A`.
- Preferencialmente `BE-CESAD-REG-01B`, `01C` e `01D`.
- `ADR-006`.

## Paralelizacao

Nao deve ser implementada em paralelo com `01B`, `01C` ou `01D`. Pode ser estudada em paralelo em nivel de analise, mas a implementacao deve ocorrer depois da estabilizacao do cadastro/encerramento da comissao.
