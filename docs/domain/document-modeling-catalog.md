# AEP-PA — Catálogo Oficial de Modelagem Documental

**Status:** Aprovado para referência de projeto  
**Versão:** 1.1.0  
**Data:** 2026-03-27  
**Escopo:** Diretriz oficial de modelagem documental do AEP-PA  
**Aplicação:** Backend, frontend, workflow, geração documental, assinatura e auditoria

---

## 1. Objetivo

Este documento define a modelagem documental oficial do AEP-PA no nível funcional, processual e arquitetural.

Seu objetivo é estabelecer, de forma estável e auditável:

- quais documentos oficiais existem no sistema;
- de onde cada documento nasce;
- quem pode produzi-lo;
- quem deve assiná-lo;
- qual é sua relação com o workflow do processo;
- quais regras de imutabilidade, versionamento e auditoria devem ser respeitadas;
- quais documentos pertencem ao núcleo do MVP e quais entram em fases posteriores.

Este documento deve servir como referência para:

- implementação backend;
- implementação frontend;
- geração de PDFs;
- modelagem de storage e metadados;
- assinatura eletrônica;
- auditoria funcional;
- elaboração de prompts para agentes de implementação;
- revisão arquitetural de novos incrementos.

---

## 2. Escopo

Este catálogo abrange os documentos formais do rito do AEP-PA, com foco no Caso 2 e no MVP orientado à segurança jurídica.

Inclui:

- avaliação da chefia;
- autoavaliação;
- parecer CESAD de etapa;
- parecer CESAD conclusivo final;
- registro de homologação;
- notificação de resultado;
- registro de ciência;
- portaria;
- artefatos documentais mínimos relacionados a recursos.

Não substitui:

- o motor de workflow;
- o documento de instrumentos avaliativos;
- o documento de auditoria semântica;
- o documento de regras de assinatura;
- o documento de arquitetura de geração de PDFs;
- o documento específico do fluxo de 4 etapas e recursos.

Este catálogo complementa esses artefatos, concentrando a visão documental oficial do sistema.

---

## 3. Princípios estruturais da modelagem documental

### 3.1. O AEP-PA é um sistema processual, não um repositório de anexos

Os documentos do AEP-PA não devem ser tratados como arquivos soltos anexados manualmente ao processo, salvo casos excepcionais.

A regra principal do sistema é:

**ato funcional no sistema -> formalização institucional em documento processual -> assinatura eletrônica -> preservação auditável**

---

### 3.2. Conteúdo funcional, documento processual e assinatura são camadas distintas

Toda modelagem documental do projeto deve respeitar a separação entre três camadas:

#### a) Conteúdo funcional
É a estrutura de dados editável ou gerável no sistema.

Exemplos:

- avaliação preenchida pela chefia;
- autoavaliação preenchida pelo servidor;
- parecer redigido pela CESAD;
- registro de homologação;
- notificação resolvida por template;
- portaria resolvida por template;
- recurso formal registrado pelo servidor;
- despacho recursal da comissão ou da chefia.

#### b) Documento processual
É a formalização institucional do conteúdo funcional.

Representa o artefato oficial do rito, vinculado ao processo e sujeito a regras de estado, metadados, storage, geração e assinatura.

No domínio atual, essa camada é representada por `ProcessDocument`.

#### c) Assinatura
É a trilha própria de signatários, status e provedor de assinatura.

No domínio atual, essa camada é representada por `SignatureRecord`.

---

### 3.3. Assinaturas recaem sobre documentos, não sobre flags em entidades funcionais

A assinatura deve sempre recair sobre o documento processual formalizado, e não sobre um campo booleano solto na entidade funcional.

Isso garante:

- rastreabilidade;
- integridade jurídica;
- possibilidade de múltiplos signatários;
- clareza de pendência documental;
- possibilidade futura de integração com GOV.BR;
- estabilidade do rito administrativo.

---

### 3.4. Todo documento relevante deve ter trilha de auditoria

Toda ação crítica envolvendo documentos deve gerar evento auditável, incluindo, quando aplicável:

