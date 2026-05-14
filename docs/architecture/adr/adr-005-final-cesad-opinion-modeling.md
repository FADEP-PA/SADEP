# ADR-005 — Modelagem do parecer conclusivo final da CESAD

## Status

Aceita / Decisao arquitetural registrada.

Esta ADR registra a decisao arquitetural para `BE-CESAD-FINAL-01 — Modelar parecer conclusivo final da CESAD`.

Ela nao implementa codigo, nao altera schema Prisma, nao cria migration, nao altera contracts, testes, frontend, seeds ou roadmaps operacionais alem da atualizacao do indice de ADRs quando necessario.

---

## Contexto

O SADEP e um sistema processual orientado a estados. No Caso 2, o processo administrativo unico possui quatro etapas avaliativas internas, cada uma com ciclo documental proprio e parecer CESAD de etapa. A ADR-004 consolidou a materializacao das quatro etapas, o lifecycle derivado de `startedAt`/`endedAt` e a acao `COMPLETE_CURRENT_STAGE`. A `BE-FLOW-4STAGE-01B` entregou a conclusao formal das etapas, mantendo o processo em `PARECER_EMITIDO` apos a quarta etapa, sem etapa ativa e sem parecer conclusivo final criado automaticamente.

A varredura decisoria de `BE-CESAD-FINAL-01` confirmou que:

- nao existe artefato funcional do parecer conclusivo final;
- `CesadStageOpinion` e estruturalmente stage-bound por `processStageId` unico, tratado em multiplos services como invariante 1:1 etapa-parecer;
- `CesadStageOpinionExpectedSigner` e a trilha de assinatura colegiada de `BE-DOC-CESAD-SIGN-01` operam exclusivamente sobre o parecer de etapa;
- `ProcessDocument` ja possui `DocumentType.CESAD_OPINION`, mas nao possui discriminador de escopo;
- o catalogo documental oficial (`docs/domain/document-modeling-catalog.md`) prescreve que parecer de etapa e parecer final compartilham `documentType = CESAD_OPINION` e sao diferenciados por `opinionKind = STAGE | FINAL_CONCLUSIVE`;
- apos a etapa 4 concluida o resolver operacional de etapa atual falha, exigindo leitura/consolidacao historica process-wide.

Sem decisao arquitetural explicita, qualquer implementacao corre o risco de reabrir codigo auditado de pareceres de etapa ou de inflar o macrostatus do processo.

---

## Decisao

O SADEP adotara, para o parecer conclusivo final da CESAD, a estrategia de **entidade funcional propria**:

- `CesadFinalOpinion` sera criada como entidade autonoma vinculada ao processo, sem vinculo a etapa;
- `CesadStageOpinion` permanece exclusivamente como parecer CESAD de etapa, sem alteracao estrutural;
- no plano documental, o parecer final reusara `DocumentType.CESAD_OPINION`, com `processStageId = null` e novo campo discriminador `opinionKind = FINAL_CONCLUSIVE`;
- o parecer de etapa passara a ter `opinionKind = STAGE` no documento correspondente;
- o parecer final tera ciclo proprio de elaboracao, conclusao, documento processual e assinatura colegiada, com expected signers proprios em `CesadFinalOpinionExpectedSigner`;
- a frente sera dividida em tres subtasks incrementais, e `SEND_TO_HOMOLOGATION`, quando implementada, sera apenas ponte formal para `BE-HOMOLOG-01`, sem homologar, notificar, registrar ciencia ou publicar portaria.

---

## Alternativas consideradas

### Alternativa A — Reusar `CesadStageOpinion`

Exigiria tornar `processStageId` nullable, remover ou substituir a unique por `processStageId`, adicionar `opinionKind` na propria entidade e revisar todas as queries `findUnique({ where: { processStageId } })` e helpers de leitura/escrita ja auditados em `BE-DOC-CESAD-SIGN-01` e `BE-FLOW-4STAGE-01B`.

Vantagens:

- uma unica entidade conceitual;
- reuso direto da trilha de expected signers e assinatura.

Riscos:

- refatoracao intrusiva em codigo auditado e estavel;
- migration destrutiva (alteracao de coluna e unique em SQLite);
- alto risco de regressao em pareceres de etapa ja funcionais;
- quebra de invariante 1:1 etapa-parecer assumida em multiplos pontos do dominio.

Conclusao: descartada pelo alto risco e pelo blast radius desproporcional ao incremento desejado.

