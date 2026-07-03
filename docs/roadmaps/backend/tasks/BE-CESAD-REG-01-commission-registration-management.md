# BE-CESAD-REG-01 — Cadastro e gerenciamento formal de comissoes CESAD

## Status

Concluida / estabilizada / aprovada com ressalvas futuras.

## Atualizacao de fechamento

- **Data de sincronizacao:** 2026-07-03.
- **Issue guarda-chuva:** `#58`.
- **PRs relacionados:** `#68`, `#69`, `#70`, `#71`, `#72`, `#74`, `#78`.
- **ADRs relacionadas:**
  - [`ADR-006 — Administracao formal da Comissao CESAD e rollover de competencia`](../../../architecture/adr/adr-006-cesad-commission-management-and-rollover.md)
  - [`ADR-007 — Supersessao de parecer CESAD de etapa`](../../../architecture/adr/adr-007-cesad-stage-opinion-supersession.md)

Esta frente saiu do estado de especificacao e foi entregue no backend no recorte de cadastro formal, edicao controlada, encerramento/supersessao, seed local, rollover de processos em andamento e supersessao de parecer preparatorio.

Lacunas remanescentes nao reabrem este guarda-chuva. Elas devem nascer como tasks especificas.

## Area

Backend, dominio CESAD, comissoes, atos/portarias, membros, vigencia, autorizacao, auditoria e preservacao historica de processos.

## Decisao principal preservada

A administracao da comissao CESAD nao deve ser tratada como CRUD simples. O cadastro deve preservar competencia temporal, dados formais de portaria, composicao, impedimento de vigencia sobreposta, continuidade de processos em andamento, atos consolidados, substituicao de atos preparatorios e auditoria.

## Escopo entregue

### Cadastro formal de comissao

- Criacao de comissao CESAD com dados formais de vigencia.
- Registro de ato designativo/portaria associado.
- Composicao inicial com titulares e suplentes.
- Composicao minima de 3 titulares e 2 suplentes.
- Validacao de usuario existente/ativo.
- Bloqueio de `COMMISSION_ASSISTANT` como membro formal.
- Bloqueio de vigencia sobreposta.
- Encerramento automatico de comissao anterior sem data fim quando nova comissao posterior e cadastrada.

### Edicao controlada

- Edicao de comissao ainda nao utilizada em processo.
- Bloqueio de alteracoes estruturais quando a comissao ja possui uso em `CesadStageAssignment`.
- Preservacao historica de atos e composicao em cenarios ja utilizados.

### Encerramento e supersessao

- Encerramento formal de comissao.
- Supersessao formal de comissao.
- Preservacao de historico e bloqueios quando houver processo/assignment que exige tratamento por rollover.
- Auditoria administrativa dos atos relevantes.

### Auditoria administrativa

- Criacao de trilha propria `CesadCommissionAuditEvent`.
- Registro de criacao, alteracao, encerramento, supersessao, registro de ato e inclusao de membro.
- Preservacao de eventos process-bound separados quando o evento pertence a processo/etapa.

### Seed local

- Seed local minimo para comissao CESAD vigente.
- Apoio a validacao local da tela administrativa e dos fluxos de comissao.

### Rollover e preservacao historica

- Rollover de processos em andamento quando ainda nao ha parecer CESAD iniciado.
- Supersessao de parecer CESAD preparatorio.
- Preservacao da assignment anterior como historica.
- Criacao de nova assignment ativa para a comissao vigente quando aplicavel.
- Bloqueio de cenarios com documento `SIGNED` e assinaturas completas.
- Bloqueio/deferimento de cenarios com documento pronto para assinatura ou parcialmente assinado quando dependem de supersessao documental mais ampla.

## Regras preservadas

### Status e vigencia

A situacao operacional deve ser derivada principalmente das datas de vigencia.

| Situacao | Regra |
|---|---|
| Futura / agendada | `effectiveStartDate` maior que a data de referencia. |
| Vigente / atual | `effectiveStartDate` menor ou igual a data de referencia e `effectiveEndDate` nula ou maior/igual a data de referencia. |
| Encerrada | `effectiveEndDate` menor que a data de referencia. |
| Supersedida | Substituida formalmente por nova comissao, sem reescrever atos historicos consolidados. |
| Inativa | Cancelada/desativada por ato administrativo, erro de cadastro ou decisao expressa. |

Uma comissao pode ser cadastrada antes do inicio da vigencia. Ela nao deve ser resolvida como comissao atual antes de `effectiveStartDate`. A partir dessa data, se nao houver conflito, passa a ser a comissao vigente. A implementacao nao depende de job ou cron para ativacao.

### Perfis autorizados

Podem cadastrar e manter comissoes: `ADMIN` e `HOMOLOGATION_AUTHORITY`.

Nao podem cadastrar ou manter comissoes: `CESAD_MEMBER`, `COMMISSION_ASSISTANT`, `IMMEDIATE_SUPERVISOR` e `INTERN_SERVER`.

A autoridade homologadora pode manter a estrutura da comissao, mas isso nao a torna membro CESAD nem autorizada a praticar atos colegiados.

A leitura administrativa de comissoes esta alinhada para `ADMIN` e `HOMOLOGATION_AUTHORITY`.

### Portaria / ato formal

O cadastro deve conter dados da portaria ou ato formal: tipo, numero, ano, assinatura, publicacao quando houver, inicio da vigencia, fim da vigencia e resumo/referencia textual quando houver.

### Composicao minima

A comissao deve possuir no minimo 3 titulares e 2 suplentes. Quantitativo maior e permitido conforme portaria.

Regras:

