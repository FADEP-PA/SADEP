# BE-CESAD-REG-01 — Cadastro e gerenciamento formal de comissoes CESAD

## Status

Documentada / pronta para fatiamento tecnico.

## Area

Backend, dominio CESAD, comissoes, atos/portarias, membros, vigencia, autorizacao, auditoria e preservacao historica de processos.

## Contexto

O SADEP ja possui base de leitura para comissoes CESAD: leitura da comissao atual por data de referencia, listagem de comissoes, consulta de atos, consulta de membros, uso processual em `CesadStageAssignment`, autorizacao contextual CESAD e derivacao de expected signers para pareceres.

A estrutura atual permanece essencialmente read-only para administracao da comissao. Ainda falta fluxo backend completo para cadastrar, alterar, encerrar ou superseder formalmente comissoes, atos/portarias e composicao titular/suplente.

## Decisao principal

A administracao da comissao CESAD nao deve ser tratada como CRUD simples. O cadastro deve preservar competencia temporal, dados formais de portaria, composicao, impedimento de vigencia sobreposta, continuidade de processos em andamento, atos consolidados, substituicao de atos preparatorios e auditoria.

## ADR relacionada

- [`ADR-006 — Administracao formal da Comissao CESAD e rollover de competencia`](../../../architecture/adr/adr-006-cesad-commission-management-and-rollover.md)

## Status e vigencia

A situacao operacional deve ser derivada principalmente das datas de vigencia.

| Situacao | Regra |
|---|---|
| Futura / agendada | `effectiveStartDate` maior que a data de referencia. |
| Vigente / atual | `effectiveStartDate` menor ou igual a data de referencia e `effectiveEndDate` nula ou maior/igual a data de referencia. |
| Encerrada | `effectiveEndDate` menor que a data de referencia. |
| Supersedida | Substituida formalmente por nova comissao, sem reescrever atos historicos consolidados. |
| Inativa | Cancelada/desativada por ato administrativo, erro de cadastro ou decisao expressa. |

Uma comissao pode ser cadastrada antes do inicio da vigencia. Ela nao deve ser resolvida como comissao atual antes de `effectiveStartDate`. A partir dessa data, se nao houver conflito, passa a ser a comissao vigente. A implementacao deve evitar depender de job ou cron para ativacao.

## Perfis autorizados

Podem cadastrar e manter comissoes: `ADMIN` e `HOMOLOGATION_AUTHORITY`.

Nao podem cadastrar ou manter comissoes: `CESAD_MEMBER`, `COMMISSION_ASSISTANT`, `IMMEDIATE_SUPERVISOR` e `INTERN_SERVER`.

A autoridade homologadora pode manter a estrutura da comissao, mas isso nao a torna membro CESAD nem autorizada a praticar atos colegiados.

## Portaria / ato formal

O cadastro deve conter dados da portaria ou ato formal: tipo, numero, ano, assinatura, publicacao, inicio da vigencia, fim da vigencia e resumo/referencia textual quando houver. Nao ha necessidade de fluxo separado de ativacao por ato.

## Composicao minima

A comissao deve possuir no minimo 3 titulares e 2 suplentes. Quantitativo maior e permitido conforme portaria.

Regras:

- membros devem ser usuarios existentes;
- membros titulares/suplentes devem ter perfil compativel com atuacao CESAD;
- `COMMISSION_ASSISTANT` nao pode ser membro formal;
- assistente e perfil operacional, nao integrante da comissao;
- usuario nao deve ser titular e suplente simultaneamente na mesma comissao para o mesmo intervalo;
- vigencia do membro deve estar dentro da vigencia da comissao.

## Vigencia e conflito temporal

Nao pode haver vigencia sobreposta entre comissoes capazes de serem resolvidas como vigentes para a mesma data.

Se houver conflito, bloquear com mensagem clara: a vigencia informada conflita com outra comissao CESAD ja cadastrada e o periodo deve ser alterado.

### Comissao anterior sem data fim

Uma comissao pode ter `effectiveEndDate = null`. Quando nova comissao posterior for cadastrada, a comissao anterior sem data fim deve ser encerrada em `effectiveStartDate da nova comissao - 1 dia`.

Exemplo: Comissao A inicia em 2026-01-01 sem fim. Comissao B inicia em 2026-07-01. Resultado: Comissao A termina em 2026-06-30 e Comissao B vigora a partir de 2026-07-01.

Nova comissao nao deve iniciar antes da comissao vigente quando isso produzir reescrita historica ou conflito com atos ja praticados.

## Competencia sobre processos em andamento

Processos em andamento sao assumidos pela comissao que se torna vigente quando ainda nao houver parecer CESAD consolidado. A comissao vigente pode acessar processo, avaliacao da chefia, autoavaliacao, historico e documentos necessarios.

A comissao anterior nao deve continuar praticando novos atos se sua vigencia terminou.

## Atos preparatorios e atos consolidados

A mudanca de comissao afeta atos preparatorios, mas nao reescreve atos consolidados.

Um parecer CESAD e consolidado quando o documento correspondente estiver `SIGNED`, todas as assinaturas esperadas estiverem `COMPLETED` e o ato colegiado estiver documentalmente completo.

