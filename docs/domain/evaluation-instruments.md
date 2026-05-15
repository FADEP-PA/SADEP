# Evaluation Instruments — SADEP

## Objetivo

Documentar os **instrumentos oficiais de avaliação** utilizados no SADEP, com foco no **Caso 2 — modelo de 4 etapas**, de modo a orientar:

- modelagem de backend
- regras de negócio
- estrutura documental do processo
- assinaturas exigidas
- bloqueios operacionais
- integração com workflow e auditoria

Este documento trata os anexos normativos como **instrumentos formais do processo administrativo**, e não como simples formulários de interface.

---

## Escopo atual

Este documento, no momento, cobre:

- **Caso 2**
- **modelo de 4 etapas**
- composição da **avaliação da chefia imediata**
- composição da **autoavaliação do servidor-estagiário**
- regras especiais da **4ª etapa**
- relação entre conteúdo funcional, documento processual e assinaturas

Não cobre ainda:

- geração física de PDF
- layout final de frontend
- integração com provedor externo de assinatura
- outros casos/modelos normativos além do Caso 2 — 4 etapas

---

## Princípios de modelagem

No SADEP, os instrumentos de avaliação devem ser entendidos em três camadas complementares:

### 1. Conteúdo funcional
É o conteúdo preenchido pelos atores do processo, armazenado em entidades de domínio próprias, por exemplo:

- avaliação da chefia
- autoavaliação do servidor

Essa camada representa o **conteúdo de negócio** do instrumento.

### 2. Documento processual
É a formalização institucional do conteúdo, vinculada ao processo e à etapa.

Essa camada é representada por documento processual próprio, com:

- tipo documental
- versão
- status documental
- vínculo com processo e etapa
- signatários esperados
- identificador único

### 3. Assinaturas
As assinaturas não devem ser tratadas como simples flags booleanas no conteúdo funcional.

A assinatura recai sobre o **documento processual** correspondente e deve possuir trilha própria, com:

- usuário signatário
- papel do signatário
- data/hora
- status da assinatura
- provider
- referência do ato de assinatura

---

## Instrumentos oficiais do Caso 2 — 4 etapas

No modelo atual do projeto, o **Caso 2 — 4 etapas** utiliza os seguintes anexos normativos:

- **Anexo I**
- **Anexo II**
- **Anexo III**
- **Anexo IV**
- **Anexo V**

Esses anexos não possuem o mesmo papel no fluxo.

---

## Composição por tipo de instrumento

### Avaliação da chefia imediata
A avaliação da chefia, no Caso 2 — 4 etapas, é composta por:

- **Anexo I**
- **Anexo II**
- **Anexo IV**
- **Anexo III** somente na **4ª etapa**

### Autoavaliação do servidor-estagiário
A autoavaliação do servidor corresponde ao:

- **Anexo V**

---

## Composição por etapa

| Etapa | Instrumentos da chefia | Autoavaliação |
|---|---|---|
| 1ª etapa | Anexos I, II e IV | Anexo V |
| 2ª etapa | Anexos I, II e IV | Anexo V |
| 3ª etapa | Anexos I, II e IV | Anexo V |
| 4ª etapa | Anexos I, II, III e IV | Anexo V |

---

## Papéis dos anexos

## Anexo I — Ficha de orientações ao servidor-estagiário

### Função
Formaliza a ciência/orientação inicial relacionada ao acompanhamento e avaliação da etapa.

### Natureza no processo
É peça formal associada à etapa, contendo identificação funcional e espaço de assinatura dos envolvidos.

### Participantes esperados
- chefia imediata
- servidor-estagiário

### Observação de modelagem
No backend, sua existência deve ser considerada como parte da composição documental da avaliação da chefia, ainda que sua materialização física completa em PDF possa ocorrer em fase posterior.

---

## Anexo II — Ficha de acompanhamento do período

### Função
Registra acompanhamento do período avaliatório da etapa.

### Natureza no processo
É instrumento de acompanhamento vinculado à etapa e à avaliação da chefia.

### Participante principal de preenchimento
- chefia imediata

### Observação de modelagem
Seu conteúdo integra o conjunto da avaliação da chefia e deve ser tratado como parte do instrumento formal da etapa.

---

## Anexo III — Ficha complementar da 4ª etapa

### Função
Aplicável somente à **4ª etapa**, no período final do estágio probatório.