- início de elaboração;
- salvamento de rascunho;
- submissão;
- geração de documento;
- solicitação de assinatura;
- assinatura concluída;
- invalidação ou substituição;
- reemissão;
- ciência;
- abertura de recurso;
- despacho recursal;
- encerramento processual.

---

### 3.5. Documento formal não deve ser editável após fechamento relevante

Após consolidação e, especialmente, após assinatura completa, o documento formal deve ser tratado como logicamente imutável.

Qualquer correção posterior deve ocorrer por:

- nova versão formal;
- novo documento derivado;
- invalidação/superação controlada do documento anterior;
- ou retorno formal do processo com trilha explícita.

Nunca por sobrescrita silenciosa.

---

## 4. Ciclo de vida documental padrão

O padrão recomendado para os documentos do AEP-PA é:

1. **criação do conteúdo funcional**
2. **edição / rascunho**, quando aplicável
3. **submissão / consolidação**
4. **geração do documento processual**
5. **criação das pendências de assinatura**
6. **coleta de assinaturas**
7. **fechamento documental**
8. **uso do documento como base para transição de workflow**

Nem todos os documentos passam por todas as etapas da mesma forma.  
Documentos por template, por exemplo, podem nascer quase diretamente na fase de geração/consolidação.

---

## 5. Estados documentais recomendados

O domínio atual já prevê estados de documento compatíveis com este catálogo:

- `DRAFT`
- `CONSOLIDATED`
- `READY_FOR_SIGNATURE`
- `SIGNED`
- `INVALIDATED_OR_SUPERSEDED`

Recomendação de uso:

### `DRAFT`
Documento ainda em elaboração ou ainda não formalizado definitivamente.

### `CONSOLIDATED`
Conteúdo funcional fechado para formalização, mas ainda não pronto para assinatura final ou ainda sem a versão oficial completa.

### `READY_FOR_SIGNATURE`
Documento oficial gerado e apto a receber assinaturas.

### `SIGNED`
Documento com assinaturas obrigatórias concluídas.

### `INVALIDATED_OR_SUPERSEDED`
Documento que perdeu vigência lógica por substituição formal, correção posterior ou retorno com reemissão.

---

## 6. Regra estrutural do Caso 2 com 4 etapas

### 6.1. Processo único com etapas internas

No Caso 2, o AEP-PA representa:

- **um único processo administrativo**;
- com **4 etapas avaliativas internas**;
- cada etapa com seu próprio ciclo documental;
- e consolidação final apenas após a conclusão das quatro etapas.

### 6.2. Ciclo documental mínimo por etapa

Cada etapa possui, no mínimo:

- avaliação da chefia;
- assinatura do servidor na avaliação;
- autoavaliação;
- assinatura da chefia na autoavaliação;
- parecer CESAD da etapa, quando concluído.

### 6.3. Parecer conclusivo final

Após a conclusão da 4ª etapa e do respectivo ciclo documental, o sistema deve habilitar a elaboração do **parecer conclusivo final**, que consolida o histórico das 4 etapas.

### 6.4. Trava de homologação

A homologação final só pode ser habilitada quando houver, no mínimo:

- 4 etapas realizadas;
- 4 etapas documentalmente completas;
- parecer da CESAD emitido para cada etapa, conforme a regra adotada;
- parecer conclusivo final emitido.

Antes disso, o sistema não deve:

- habilitar a fila de homologação;
- gerar notificação final;
- liberar publicação de portaria.

---

## 7. Catálogo oficial de documentos

### 7.1. Avaliação da chefia

#### Natureza
Documento originado de formulário preenchido pela chefia imediata no sistema.

#### Origem
Conteúdo funcional preenchido manualmente no AEP-PA.

#### Artefato funcional sugerido
`SupervisorEvaluation`

#### Documento processual
`ProcessDocument` com `documentType = SUPERVISOR_EVALUATION`

#### Signatários
- chefia imediata
- servidor-estagiário