### Alternativa B — Generalizar para `CesadOpinion`

Renomear `CesadStageOpinion` para `CesadOpinion`, tornar `processStageId` nullable, adicionar `opinionKind` e propagar a renomeacao em entidades dependentes (`CesadStageOpinionExpectedSigner`, FKs em `SignatureRecord`, enums de auditoria `CESAD_STAGE_OPINION_*`, contracts e testes).

Vantagens:

- modelo conceitual mais limpo;
- alinhamento conceitual com o catalogo documental ao nivel de entidade.

Riscos:

- renomeacao ampla em schema, services, contracts, eventos de auditoria e testes;
- migration de alto risco em SQLite;
- impacto colateral em snapshots ja consumidos pelo frontend;
- frente que deveria ser incremental se transforma em refatoracao estrutural.

Conclusao: descartada neste momento por blast radius excessivo. Pode ser reconsiderada em frente propria futura de consolidacao conceitual, sem dependencia desta task.

### Alternativa C — Criar `CesadFinalOpinion` proprio

Adicionar uma nova entidade autonoma `CesadFinalOpinion`, vinculada ao processo e nao a etapa, com expected signers proprios em `CesadFinalOpinionExpectedSigner` e ciclo documental dedicado. Diferenciacao de escopo no plano documental por novo campo `opinionKind` em `ProcessDocument`, alinhado ao catalogo oficial.

Vantagens:

- alteracoes aditivas em schema e migrations;
- preserva integralmente o dominio estavel dos pareceres de etapa;
- explicita que o parecer final e ato processual consolidado posterior, e nao mais um parecer de etapa;
- aderente ao principio do `workflow-engine-skill` de manter macrostatus enxuto e detalhar em camada complementar;
- permite divisao incremental em subtasks auditaveis.

Custos:

- duas entidades funcionais coexistem (stage e final), com duplicacao controlada da trilha de expected signers e dos campos de redacao;
- ligeira sobreposicao conceitual entre o catalogo (que sugere `CesadOpinion` unificado) e o dominio (que mantem duas entidades), mitigada pelo discriminador `opinionKind` no documento.

Conclusao: **decisao adotada**. Permite cumprir a doutrina documental do catalogo sem desestabilizar o dominio funcional auditado dos pareceres de etapa.

---

## Consequencias

Consequencias positivas:

- preserva inteiramente o que ja foi entregue em `BE-DOC-CESAD-SIGN-01` e `BE-FLOW-4STAGE-01`;
- evita refatoracao destrutiva de schema e migrations em area auditada;
- explicita o parecer final como ato consolidado distinto;
- permite incremento controlado em tres subtasks;
- mantem aderencia ao catalogo documental oficial pelo plano documental.

Custos e trade-offs:

- duas entidades funcionais (`CesadStageOpinion` e `CesadFinalOpinion`) coexistem com estruturas parecidas;
- exige introducao do campo `opinionKind` em `ProcessDocument` e backfill controlado em documentos existentes;
- exige variante process-wide do servico de autorizacao contextual CESAD, sem reusar exclusivamente o vinculo por etapa;
- exige novo servico de leitura/consolidacao historica das quatro etapas, distinto de `CesadStageReadService`.

Risco residual:

- garantia de unicidade "um parecer final por processo" deve ser assegurada pela camada de service e pelo proprio modelo, ja que em SQLite `NULL` em unique composta nao colide.

---

## Entidade funcional adotada

A entidade funcional do parecer conclusivo final sera `CesadFinalOpinion`.

Caracteristicas estruturais previstas em implementacao futura:

- vinculo direto com `EvaluationProcess` (processo, sem etapa);
- autor `CESAD_MEMBER`;
- campos de redacao consolidada (relatorio, fundamento legal, conclusao final);
- campos consolidados do resultado final (conceito final, resultado final, pontuacao geral quando aplicavel);
- ciclo de estados `DRAFT` e `COMPLETED`, espelhando o padrao ja consolidado em `CesadStageOpinion`;
- relacionamento com `CesadFinalOpinionExpectedSigner` proprio.

`CesadStageOpinion` permanece sem alteracao estrutural e continua sendo exclusivamente o parecer CESAD de etapa.

---

## Documento processual adotado

O parecer final usara `ProcessDocument` com:

- `documentType = CESAD_OPINION`;
- `processStageId = null`;
- `opinionKind = FINAL_CONCLUSIVE`.

