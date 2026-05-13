# ADR-004 — Progressao formal das quatro etapas avaliativas

## Status

Aceita / Decisao arquitetural registrada.

Esta ADR registra a decisao arquitetural para `BE-FLOW-4STAGE-01 — Estruturar progressao formal das quatro etapas avaliativas`.

Ela nao implementa codigo, nao altera schema Prisma, nao cria migration, nao altera contracts, testes, frontend, seeds ou roadmaps operacionais.

---

## Contexto

O SADEP e um sistema processual orientado a estados, e nao um CRUD simples. No Caso 2, o processo administrativo e unico e possui quatro etapas avaliativas internas obrigatorias. Cada etapa possui ciclo documental proprio, parecer CESAD de etapa e trilha de assinatura.

O backend ja possui `ProcessStage` com `sequence`, `stageCode`, `startedAt` e `endedAt`, alem de ciclo documental stage-bound para avaliacao da chefia, autoavaliacao e parecer CESAD de etapa. Tambem ja existe assinatura colegiada do parecer CESAD de etapa, e `ISSUE_CESAD_OPINION` esta bloqueado ate a completude colegiada.

Ainda falta representar a progressao formal entre as quatro etapas. Sem essa decisao, o fluxo reduzido de uma etapa pode ser tratado indevidamente como se fosse o fluxo completo do Caso 2.

---

## Decisao

O SADEP adotara, para o Caso 2, a estrategia de quatro etapas avaliativas internas materializadas como `ProcessStage`.

As quatro etapas serao garantidas no nascimento do processo ou por backfill/materializacao controlada para processos existentes. O lifecycle de cada etapa sera derivado de `startedAt` e `endedAt`, sem criar novo campo de status em `ProcessStage` neste momento.

Apenas uma etapa pode estar ativa por vez. Etapas futuras existem estruturalmente, mas nao podem ser resolvidas como etapa atual nem receber documentos, avaliacoes, autoavaliacoes, pareceres ou assinaturas.

A acao recomendada para conclusao formal da etapa sera `COMPLETE_CURRENT_STAGE`.

---

## Alternativas consideradas

### Alternativa A — Criar quatro etapas no nascimento/backfill

Vantagens:

- reflete o rito oficial do Caso 2;
- facilita `totalStages = 4`;
- facilita a elegibilidade futura do parecer conclusivo final;
- explicita etapas futuras desde o inicio.

Riscos:

- exige corrigir a resolucao de etapa atual;
- exige backfill para processos existentes;
- pode impactar o frontend ao expor total de quatro etapas.

### Alternativa B — Criar apenas etapa 1 e proximas sob demanda

Vantagens:

- menor impacto inicial;
- compatibilidade maior com o resolver atual.

Riscos:

- esconde a estrutura obrigatoria do processo;
- fragiliza a elegibilidade do parecer conclusivo final;
- dificulta visualizacao, previsibilidade e auditoria do rito completo.

### Alternativa C — Hibrida: quatro etapas planejadas, uma ativa por vez

Esta e a decisao adotada.

As quatro etapas sao materializadas, mas somente uma etapa possui lifecycle ativo por vez. As etapas futuras permanecem planejadas e bloqueadas para artefatos ate receberem `startedAt`.

---

## Consequencias

Consequencias positivas:

- preserva o processo unico com quatro etapas internas obrigatorias;
- evita inflar `ProcessStatus` com estados finos de etapa;
- torna explicita a diferenca entre etapa futura, ativa e concluida;
- cria base deterministica para `BE-CESAD-FINAL-01`;
- reduz o risco de homologacao ou parecer final antes da conclusao das quatro etapas.

Custos e trade-offs:

- exige ajuste dos resolvers de etapa atual;
- exige backfill/materializacao das etapas 2 a 4 para processos legados;
- exige testes especificos para impedir documentos em etapas futuras;
- pode exigir ajuste de snapshots e telas que hoje tratem `totalStages` como quantidade de etapas ja executadas.

Risco critico:

- a resolucao de etapa atual deve ser corrigida antes ou junto da materializacao das etapas futuras. Um resolver que escolha a ultima etapa com `endedAt = null` trataria indevidamente etapas futuras como atuais.

---

## Regra de lifecycle de etapa

O lifecycle de `ProcessStage` sera derivado dos campos existentes:

- futura: `startedAt = null` e `endedAt = null`;
- ativa: `startedAt != null` e `endedAt = null`;
- concluida: `startedAt != null` e `endedAt != null`.

Nao sera criado novo campo/status de etapa neste momento.

---

## Regra de etapa atual

A etapa atual operacional deve ser a etapa ativa.

A resolucao de etapa atual deve ignorar etapas futuras. Portanto, uma etapa com `startedAt = null` nao pode ser escolhida para criacao de documentos, avaliacao da chefia, autoavaliacao, parecer CESAD ou assinatura.

Se todas as quatro etapas estiverem concluidas, a etapa atual pode ser usada apenas para leitura, historico e consolidacao. Nesse caso, ela nao deve permitir criacao de novos artefatos de etapa no fluxo regular.

---

## Regra de completude documental da etapa

Uma etapa so pode ser encerrada por `COMPLETE_CURRENT_STAGE` quando a completude minima estiver satisfeita:

- `ProcessDocument` stage-bound `SUPERVISOR_EVALUATION` em `SIGNED`;
- assinaturas completas de chefia e servidor na avaliacao da chefia;
- `ProcessDocument` stage-bound `SELF_EVALUATION` em `SIGNED`;
- assinaturas completas de servidor e chefia na autoavaliacao;
- `CesadStageOpinion` em `COMPLETED`;
- `ProcessDocument.CESAD_OPINION` stage-bound em `SIGNED`;
- assinaturas CESAD colegiadas completas para todos os signatarios esperados;
- processo em `PARECER_EMITIDO` para a etapa antes de encerra-la.