#### Fluxo resumido
1. chefia inicia ou edita avaliação;
2. chefia salva rascunho;
3. chefia conclui/submete;
4. sistema gera o documento formal da avaliação;
5. chefia consta como signatária originária;
6. servidor assina;
7. documento fica formalmente completo.

#### Regras principais
- só pode existir no contexto da etapa correta;
- a chefia correta deve ser validada;
- a retificação é permitida apenas até o limite jurídico/funcional definido;
- após assinatura relevante, a edição deve ser bloqueada;
- a avaliação formal deve ficar acessível no processo e no painel correspondente.

#### Saídas esperadas
- PDF oficial da avaliação;
- metadados documentais;
- histórico de geração e assinatura.

#### Status no roadmap
Já consolidado no backend.

---

### 7.2. Autoavaliação

#### Natureza
Documento originado de formulário preenchido pelo servidor-estagiário no sistema.

#### Origem
Conteúdo funcional preenchido manualmente no AEP-PA.

#### Artefato funcional sugerido
`SelfEvaluation`

#### Documento processual
`ProcessDocument` com `documentType = SELF_EVALUATION`

#### Signatários
- servidor-estagiário
- chefia imediata

#### Fluxo resumido
1. servidor inicia autoavaliação;
2. servidor salva rascunho;
3. servidor submete;
4. sistema gera o documento formal da autoavaliação;
5. servidor consta como signatário originário;
6. chefia assina;
7. documento fica formalmente completo.

#### Regras principais
- só pode nascer após a assinatura da avaliação da chefia;
- deve respeitar o vínculo do servidor com o processo;
- após submissão, o conteúdo não deve continuar livremente editável;
- a assinatura da chefia fecha documentalmente a autoavaliação;
- a completude documental da etapa depende da avaliação da chefia e da autoavaliação assinadas.

#### Saídas esperadas
- PDF oficial da autoavaliação;
- metadados documentais;
- histórico de assinatura.

#### Status no roadmap
Já consolidado no backend.

---

### 7.3. Parecer CESAD de etapa

#### Natureza
Documento originado de artefato funcional estruturado da comissão, referente a uma etapa específica.

#### Origem
Conteúdo redigido e consolidado pela CESAD no sistema.

#### Artefato funcional sugerido
`CesadOpinion`

#### Documento processual
`ProcessDocument` com `documentType = CESAD_OPINION`

#### Campos mínimos adicionais de escopo
- `opinionKind = STAGE`
- `stageNumber = 1 | 2 | 3 | 4`

#### Signatários
- membros obrigatórios da CESAD

#### Estrutura mínima esperada
O parecer de etapa deve suportar, no mínimo:

- identificação do servidor;
- identificação da etapa;
- cargo;
- lotação;
- data de exercício;
- chefia imediata;
- quadro consolidado de fatores da etapa, quando aplicável;
- relatório;
- fundamento legal;
- conclusão;
- conceito da etapa;
- resultado da etapa;
- local/data;
- signatários da CESAD.

#### Fluxo resumido
1. CESAD abre a etapa já instruída;
2. CESAD elabora o parecer;
3. CESAD salva e revisa;
4. sistema consolida o parecer;
5. sistema gera o documento oficial;
6. sistema cria as pendências de assinatura;
7. assinaturas são coletadas;
8. parecer da etapa se torna formalmente emitido.

#### Regras principais
- a CESAD não altera avaliação ou autoavaliação;
- o parecer deve nascer de leitura consolidada da etapa;
- o sistema deve evidenciar quem já assinou e quem falta;
- o parecer da etapa não deve ser considerado emitido antes das assinaturas obrigatórias;
- eventual devolução para ajuste deve ser auditada e não pode apagar a trilha anterior.

#### Saídas esperadas
- PDF oficial do parecer de etapa;
- status das assinaturas;
- visão consolidada no processo.

#### Status no roadmap
Próximo documento prioritário do ciclo da CESAD.

---

### 7.4. Parecer CESAD conclusivo final

#### Natureza
Documento originado de artefato funcional estruturado da comissão, consolidando as 4 etapas do processo.