Pareceres CESAD de etapa passarao a usar:

- `documentType = CESAD_OPINION`;
- `processStageId` preenchido com a etapa correspondente;
- `opinionKind = STAGE`.

Esta combinacao implementa a doutrina ja registrada em `docs/domain/document-modeling-catalog.md` (sec. 7.3 e 7.4), preservando uma unica tipologia documental para pareceres da comissao e diferenciando o escopo por campo proprio.

---

## Uso de `opinionKind`

Sera introduzido um novo campo discriminador `opinionKind` em `ProcessDocument`, com valores `STAGE` e `FINAL_CONCLUSIVE`.

Regras de uso:

- `opinionKind` so e significativo quando `documentType = CESAD_OPINION`;
- documentos `CESAD_OPINION` stage-bound recebem `opinionKind = STAGE` e `processStageId` preenchido;
- o documento `CESAD_OPINION` do parecer final recebe `opinionKind = FINAL_CONCLUSIVE` e `processStageId = null`;
- documentos de outras tipologias permanecem com `opinionKind` nao significativo;
- o backfill controlado dos documentos `CESAD_OPINION` existentes deve marcar `opinionKind = STAGE` para garantir consistencia historica.

A unicidade de "um documento final por processo" sera garantida pela camada de service e podera ser reforcada por constraint futura adequada, conforme a evolucao do schema permitir.

---

## Elegibilidade do parecer final

O parecer final so podera ser iniciado quando, no minimo:

- o processo existir;
- o processo estiver em `PARECER_EMITIDO`;
- existirem quatro etapas materializadas;
- as quatro etapas estiverem concluidas, com `startedAt` e `endedAt` definidos;
- nao houver etapa ativa;
- cada etapa possuir parecer CESAD funcional concluido em `CesadStageOpinion`;
- cada etapa possuir documento `CESAD_OPINION` stage-bound em `SIGNED`.

A elegibilidade reflete a base entregue por `BE-FLOW-4STAGE-01B`, em que `COMPLETE_CURRENT_STAGE` da etapa 4 ja exige completude documental. A verificacao na criacao do parecer final permanece como reforco defensivo.

---

## Fonte de consolidacao historica

A leitura do parecer final sera process-wide, baseada nas quatro etapas concluidas e ordenadas por `sequence`.

Regras de leitura:

- nao usar `resolveCurrentStageOrThrow`, pois nao existira etapa ativa apos a etapa 4;
- sera criado servico de leitura proprio para o parecer final, distinto de `CesadStageReadService`;
- o servico de leitura podera reaproveitar internamente os helpers existentes para leitura de etapa, sem inflar o servico de leitura de etapa atual;
- a leitura consolidara metadados das quatro etapas, pareceres de etapa concluidos e status documental, sem refazer a auditoria completa do processo.

A leitura nao deve incluir conteudo bruto extenso de documentos de etapa quando esses ja estiverem assinados; metadados de assinatura e referencias sao suficientes no recorte inicial.

---

## Signatarios e assinatura

A assinatura do parecer final sera tratada em subtask propria.

Regras gerais:

- o parecer final tera expected signers proprios em `CesadFinalOpinionExpectedSigner`, espelhando estruturalmente `CesadStageOpinionExpectedSigner`, mas sem reaproveitamento direto;
- os signatarios serao derivados da comissao CESAD vigente no momento de preparacao das assinaturas do parecer final, com snapshot proprio congelado em `frozenAt`, salvo decisao futura formal em sentido distinto;
- `CESAD_MEMBER` esperados assinam a propria pendencia;
- `ADMIN` nao assina por membro;
- `COMMISSION_ASSISTANT` nao assina;
- membro nao esperado e bloqueado;
- o documento `CESAD_OPINION` do parecer final segue o mesmo padrao documental ja consolidado: nasce `READY_FOR_SIGNATURE` na preparacao, transita para `SIGNED` apenas apos completude de todas as assinaturas esperadas.

---

## Workflow e acoes futuras

As acoes previstas para o ciclo do parecer final, a serem catalogadas em `workflow-catalog.ts` em subtasks especificas, sao:

- `START_CESAD_FINAL_OPINION`;
- `SAVE_CESAD_FINAL_OPINION_DRAFT`;
- `COMPLETE_CESAD_FINAL_OPINION`;
- `PREPARE_CESAD_FINAL_OPINION_SIGNATURES`;
- `SIGN_CESAD_FINAL_OPINION`;
- `SEND_TO_HOMOLOGATION`.