A auditoria do encerramento e obrigatoria, mas nao substitui a validacao objetiva dos documentos, pareceres e assinaturas.

---

## Acao `COMPLETE_CURRENT_STAGE`

`COMPLETE_CURRENT_STAGE` sera a acao de workflow recomendada para conclusao formal da etapa corrente.

A acao deve:

- partir de `PARECER_EMITIDO`;
- validar a completude documental da etapa;
- registrar auditoria com usuario, perfil, data/hora, acao, processo, etapa encerrada e proxima etapa quando aplicavel;
- preservar documentos, pareceres e assinaturas como historico imutavel;
- nao limpar, sobrescrever ou invalidar artefatos silenciosamente.

O evento de auditoria devera ser definido na implementacao, com semantica equivalente a conclusao formal de etapa, por exemplo `STAGE_COMPLETED`.

---

## Tratamento das etapas 1 a 3

Nas etapas 1, 2 e 3, `COMPLETE_CURRENT_STAGE` deve:

- validar a completude documental da etapa atual;
- definir `endedAt` na etapa atual;
- definir `startedAt` na proxima etapa;
- manter as etapas posteriores como futuras;
- retornar o processo para `EM_AVALIACAO`;
- impedir pulo de sequencia.

A proxima etapa so pode receber artefatos depois de se tornar ativa.

---

## Tratamento da quarta etapa

Na etapa 4, `COMPLETE_CURRENT_STAGE` deve:

- validar a completude documental da etapa 4;
- definir `endedAt` na etapa 4;
- nao criar etapa 5;
- nao homologar o processo;
- nao criar parecer conclusivo final;
- manter o processo preparado para a frente `BE-CESAD-FINAL-01`.

O status macro deve permanecer enxuto. Esta ADR nao cria novo `ProcessStatus` para representar "quatro etapas concluidas".

---

## Relacao com `REQUEST_ADJUSTMENT`

`REQUEST_ADJUSTMENT` permanece restrita ao momento de analise CESAD antes da formalizacao final do parecer da etapa.

A acao nao deve limpar artefatos silenciosamente. Apos formalizacao relevante do parecer de etapa, especialmente quando houver parecer funcional concluido, signatarios esperados congelados, documento CESAD criado ou assinaturas iniciadas/concluidas, eventual retorno deve exigir modelagem propria de invalidacao, supersessao ou reabertura formal.

Reavaliacao por recurso, avaliacao substitutiva, invalidacao documental e supersessao documental ficam fora deste recorte.

---

## Relacao com `BE-CESAD-FINAL-01`

Esta ADR nao implementa parecer conclusivo final.

Ela define apenas a base de elegibilidade: o parecer conclusivo final so deve ser habilitado quando as quatro etapas existirem, estiverem concluidas e satisfizerem a completude documental adotada.

`BE-CESAD-FINAL-01` continuara responsavel por:

- diferenciar parecer CESAD de etapa e parecer conclusivo final;
- modelar o artefato funcional do parecer final;
- definir ciclo documental e assinaturas do parecer final;
- consolidar resultados das quatro etapas;
- preparar o envio futuro para homologacao.

---

## Relacao com `BE-HOMOLOG-01`

Esta ADR nao implementa homologacao, notificacao ou ciencia.

Mesmo apos a quarta etapa concluida, a homologacao final permanece bloqueada ate a emissao do parecer conclusivo final. A autoridade homologadora deve atuar sobre o parecer conclusivo final, e nao sobre parecer isolado de etapa.

`BE-HOMOLOG-01` continuara responsavel por homologacao, notificacao, ciencia e preparacao de prazos recursais finais.

---

## Compatibilidade com dados existentes

Processos existentes com apenas uma etapa precisarao de backfill/materializacao das etapas 2 a 4 como futuras:

- `sequence = 2`, `3`, `4`;
- `stageCode = ETAPA_2`, `ETAPA_3`, `ETAPA_4`;
- `startedAt = null`;
- `endedAt = null`.

A etapa atual dos processos existentes deve permanecer a etapa ativa real. O backfill nao pode fazer etapas futuras parecerem ativas.

Cuidado obrigatorio:

> corrigir a resolucao da etapa atual antes ou junto da materializacao das etapas futuras.

---

## Fora do escopo

Esta ADR nao decide nem implementa:

- parecer conclusivo final;
- homologacao;
- notificacao;
- ciencia;
- recursos;
- avaliacao substitutiva;
- portaria;
- frontend;
- versionamento documental;
- substituicao formal de chefia;
- nova modelagem recursal;
- schema Prisma;
- migration;
- contracts;
- testes.

---

## Proximos passos

1. Implementar, em `BE-FLOW-4STAGE-01`, a materializacao/garantia das quatro etapas.
2. Corrigir a resolucao de etapa atual para escolher somente etapa ativa e ignorar etapas futuras.
3. Adicionar a acao `COMPLETE_CURRENT_STAGE` no workflow.
4. Implementar guardas de completude documental da etapa.
5. Encerrar etapas 1 a 3 abrindo a proxima etapa e retornando o processo para `EM_AVALIACAO`.
6. Encerrar a etapa 4 sem criar etapa 5, sem homologar e sem criar parecer conclusivo final.
7. Registrar auditoria completa da conclusao de etapa.
8. Preservar `BE-CESAD-FINAL-01` e `BE-HOMOLOG-01` como frentes futuras separadas.