#### Origem
Conteúdo redigido e consolidado pela CESAD no sistema, após a conclusão das quatro etapas.

#### Artefato funcional sugerido
`CesadOpinion`

#### Documento processual
`ProcessDocument` com `documentType = CESAD_OPINION`

#### Campos mínimos adicionais de escopo
- `opinionKind = FINAL_CONCLUSIVE`
- `stageNumber = null`

#### Signatários
- membros obrigatórios da CESAD

#### Estrutura mínima esperada
O parecer conclusivo final deve suportar, no mínimo:

- identificação do servidor;
- identificação do cargo;
- lotação;
- data de exercício;
- quadro consolidado das 4 etapas;
- resultado parcial por etapa ou por fator, quando aplicável;
- resultado final consolidado;
- pontuação geral final;
- conceito final;
- relatório final;
- fundamento legal;
- conclusão final;
- recomendação final para homologação;
- local/data;
- signatários da CESAD.

#### Fluxo resumido
1. processo fica elegível após a 4ª etapa;
2. CESAD elabora o parecer conclusivo final;
3. CESAD salva e revisa;
4. sistema consolida o parecer final;
5. sistema gera o documento oficial;
6. sistema cria as pendências de assinatura;
7. assinaturas são coletadas;
8. processo se torna apto à homologação.

#### Regras principais
- só pode ser iniciado quando as 4 etapas estiverem aptas;
- consolida os resultados das quatro etapas;
- não substitui os pareceres de etapa, mas os complementa;
- é a base formal para a homologação final;
- não deve ser considerado emitido antes das assinaturas obrigatórias.

#### Saídas esperadas
- PDF oficial do parecer conclusivo final;
- status das assinaturas;
- habilitação do processo para homologação.

#### Status no roadmap
Posterior aos pareceres de etapa e anterior à homologação.

---

### 7.5. Registro de homologação

#### Natureza
Documento associado ao ato formal da autoridade homologadora.

#### Origem
Ato decisório formal no sistema, com estrutura mais enxuta que um parecer.

#### Artefato funcional sugerido
`HomologationDecision` ou equivalente

#### Documento processual
`ProcessDocument` com `documentType = HOMOLOGATION_RECORD`

#### Signatário
- autoridade homologadora

#### Conteúdo mínimo recomendado
- identificação do processo;
- identificação do servidor;
- referência ao parecer conclusivo final;
- decisão de homologar ou devolver;
- fundamento/observação da decisão;
- local/data;
- autoridade responsável.

#### Fluxo resumido
1. autoridade homologadora abre o processo apto;
2. analisa parecer final, histórico e documentos;
3. decide homologar ou devolver;
4. sistema formaliza o registro;
5. sistema gera o documento oficial;
6. autoridade assina;
7. o processo segue para o estado correspondente.

#### Regras principais
- a autoridade não altera conteúdo da avaliação ou do parecer;
- a decisão deve ser explicitamente auditada;
- devolução para regularização deve ter fundamento rastreável;
- homologação formal serve de base para a notificação final.

#### Saídas esperadas
- documento formal de homologação;
- histórico decisório;
- base formal para notificação posterior.

#### Status no roadmap
Posterior ao parecer conclusivo final.

---

### 7.6. Notificação de resultado / Notificação pessoal

#### Natureza
Documento gerado automaticamente por template institucional.

#### Origem
Não nasce de formulário livre.  
É resolvido a partir dos dados consolidados do processo após homologação.

#### Artefato funcional sugerido
`ResultNotification`

#### Documento processual
`ProcessDocument` com `documentType = RESULT_NOTIFICATION`

#### Signatário
- autoridade homologadora

#### Modelo funcional esperado
O sistema deve montar a notificação com base em:

- identificação institucional;
- nome do servidor;
- endereço;
- CEP;
- cargo efetivo;
- matrícula;
- data de exercício;
- processos vinculados;
- resultado final;
- conceito obtido;
- referência normativa;
- prazo recursal;
- local/data;
- autoridade emissora.