### Natureza no processo
Instrumento complementar de fechamento da etapa final, com papel específico sobre a média da 4ª etapa.

### Regra especial
O **Anexo III somente existe na 4ª etapa**.

Ele não deve ser incluído:

- na 1ª etapa
- na 2ª etapa
- na 3ª etapa

### Impacto no domínio
A existência do Anexo III é uma **exceção normativa explícita** e deve ser respeitada em qualquer modelagem futura mais detalhada da 4ª etapa.

### Observação importante
A lógica normativa do Anexo III deve ser documentada desde já, mas sua modelagem funcional detalhada pode ficar para incremento posterior, desde que o backend não assuma incorretamente que todos os anexos existem em todas as etapas.

---

## Anexo IV — Ficha de avaliação de desempenho

### Função
É o núcleo técnico da avaliação da chefia imediata.

### Natureza no processo
Contém:

- fatores de avaliação
- subfatores
- pontuações
- médias
- conceito administrativo final
- bloco de validação/assinaturas

### Estrutura funcional esperada
A avaliação da chefia deve evoluir para refletir, de forma aderente ao instrumento oficial, ao menos estes blocos:

- identificação do servidor e da chefia
- informações do período avaliatório
- texto contextual da unidade e do servidor
- considerações sobre o período
- fatores de avaliação
- subfatores pontuáveis
- média por fator
- soma das médias
- média da etapa
- conceito final
- seção de validação documental

### Fatores oficiais da avaliação
No instrumento oficial, a avaliação é organizada em cinco fatores:

- **Assiduidade**
- **Disciplina**
- **Capacidade de iniciativa**
- **Produtividade**
- **Responsabilidade**

### Observação de modelagem
O backend não deve tratar a avaliação da chefia, no médio prazo, como campo textual genérico. O modelo de domínio deve evoluir para refletir a estrutura oficial do instrumento.

No entanto, essa aderência completa pode ser implementada em incrementos próprios, desde que o projeto preserve, desde já, a semântica documental correta.

---

## Anexo V — Autoavaliação do servidor-estagiário

### Função
É o instrumento formal da autoavaliação do servidor na etapa.

### Participante principal de preenchimento
- servidor-estagiário

### Participante posterior de validação documental
- chefia imediata

### Estrutura funcional esperada
No MVP e nos incrementos iniciais, a autoavaliação pode ser tratada como instrumento mais simples, contendo ao menos:

- identificação contextual derivada do processo e da etapa
- texto principal da autoavaliação
- observações adicionais facultativas
- formalização documental
- assinaturas exigidas

### Observação de modelagem
A autoavaliação é artefato **distinto** da avaliação da chefia e não deve ser embutida como campo complementar da avaliação principal.

---

## Regra documental central do ciclo da etapa

No fluxo do SADEP, a etapa somente deve ser considerada documentalmente completa quando houver:

### Documento 1 — Avaliação da chefia imediata
Documento formal composto pelos anexos aplicáveis da etapa, com:

- conteúdo concluído pela chefia
- assinatura da chefia
- assinatura do servidor-estagiário

### Documento 2 — Autoavaliação do servidor-estagiário
Documento formal composto pelo Anexo V, com:

- conteúdo concluído pelo servidor
- assinatura do servidor-estagiário
- assinatura da chefia imediata

### Regra de completude
O envio do processo à CESAD depende da existência simultânea e válida desses dois documentos, com suas assinaturas obrigatórias concluídas.

---

## Assinaturas exigidas por documento

| Documento | Assinaturas esperadas |
|---|---|
| Avaliação da chefia | chefia imediata + servidor-estagiário |
| Autoavaliação do servidor | servidor-estagiário + chefia imediata |

---

## Regra de ordem do ciclo documental

A ordem funcional atualmente esperada é:

1. a chefia preenche a avaliação da etapa
2. a chefia conclui/submete a avaliação
3. nasce o documento formal da avaliação da chefia
4. a chefia consta como signatária originária desse documento
5. o servidor visualiza e assina a avaliação da chefia
6. o servidor preenche sua autoavaliação
7. nasce o documento formal da autoavaliação
8. o servidor consta como signatário originário da autoavaliação
9. a chefia visualiza e assina a autoavaliação
10. com ambos os documentos completos, o processo torna-se apto ao envio à CESAD

---

## Bloqueios operacionais obrigatórios