- membros devem ser usuarios existentes;
- membros titulares/suplentes devem ter perfil compativel com atuacao CESAD;
- `COMMISSION_ASSISTANT` nao pode ser membro formal;
- assistente e perfil operacional, nao integrante da comissao;
- usuario nao deve ser titular e suplente simultaneamente na mesma comissao para o mesmo intervalo;
- vigencia do membro deve estar dentro da vigencia da comissao.

### Vigencia e conflito temporal

Nao pode haver vigencia sobreposta entre comissoes capazes de serem resolvidas como vigentes para a mesma data.

Se houver conflito, bloquear com mensagem clara: a vigencia informada conflita com outra comissao CESAD ja cadastrada e o periodo deve ser alterado.

Quando uma comissao anterior possui `effectiveEndDate = null` e nova comissao posterior e cadastrada, a anterior deve ser encerrada em `effectiveStartDate da nova comissao - 1 dia`.

### Competencia sobre processos em andamento

Processos em andamento sao assumidos pela comissao que se torna vigente quando ainda nao houver parecer CESAD consolidado. A comissao vigente pode acessar processo, avaliacao da chefia, autoavaliacao, historico e documentos necessarios.

A comissao anterior nao deve continuar praticando novos atos se sua vigencia terminou.

### Atos preparatorios e atos consolidados

A mudanca de comissao afeta atos preparatorios, mas nao reescreve atos consolidados.

Um parecer CESAD e consolidado quando o documento correspondente estiver `SIGNED`, todas as assinaturas esperadas estiverem `COMPLETED` e o ato colegiado estiver documentalmente completo.

Parecer funcional iniciado, rascunho, documento pronto para assinatura ou documento parcialmente assinado sao atos preparatorios. Se a vigencia terminar antes da assinatura colegiada completa, o parecer/documento anterior permanece como referencia historica e pode ser supersedido conforme regra propria.

## Tasks filhas

| Task | Documento | Estado consolidado |
|---|---|---|
| `BE-CESAD-REG-01A` | [`BE-CESAD-REG-01A-domain-contracts-events.md`](./BE-CESAD-REG-01A-domain-contracts-events.md) | Concluida. |
| `BE-CESAD-REG-01B` | [`BE-CESAD-REG-01B-create-commission-with-act-and-members.md`](./BE-CESAD-REG-01B-create-commission-with-act-and-members.md) | Concluida. |
| `BE-CESAD-REG-01C` | [`BE-CESAD-REG-01C-edit-unused-commission.md`](./BE-CESAD-REG-01C-edit-unused-commission.md) | Concluida. |
| `BE-CESAD-REG-01D` | [`BE-CESAD-REG-01D-close-supersede-commission.md`](./BE-CESAD-REG-01D-close-supersede-commission.md) | Concluida com ressalva de DTO formal futuro. |
| `BE-CESAD-REG-01E` | [`BE-CESAD-REG-01E-rollover-in-progress-processes.md`](./BE-CESAD-REG-01E-rollover-in-progress-processes.md) | Concluida no recorte sem parecer iniciado e com parecer preparatorio supersedido. |
| `BE-CESAD-REG-01F` | [`BE-CESAD-REG-01F-local-seed-current-commission.md`](./BE-CESAD-REG-01F-local-seed-current-commission.md) | Concluida. |
| `FE-CESAD-COMISSAO-01` | [`../../frontend/tasks/FE-CESAD-COMISSAO-01-admin-ui.md`](../../frontend/tasks/FE-CESAD-COMISSAO-01-admin-ui.md) | Concluida no recorte de leitura real; CRUD fica para task futura. |

## Lacunas futuras

As lacunas abaixo devem ser tratadas como novas tasks, nao como reabertura de `BE-CESAD-REG-01`:

| Task futura | Objetivo |
|---|---|
| `BE-CESAD-COMISSAO-CLOSE-DTO-01` | Formalizar payload de encerramento/supersessao com motivo, data administrativa, metadados de auditoria e referencia a sucessora quando aplicavel. |
| `CONTRACT-CESAD-COMMISSION-WRITE-01` | Exportar payloads de escrita de comissao CESAD pelo pacote `@sadep/contracts`. |
| `FE-CESAD-COMISSAO-CRUD-02` | Conectar criacao, edicao, encerramento e supersessao pela interface administrativa. |
| `DOC-CESAD-COMISSAO-CLOSEOUT` | Opcional: consolidar um fechamento narrativo completo da frente, se necessario para gestao do projeto. |

## Fora do escopo preservado

Nao foram entregues nesta frente, e nao devem ser inferidos como concluidos:

- CRUD funcional completo da interface administrativa;
- payloads de escrita exportados pelo pacote contracts;
- DTO formal rico para encerramento/supersessao;
- assinatura externa GOVBR real;
- PDF real de portaria/ato;
- versionamento documental amplo para todos os estados de assinatura;
- substituicao formal de signatario apos assinatura aberta;
- fechamento definitivo de recursos ou encerramento final do processo.

## Criterios de aceite consolidados

A frente e considerada concluida porque passou a permitir cadastro formal de comissao com ato, exigir composicao minima, impedir assistente como membro formal, impedir vigencia sobreposta, encerrar comissao anterior sem data fim quando nova comissao posterior e cadastrada, resolver comissao atual por data, impedir alteracao estrutural retroativa de comissao usada, preservar atos consolidados, tratar rollover de atos preparatorios no recorte implementado e auditar atos administrativos relevantes.

## Proxima acao

Nao executar nova implementacao dentro de `BE-CESAD-REG-01`.

As proximas evolucoes devem ser abertas como tasks pequenas e independentes, principalmente:

1. `FE-CESAD-COMISSAO-CRUD-02`.
2. `CONTRACT-CESAD-COMMISSION-WRITE-01`.
3. `BE-CESAD-COMISSAO-CLOSE-DTO-01`.