#### Estrutura mínima do documento
- cabeçalho institucional;
- endereçamento ao servidor;
- título `NOTIFICAÇÃO PESSOAL`;
- corpo padronizado com dados variáveis do processo;
- fecho institucional;
- assinatura da autoridade homologadora;
- bloco de recebimento / ciência do servidor.

#### Campos funcionais mínimos recomendados
- `processId`
- `serverName`
- `serverAddress`
- `serverZipCode`
- `positionName`
- `registrationNumber`
- `exerciseDate`
- `generalConcept`
- `decision`
- `processNumbersText`
- `appealDeadlineDays`
- `templateVersion`
- `bodyTextResolved`
- `issuedAt`

#### Fluxo resumido
1. processo homologado;
2. sistema resolve os dados do template;
3. sistema gera a notificação;
4. sistema formaliza o documento processual;
5. autoridade homologadora assina;
6. sistema disponibiliza a notificação ao servidor;
7. o prazo recursal final passa a contar;
8. posteriormente ocorre a ciência do servidor.

#### Regras principais
- a notificação deve ser majoritariamente automática;
- o texto-base deve ser parametrizável, sem depender de alteração de código para pequenas revisões institucionais;
- a notificação deve servir como marco temporal para o prazo recursal final;
- o campo de ciência no documento não elimina a necessidade de registro funcional próprio da ciência no workflow;
- a emissão da notificação deve ser auditada.

#### Saídas esperadas
- PDF oficial da notificação;
- metadados da emissão;
- visualização pelo servidor;
- vínculo com o registro posterior de ciência.

#### Status no roadmap
Incremento futuro, após homologação.

---

### 7.7. Registro de ciência

#### Natureza
Ato formal do servidor-estagiário após a notificação.

#### Origem
Confirmação de ciência praticada no sistema.

#### Artefato funcional sugerido
`Acknowledgement` ou equivalente

#### Documento processual
`ProcessDocument` com `documentType = ACKNOWLEDGEMENT_RECORD`
ou registro funcional formal equivalente, conforme a implementação escolhida.

#### Signatário / autor do ato
- servidor-estagiário

#### Conteúdo mínimo recomendado
- identificação do processo;
- referência à notificação emitida;
- data/hora da ciência;
- identificação do servidor;
- eventual confirmação autenticada do recebimento.

#### Fluxo resumido
1. servidor acessa a notificação;
2. servidor registra ciência;
3. sistema persiste o ato;
4. sistema gera registro formal/documental;
5. processo avança para o estado correspondente.

#### Regras principais
- a ciência deve ser explicitamente auditada;
- a ciência deve estar vinculada à notificação emitida;
- a ciência não deve ser simulada por simples mudança de status;
- deve existir clareza sobre data/hora da ciência para fins operacionais.

#### Saídas esperadas
- registro formal de ciência;
- histórico do ato;
- base para avanço do workflow.

#### Status no roadmap
Posterior à notificação.

---

### 7.8. Portaria

#### Natureza
Documento gerado automaticamente por template, com possibilidade de emissão individual ou coletiva.

#### Origem
Documento derivado por modelo oficial após marcos processuais posteriores à homologação e à notificação.

#### Observação crítica
A portaria não deve ser modelada como simples documento isolado por processo, porque pode abranger múltiplos servidores/processos.

#### Artefato funcional sugerido
`PublicationOrdinance`

#### Entidade de itens sugerida
`PublicationOrdinanceItem`

#### Documento processual
`ProcessDocument` com `documentType = ORDINANCE`

#### Signatário
- autoridade homologadora

#### Capacidades obrigatórias futuras
- portaria individual;
- portaria coletiva;
- texto-base institucional parametrizável;
- tabela de servidores/processos abrangidos;
- assinatura da autoridade homologadora;
- PDF oficial assinado;
- conteúdo copiável para colagem no sistema do DOE;
- numeração sequencial única, sem repetição.