### Sobre a avaliação da chefia
Após a assinatura do servidor no documento da avaliação da chefia:

- a chefia não pode mais retificar livremente a avaliação
- o conteúdo deve ser considerado bloqueado no fluxo regular
- qualquer correção posterior exige fluxo específico de devolução/ajuste, e não simples edição direta

### Sobre a autoavaliação
Após a assinatura do servidor em sua autoavaliação:

- o servidor não pode mais editar livremente o conteúdo
- a chefia apenas visualiza e assina
- após a assinatura da chefia, o documento deve ficar fechado

### Sobre o envio à CESAD
O processo não pode avançar para análise da comissão se houver:

- documento obrigatório ausente
- assinatura obrigatória pendente
- documento ainda em rascunho
- documento incoerente com a etapa
- signatário inválido
- composição documental incompatível com a etapa

---

## Regra especial da 4ª etapa

A 4ª etapa possui regra diferenciada, pois nela incide o **Anexo III**.

### Regra mínima já consolidada
- o Anexo III somente se aplica à 4ª etapa
- a 4ª etapa não deve ser modelada como mera repetição idêntica das etapas 1, 2 e 3
- qualquer implementação futura do instrumento completo da 4ª etapa deve respeitar a lógica complementar do Anexo III

### Diretriz para o backend
Mesmo que a lógica detalhada do Anexo III seja implementada em incremento posterior, o domínio e a documentação não devem pressupor que todas as etapas possuem exatamente a mesma composição documental.

---

## Relação com workflow

Os instrumentos de avaliação não alteram o estado macro do processo por conta própria.

A mudança de estado do processo deve ocorrer somente pela engine de workflow.

### Diretriz
- avaliação da chefia concluída pode levar o processo a `AGUARDANDO_ASSINATURA`
- a completude documental da etapa pode habilitar a transição para `EM_ANALISE_CESAD`
- documentos e assinaturas devem atuar como pré-condições e evidências do fluxo, nunca como fonte autônoma de transição fora da state machine

---

## Relação com auditoria

Toda ação relevante sobre os instrumentos deve gerar trilha auditável, incluindo, quando aplicável:

- criação do conteúdo
- salvamento parcial
- conclusão/submissão
- criação do documento processual
- assinatura da chefia
- assinatura do servidor
- bloqueio por fechamento
- eventual retorno para ajuste
- encaminhamento à CESAD

A auditoria deve distinguir:

- eventos do artefato funcional
- eventos documentais
- eventos de workflow

---

## Diretrizes para implementação incremental

## O que pode entrar antes
É aceitável implementar primeiro:

- conteúdo funcional inicial
- documento processual lógico
- assinaturas com trilha forte
- bloqueios mínimos
- integração com workflow

## O que pode ser posterior
Pode ficar para incrementos posteriores:

- aderência completa de todos os campos do Anexo IV
- cálculo detalhado de médias e conceito final
- lógica completa do Anexo III
- geração física de PDF
- notificações automatizadas
- integração com assinatura avançada externa

---

## Decisões arquiteturais já fixadas por este documento

1. Os anexos oficiais são instrumentos normativos do domínio, não apenas referências visuais.
2. A avaliação da chefia e a autoavaliação são artefatos distintos.
3. A assinatura incide sobre o documento processual, não apenas sobre o conteúdo lógico.
4. A avaliação da chefia exige assinatura da chefia e do servidor.
5. A autoavaliação exige assinatura do servidor e da chefia.
6. O envio à CESAD depende da completude documental da etapa.
7. O Anexo III é exclusivo da 4ª etapa.
8. O backend deve preservar a diferença entre conteúdo funcional, documento processual e assinatura.

---

## Fora de escopo deste documento

Este documento não define:

- layout final de telas
- formato visual de PDF
- tecnologia de storage
- provedor externo de assinatura
- regras completas de CESAD, homologação, notificação e ciência
- modelagem final detalhada de todos os campos e cálculos do Anexo IV

Esses pontos devem ser tratados em documentos e incrementos específicos.

---

## Referências de origem

Este documento foi consolidado a partir de:

- documentos de contexto do projeto SADEP
- documentação funcional e arquitetural já existente
- revisão do código atual do backend
- anexos normativos do modelo de avaliação de **4 etapas — 2º caso**
- esclarecimentos funcionais adicionais fornecidos durante a evolução do projeto