Parecer funcional iniciado, rascunho, documento `READY_FOR_SIGNATURE` ou documento parcialmente assinado sao atos preparatorios. Se a vigencia terminar antes da assinatura colegiada completa, o parecer/documento anterior permanece como referencia historica, mas deve ser supersedado/invalidado conforme modelagem futura; assinaturas pendentes nao devem consolidar ato antigo; a comissao vigente deve elaborar novo parecer valido.

## Rollover de comissao

A substituicao da comissao vigente durante processo em andamento deve ser tratada em frente propria, pois impacta assignments, documentos e assinaturas.

| Situacao do processo/etapa | Comissao competente |
|---|---|
| Sem parecer iniciado | Comissao vigente na data da analise. |
| Parecer iniciado, mas nao assinado integralmente | Nova comissao vigente pode substituir o ato preparatorio. |
| Parecer/documento `SIGNED` com assinaturas completas | Comissao que consolidou o ato permanece autora valida. |
| Documento `READY_FOR_SIGNATURE` com mudanca de comissao | Documento pode ser supersedado em favor de novo ato da comissao vigente. |

A implementacao deve evitar troca invisivel e sem auditoria.

## Relacao com CesadStageAssignment

`CesadStageAssignment` registra vinculo entre comissao, processo e etapa. Assignments historicos devem preservar a comissao que iniciou determinado ato. Se o ato ainda nao foi consolidado e a comissao deixou de ser vigente, nova assignment pode ser necessaria para a comissao atual. A assignment anterior permanece como referencia historica, nao deve ser sobrescrita.

## Edicao de comissao usada

Se uma comissao ja foi usada em `CesadStageAssignment`, bloquear alteracoes estruturais retroativas: vigencia, membros, status ou ato/portaria principal que alterem competencia, composicao ou validade de atos praticados. Correcoes textuais nao estruturais podem ser tratadas em task futura com auditoria.

## Auditoria esperada

Atos administrativos relevantes devem ser auditados: criacao, alteracao, encerramento, supersessao, inclusao/encerramento de membro, registro de ato e rollover.

Metadata minima: usuario executor, perfil, data/hora, comissao, ato/portaria, membros afetados, vigencia anterior/nova, motivo e indicador de uso processual. Nao gravar textos longos ou dados pessoais desnecessarios.

## Tasks filhas

| Task | Documento | Objetivo |
|---|---|---|
| `BE-CESAD-REG-01A` | [`BE-CESAD-REG-01A-domain-contracts-events.md`](./BE-CESAD-REG-01A-domain-contracts-events.md) | Contratos de dominio, payloads, eventos e varredura tecnica. |
| `BE-CESAD-REG-01B` | [`BE-CESAD-REG-01B-create-commission-with-act-and-members.md`](./BE-CESAD-REG-01B-create-commission-with-act-and-members.md) | Criar comissao com ato/portaria e composicao inicial. |
| `BE-CESAD-REG-01C` | [`BE-CESAD-REG-01C-edit-unused-commission.md`](./BE-CESAD-REG-01C-edit-unused-commission.md) | Editar comissao ainda nao utilizada em processo. |
| `BE-CESAD-REG-01D` | [`BE-CESAD-REG-01D-close-supersede-commission.md`](./BE-CESAD-REG-01D-close-supersede-commission.md) | Encerrar ou superseder comissao. |
| `BE-CESAD-REG-01E` | [`BE-CESAD-REG-01E-rollover-in-progress-processes.md`](./BE-CESAD-REG-01E-rollover-in-progress-processes.md) | Rollover de processos em andamento. |
| `BE-CESAD-REG-01F` | [`BE-CESAD-REG-01F-local-seed-current-commission.md`](./BE-CESAD-REG-01F-local-seed-current-commission.md) | Seed local minimo de comissao vigente. |
| `FE-CESAD-COMISSAO-01` | [`../../frontend/tasks/FE-CESAD-COMISSAO-01-admin-ui.md`](../../frontend/tasks/FE-CESAD-COMISSAO-01-admin-ui.md) | Interface administrativa apos contracts backend. |

## Ordem recomendada

1. `BE-CESAD-REG-01A`.
2. `BE-CESAD-REG-01B`.
3. `BE-CESAD-REG-01C` e `BE-CESAD-REG-01D`, coordenadas.
4. `BE-CESAD-REG-01F`.
5. `FE-CESAD-COMISSAO-01`, com backend minimo disponivel.
6. `BE-CESAD-REG-01E`, por ser a fatia de maior risco.

## Fora do escopo desta task documental

Nao implementar endpoints, alterar Prisma schema, criar migrations, alterar contracts, frontend, seed, autorizacao contextual existente, rollover automatico, assinatura CESAD, homologacao, notificacao ou ciencia.

## Criterios de aceite futuros

A implementacao futura sera adequada se permitir cadastro formal de comissao com portaria, exigir 3 titulares e 2 suplentes, impedir assistente como membro formal, impedir vigencia sobreposta, encerrar comissao anterior sem data fim quando nova comissao posterior for cadastrada, resolver comissao atual por data, impedir alteracao estrutural retroativa de comissao usada, preservar atos consolidados, substituir apenas atos preparatorios e auditar atos administrativos relevantes.

## Proxima acao

Executar `BE-CESAD-REG-01A` antes de iniciar implementacao funcional. Depois distribuir `01B`, `01C`, `01D`, `01F` e `FE-CESAD-COMISSAO-01` conforme dependencias e riscos.