#### Estrutura funcional mínima recomendada da portaria
- `ordinanceNumber`
- `ordinanceYear`
- `ordinanceType`
- `status`
- `generationMode`
- `templateVersion`
- `titleText`
- `bodyText`
- `authorityName`
- `authorityRole`
- `exceptionJustification`
- `signedAt`
- `publishedAt`

#### Estrutura mínima recomendada dos itens
- `ordinanceId`
- `processId`
- `serverId`
- `serverName`
- `registrationNumber`
- `positionName`
- `result`
- `generalConcept`
- `notificationDate`
- `scienceDate`
- `eligibleSince`
- `sortOrder`

#### Regra ordinária de publicação
Em regra, a CESAD deve aguardar 5 dias após a notificação para publicar a portaria.

#### Regra excepcional
A comissão pode publicar antes em casos excepcionais, com justificativa formal e auditável.

#### Regras principais
- deve haver controle de elegibilidade para publicação;
- deve haver distinção entre fluxo ordinário e excepcional;
- a exceção exige justificativa;
- não pode haver duplicidade de inclusão indevida de um mesmo processo em portarias incompatíveis;
- a portaria deve congelar os dados efetivamente publicados;
- o conteúdo para DOE deve ser derivado da mesma base usada no PDF oficial, evitando divergência.

#### Numeração
A numeração da portaria deve ser sequencial, única e sem repetição.

**Recomendação arquitetural:**
- controlar a sequência em mecanismo transacional próprio;
- não gerar número por lógica ingênua no frontend;
- reservar o número no backend de forma segura contra concorrência.

#### Saídas esperadas
- PDF oficial assinado;
- conteúdo estruturado copiável para DOE;
- vínculo com os processos/servidores abrangidos;
- histórico de geração e assinatura.

#### Status no roadmap
Incremento futuro, após parecer, homologação, notificação e ciência.

---

## 8. Artefatos documentais mínimos dos recursos

### 8.1. Recurso de etapa

#### Natureza
Ato formal do servidor contra o resultado/parecer de uma etapa específica.

#### Origem
Registro funcional do recurso no sistema, dentro do prazo recursal.

#### Artefato funcional sugerido
`StageAppeal`

#### Documento processual sugerido
`ProcessDocument` específico de recurso, se adotado, ou registro formal equivalente vinculado à etapa.

#### Autor do ato
- servidor-estagiário

#### Regras principais
- cabível contra o resultado/parecer da etapa;
- dirigido à CESAD;
- prazo de 5 dias a contar da ciência/visualização do parecer da etapa no perfil do servidor;
- após o prazo, a opção de recorrer deve ser desabilitada;
- a etapa contestada fica suspensa no ponto cabível até resolução do recurso.

---

### 8.2. Despacho da CESAD no recurso de etapa

#### Natureza
Ato formal da comissão no processamento do recurso de etapa.

#### Artefato funcional sugerido
`StageAppealDispatch`

#### Conteúdo mínimo recomendado
- referência ao recurso;
- referência à etapa;
- fundamento sintético;
- encaminhamento à chefia imediata;
- data;
- responsáveis.

#### Regras principais
- a CESAD analisa o recurso;
- gera despacho para a chefia imediata;
- o despacho deve ser auditável;
- o despacho não encerra sozinho a controvérsia quando depende de manifestação da chefia.

---

### 8.3. Despacho da chefia no recurso de etapa

#### Natureza
Resposta formal da chefia ao encaminhamento da CESAD.

#### Artefato funcional sugerido
`SupervisorAppealResponse`

#### Possibilidades
- **manter** a avaliação, com justificativa;
- **reavaliar** o servidor.

#### Regras principais
- se mantiver, deve justificar;
- pode anexar arquivo opcional;
- se reavaliar, o sistema deve abrir uma nova avaliação substitutiva;
- a resposta deve ficar vinculada ao recurso e à etapa.

---

### 8.4. Avaliação substitutiva

#### Natureza
Nova avaliação formal aberta em decorrência de recurso de etapa acolhido para reavaliação.