Regras de macrostatus:

- o macro `ProcessStatus` permanece em `PARECER_EMITIDO` durante todo o ciclo do parecer final;
- nao sera criado `AGUARDANDO_HOMOLOGACAO` neste momento;
- a diferenciacao fina entre "parecer de etapa emitido" e "parecer final emitido" continuara expressa em camada complementar do dominio (presenca de `CesadFinalOpinion`, seu status e o status documental correspondente).

Auditoria correspondente sera definida em implementacao, espelhando o padrao `CESAD_STAGE_OPINION_*` ja consolidado.

---

## Divisao em subtasks

A frente `BE-CESAD-FINAL-01` sera dividida em tres subtasks incrementais:

- `BE-CESAD-FINAL-01A — Modelo funcional e elegibilidade`: entidade `CesadFinalOpinion`, regras de elegibilidade, leitura/consolidacao historica process-wide, draft e complete, contracts e auditoria correlatos;
- `BE-CESAD-FINAL-01B — Documento e assinaturas colegiadas`: introducao de `opinionKind` em `ProcessDocument`, backfill controlado, `CesadFinalOpinionExpectedSigner`, integracao com `SignatureRecord`, autorizacao process-wide e ciclo documental do parecer final;
- `BE-CESAD-FINAL-01C — Envio formal a homologacao`: catalogacao de `SEND_TO_HOMOLOGATION` como ponte para `BE-HOMOLOG-01`, sem alterar macrostatus e sem implementar homologacao.

Cada subtask deve ser auditavel separadamente e nao deve antecipar escopo da subtask seguinte.

---

## Relacao com `BE-HOMOLOG-01`

Esta ADR nao implementa homologacao, notificacao ou ciencia.

O parecer final apenas habilita futura homologacao. `BE-HOMOLOG-01` continuara responsavel por:

- modelagem do ato de homologacao;
- notificacao formal do servidor;
- registro de ciencia;
- preparacao de pontos de extensao para recurso final.

`SEND_TO_HOMOLOGATION`, quando implementada em `BE-CESAD-FINAL-01C`, sera apenas ponte formal: registra que o parecer final esta apto a ser homologado, sem homologar, notificar, registrar ciencia ou publicar portaria. O macrostatus permanece em `PARECER_EMITIDO` ate que `BE-HOMOLOG-01` modele transicoes proprias.

---

## Relacao com ADR-004

Esta ADR depende diretamente de ADR-004, que materializou as quatro etapas e definiu a conclusao formal via `COMPLETE_CURRENT_STAGE`.

ADR-004 ja registrou que apos a quarta etapa nao ha etapa ativa, que o parecer final usaria leitura/consolidacao historica adequada e que `BE-CESAD-FINAL-01` permaneceria responsavel pela modelagem do artefato funcional, do ciclo documental e da consolidacao das quatro etapas. ADR-005 cumpre esse compromisso ao fixar a estrategia de entidade propria e o discriminador `opinionKind`.

---

## Fora do escopo

Esta ADR nao decide nem implementa:

- homologacao;
- notificacao;
- ciencia;
- recursos;
- avaliacao substitutiva;
- portaria;
- frontend;
- versionamento documental completo;
- invalidacao/supersessao documental;
- assinatura externa GOVBR real;
- reestruturacao ampla de `CesadStageOpinion`;
- renomeacao para `CesadOpinion` unificado;
- criacao de macrostatus novo como `AGUARDANDO_HOMOLOGACAO`;
- schema Prisma;
- migration;
- contracts;
- testes.

---

## Proximos passos

1. Abrir `BE-CESAD-FINAL-01A` para modelo funcional, elegibilidade e leitura/consolidacao historica do parecer final.
2. Apos auditoria de 01A, abrir `BE-CESAD-FINAL-01B` para `opinionKind`, expected signers proprios, ciclo documental e assinatura colegiada do parecer final.
3. Apos auditoria de 01B, abrir `BE-CESAD-FINAL-01C` para catalogar `SEND_TO_HOMOLOGATION` como ponte formal a `BE-HOMOLOG-01`.
4. Preservar `BE-HOMOLOG-01` como frente futura separada, sem antecipar homologacao, notificacao ou ciencia.
5. Preservar recursos, portaria e GOVBR como frentes futuras proprias, fora de `BE-CESAD-FINAL-01`.
