# ADR-006 — Administracao formal da Comissao CESAD e rollover de competencia

## Status

Aceita / Decisao arquitetural registrada.

Esta ADR registra a decisao arquitetural para a frente `BE-CESAD-REG-01 — Cadastro e gerenciamento formal de comissoes CESAD`.

Nao ha alteracao de codigo, schema, migrations, contracts, frontend, seed ou testes nesta ADR.

---

## Contexto

O SADEP ja possui base de dominio para a Comissao CESAD: comissao, atos, membros titulares/suplentes, leitura da comissao vigente, `CesadStageAssignment`, expected signers e assinatura colegiada.

A estrutura atual permite leitura e uso processual, mas ainda nao permite administracao completa da comissao. A frente `BE-CESAD-REG-01` documenta a necessidade de cadastrar, manter, encerrar e auditar comissoes, atos e membros.

A decisao e sensivel porque mudancas de comissao afetam processos em andamento, pareceres em elaboracao, documentos ainda nao assinados integralmente e assignments historicos.

---

## Problema

A comissao CESAD nao pode ser tratada como CRUD simples.

Riscos de uma implementacao simples:

- vigencias sobrepostas;
- assistente cadastrado como membro formal;
- alteracao retroativa de comissao ja usada;
- troca invisivel de assignment historica;
- documento parcialmente assinado por comissao anterior produzindo efeito final apos fim da vigencia;
- reescrita de ato colegiado ja consolidado.

---

## Decisao

O SADEP adotara administracao formal por vigencia, com preservacao de atos consolidados e substituicao explicita de atos preparatorios.

Regras arquiteturais:

1. A comissao vigente sera resolvida por data de referencia.
2. Uma comissao futura pode ser cadastrada antes de `effectiveStartDate`, mas nao sera resolvida como atual antes da vigencia.
3. Nao depender de job ou cron para ativar comissao futura; a resolucao deve ser temporal.
4. `ADMIN` e `HOMOLOGATION_AUTHORITY` podem cadastrar e manter comissoes.
5. `COMMISSION_ASSISTANT` nao pode ser membro formal.
6. Composicao minima: 3 titulares e 2 suplentes.
7. Vigencias sobrepostas devem ser bloqueadas.
8. Se a comissao anterior nao tiver data fim, nova comissao posterior deve encerrar a anterior em D-1.
9. Atos consolidados permanecem validos e historicos.
10. Atos preparatorios podem ser substituidos pela comissao vigente.
11. `CesadStageAssignment` historica nao deve ser sobrescrita invisivelmente.
12. Alteracoes estruturais em comissao ja usada devem ser bloqueadas ou tratadas por fluxo formal futuro.

---

## Situacao temporal da comissao

| Situacao | Regra |
|---|---|
| Futura / agendada | `effectiveStartDate` maior que a data de referencia. |
| Vigente / atual | `effectiveStartDate` menor ou igual a data de referencia e `effectiveEndDate` nula ou maior/igual a data de referencia. |
| Encerrada | `effectiveEndDate` menor que a data de referencia. |
| Supersedida | Substituida formalmente por nova comissao sem reescrever atos consolidados. |
| Inativa | Cancelada/desativada por decisao administrativa ou erro de cadastro. |

O enum persistido pode continuar existindo, mas a situacao operacional deve considerar as datas.

---

## Portaria e composicao

O cadastro deve conter dados do ato formal: tipo, numero, ano, assinatura, publicacao, inicio de vigencia, fim de vigencia e referencia textual quando houver.

A composicao minima e de 3 titulares e 2 suplentes. Quantidade maior deve ser permitida quando o ato formal indicar.

Membros devem ser usuarios existentes e compativeis com atuacao CESAD. O assistente da comissao e perfil operacional de apoio e nao integra a composicao formal.

---

## Vigencia e conflito

Nao pode haver mais de uma comissao vigente para a mesma data.

Se houver conflito de periodo, o cadastro ou alteracao deve ser bloqueado com erro claro.

Quando uma comissao anterior estiver sem data fim e uma nova comissao posterior for cadastrada, a anterior deve receber fim no dia imediatamente anterior ao inicio da nova.

Nova comissao nao deve reescrever passado nem invalidar atos ja praticados.

---

## Atos preparatorios e consolidados

Um parecer CESAD e considerado consolidado somente quando o documento esta `SIGNED` e todas as assinaturas esperadas estao `COMPLETED`.

Parecer em rascunho, parecer funcional sem documento integralmente assinado, documento `READY_FOR_SIGNATURE` e documento parcialmente assinado sao atos preparatorios.

Se a comissao perder vigencia antes da consolidacao, o ato anterior permanece como referencia, mas a comissao vigente deve poder elaborar novo parecer valido, com novos expected signers.

---

## Rollover de competencia

| Situacao | Comissao competente |
|---|---|
| Sem parecer iniciado | Comissao vigente na data da analise. |
| Parecer iniciado, mas nao assinado integralmente | Nova comissao vigente pode substituir o ato preparatorio. |
| Parecer/documento assinado integralmente | Comissao que consolidou o ato permanece autora valida. |
| Documento pendente de assinatura com mudanca de comissao | Documento pode ser supersedado em favor de novo ato da comissao vigente. |

O rollover deve ser explicito, auditavel e sem sobrescrever assignment historica.

---

## Relacao com CesadStageAssignment

`CesadStageAssignment` permanece como registro historico do vinculo entre comissao, processo e etapa.

Se o ato ainda nao foi consolidado e a comissao perdeu vigencia, uma nova assignment pode ser criada para a comissao vigente. A anterior permanece como referencia historica.

---

## Auditoria

A implementacao futura deve auditar criacao, alteracao, encerramento, supersessao, inclusao/encerramento de membro, registro de ato e rollover.

Metadata esperada: executor, perfil, data/hora, comissao, ato relacionado, membros afetados, vigencia anterior e nova, motivo e indicador de uso processual.

---

## Alternativas consideradas

### CRUD simples

Descartado porque nao protege vigencia, historico e documentos.

### Status persistido como unica fonte de competencia

Descartado porque comissao futura pode estar cadastrada mas ainda nao vigente.

### Assignment original sempre competente

Descartado para atos preparatorios, pois a regra institucional e que a comissao vigente assume processos sem ato consolidado.

### Rollover explicito de atos preparatorios

Adotado. Preserva atos consolidados e permite continuidade administrativa.

---

## Consequencias

Beneficios:

- protege vigencia;
- preserva atos consolidados;
- permite continuidade dos processos;
- evita reescrita historica;
- separa assistente de membro formal;
- cria base para frontend administrativo.

Custos:

- implementacao deve ser fatiada;
- rollover afeta documentos, expected signers e assinaturas;
- testes precisam cobrir calendario, vigencia e documentos pendentes.

---

## Fatiamento recomendado

- `BE-CESAD-REG-01A`: contratos de dominio, payloads e eventos.
- `BE-CESAD-REG-01B`: criacao de comissao com ato e composicao inicial.
- `BE-CESAD-REG-01C`: edicao controlada de comissao ainda nao usada.
- `BE-CESAD-REG-01D`: encerramento e supersessao.
- `BE-CESAD-REG-01E`: rollover de processos em andamento.
- `BE-CESAD-REG-01F`: seed local minimo.
- `FE-CESAD-COMISSAO-01`: frontend administrativo apos contracts backend.

---

## Fora do escopo

Esta ADR nao implementa endpoints, schema, migrations, contracts, frontend, seed, assinatura CESAD, homologacao, notificacao ou ciencia.