#### Artefato funcional sugerido
`SupervisorEvaluation` com marcação de substituição
ou entidade complementar de versionamento, conforme o desenho adotado.

#### Regras principais
- não apaga a avaliação anterior;
- substitui logicamente a avaliação contestada;
- percorre novo fluxo formal, inclusive com nova assinatura do servidor;
- deve manter vínculo rastreável com a avaliação original.

---

### 8.5. Recurso final

#### Natureza
Ato formal do servidor contra o resultado final homologado/notificado.

#### Origem
Registro funcional do recurso no sistema, dentro do prazo recursal final.

#### Artefato funcional sugerido
`FinalAppeal`

#### Documento processual sugerido
`ProcessDocument` específico de recurso final, se adotado, ou registro formal equivalente.

#### Autor do ato
- servidor-estagiário

#### Regras principais
- cabível contra o resultado final homologado/notificado;
- dirigido à autoridade homologadora;
- prazo de 5 dias a contar da visualização/ciência da notificação;
- após o prazo, a opção de recorrer deve ser desabilitada;
- o resultado final fica contestado/suspenso no ponto cabível até a resolução do recurso.

---

## 9. Tabela-resumo do catálogo

| Documento / artefato | Origem | Artefato funcional | Documento processual | Signatários / autores principais | Situação |
|---|---|---|---|---|---|
| Avaliação da chefia | Formulário | `SupervisorEvaluation` | `SUPERVISOR_EVALUATION` | chefia + servidor | já consolidado |
| Autoavaliação | Formulário | `SelfEvaluation` | `SELF_EVALUATION` | servidor + chefia | já consolidado |
| Parecer CESAD de etapa | Conteúdo estruturado | `CesadOpinion` | `CESAD_OPINION` | membros da CESAD | próximo ciclo |
| Parecer CESAD conclusivo final | Conteúdo estruturado | `CesadOpinion` | `CESAD_OPINION` | membros da CESAD | posterior ao ciclo das etapas |
| Homologação | Ato decisório | `HomologationDecision` | `HOMOLOGATION_RECORD` | autoridade homologadora | posterior |
| Notificação | Template | `ResultNotification` | `RESULT_NOTIFICATION` | autoridade homologadora | posterior |
| Ciência | Ato formal | `Acknowledgement` | `ACKNOWLEDGEMENT_RECORD` | servidor | posterior |
| Portaria | Template individual/coletivo | `PublicationOrdinance` | `ORDINANCE` | autoridade homologadora | futuro |
| Recurso de etapa | Ato formal | `StageAppeal` | definir | servidor | reservado no domínio |
| Despacho CESAD do recurso | Ato formal | `StageAppealDispatch` | definir | CESAD | reservado no domínio |
| Resposta da chefia ao recurso | Ato formal | `SupervisorAppealResponse` | definir | chefia | reservado no domínio |
| Recurso final | Ato formal | `FinalAppeal` | definir | servidor | reservado no domínio |

---

## 10. Regras transversais obrigatórias

### 10.1. Toda geração documental relevante deve registrar auditoria

Eventos mínimos sugeridos:

- documento iniciado;
- documento consolidado;
- documento gerado;
- assinatura solicitada;
- assinatura concluída;
- documento invalidado ou substituído;
- notificação emitida;
- ciência registrada;
- recurso aberto;
- despacho emitido;
- reavaliação aberta;
- recurso encerrado.

---

### 10.2. Todo documento oficial deve estar vinculado ao processo

Mesmo nos casos coletivos, como portaria, deve existir vínculo rastreável entre o documento e os processos abrangidos.

Nos casos de etapa e recurso, deve existir também vínculo claro com a etapa correspondente.

---

### 10.3. PDF não substitui o dado estruturado

O sistema não deve tratar o PDF como fonte única da verdade.

A fonte principal deve ser o conteúdo funcional estruturado, a partir do qual o PDF oficial é gerado.

---

### 10.4. O sistema deve suportar visualização documental por perfil

Perfis diferentes enxergam conjuntos diferentes de documentos, mas todos os acessos devem respeitar:

- autorização;
- momento processual;
- rastreabilidade.

---

### 10.5. O documento oficial deve ter metadados mínimos

Cada `ProcessDocument` deve, idealmente, manter ou permitir derivar:

- tipo;
- status;
- processo vinculado;
- etapa vinculada, quando houver;
- versão;
- data de geração;
- data de consolidação;
- data de assinatura final;
- storage key / referência do arquivo;
- hash/checksum futuro, se adotado;
- informação de superação/invalidação, quando aplicável.

---

## 11. Ordem recomendada de implementação documental

### Prioridade 1 — já consolidadas
- avaliação da chefia
- autoavaliação

### Prioridade 2 — ciclo CESAD por etapa
- leitura consolidada da etapa
- parecer CESAD de etapa
- assinaturas do parecer de etapa

### Prioridade 3 — consolidação final
- habilitação do parecer conclusivo final
- parecer conclusivo final
- assinaturas do parecer final

### Prioridade 4 — formalização decisória
- homologação

### Prioridade 5 — comunicação formal
- notificação
- ciência

### Prioridade 6 — recursos
- recurso de etapa
- despacho da CESAD
- resposta da chefia
- avaliação substitutiva
- recurso final

### Prioridade 7 — publicação institucional
- portaria
- saída para DOE

---

## 12. Decisões já consolidadas por este documento

Ficam considerados consolidados, para fins de continuidade do projeto:

1. o AEP-PA produz seus documentos oficiais a partir de atos praticados dentro da aplicação;
2. conteúdo funcional, documento processual e assinatura são camadas distintas;
3. assinaturas recaem sobre documentos formais;
4. nem todo documento nasce de formulário livre;
5. existe distinção obrigatória entre parecer CESAD de etapa e parecer CESAD conclusivo final;
6. a homologação final só é habilitada após as quatro etapas e o parecer conclusivo final;
7. a notificação é um documento por template com assinatura da autoridade homologadora;
8. a ciência do servidor é ato posterior próprio;
9. a portaria pode ser individual ou coletiva;
10. a portaria exige numeração sequencial única e saída dupla: PDF oficial e conteúdo copiável para DOE;
11. há recurso por etapa e recurso final, com reserva explícita de espaço no domínio;
12. qualquer evolução futura deve preservar trilha de auditoria e imutabilidade lógica pós-fechamento.

---

## 13. Histórico de alterações

| Versão | Data | Alterações |
|---|---|---|
| 1.0.0 | 2026-03-27 | Criação inicial do catálogo oficial de modelagem documental, consolidando avaliação da chefia, autoavaliação, parecer CESAD, homologação, notificação, ciência e portaria. Inclusão do modelo real de notificação pessoal e das regras futuras da portaria. |
| 1.1.0 | 2026-03-27 | Atualização para diferenciar parecer CESAD de etapa e parecer conclusivo final, registrar a trava de homologação após 4 etapas, incluir artefatos documentais mínimos de recursos e atualizar a ordem recomendada de implementação. |

---

## 14. Pontos ainda dependentes de detalhamento futuro

Este documento não esgota todos os detalhes de implementação. Permanecem como temas futuros, entre outros:

- arquitetura exata do worker de geração de PDFs;
- versionamento fino de templates institucionais;
- storage definitivo e política de retenção documental;
- checksum/hash documental;
- integração futura com GOV.BR;
- modelagem fina do julgamento do recurso final;
- fluxo completo de publicação efetiva no DOE;
- modelagem final do ato de homologação, se será mais enxuto ou mais documentalizado;
- definição final sobre quais artefatos recursais terão `ProcessDocument` próprio e quais serão registros formais equivalentes.

---

## 15. Regra de prevalência

Na presença de conflito entre:
- leitura simplificada de telas;
- entendimento antigo de contexto;
- ou implementação ad hoc;

deve prevalecer esta diretriz:

**o documento processual oficial, sua trilha de assinatura e sua posição no workflow administrativo têm primazia sobre simplificações de interface ou atalhos de implementação.**