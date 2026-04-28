# SKILL: process-document

## Objetivo

Estruturar e gerenciar documentos oficiais do processo administrativo do AEP-PA, com validade processual, rastreabilidade, vínculo com o workflow, suporte a assinaturas e aderência ao modelo do Caso 2 com 4 etapas.

---

## Quando usar

Use esta skill para:

- criar documento formal da avaliação da chefia
- criar documento formal da autoavaliação do servidor
- gerar parecer CESAD de etapa
- gerar parecer CESAD conclusivo final
- estruturar registro documental de homologação
- gerar notificações
- estruturar portarias
- reservar ou estruturar artefatos documentais mínimos dos recursos
- controlar versão, imutabilidade e assinaturas de documentos processuais

---

## Conceito central

No AEP-PA, documento processual não é apenas arquivo PDF.

Um documento oficial pode existir primeiro como **artefato lógico do processo**, vinculado:

- ao processo
- à etapa, quando aplicável
- ao conteúdo funcional correspondente
- ao estado documental
- às assinaturas exigidas

Somente depois esse documento pode gerar sua representação física em PDF.

### Regra central
**PDF não é a única fonte da verdade do documento.**

A fonte principal deve ser o documento lógico/processual estruturado no sistema.

### Regra de `artifactPath`
`artifactPath` representa apenas a materialização física do documento, como PDF oficial ou artefato equivalente em storage.

Regras:
- o `ProcessDocument` pode existir antes do artefato físico
- `artifactPath` só deve ser preenchido quando esse artefato realmente existir
- ausência de artefato deve ser representada por `null`
- string vazia não é valor válido para `artifactPath`

---

## Regra estrutural do Caso 2

No Caso 2, o AEP-PA representa:

- um único processo administrativo
- quatro etapas internas obrigatórias
- documentos próprios por etapa
- parecer CESAD por etapa
- parecer conclusivo final após a 4ª etapa
- homologação apenas após o parecer final

Essa estrutura deve ser respeitada em toda criação documental.

---

## Requisitos obrigatórios

Todo documento deve conter ou referenciar, conforme seu tipo:

- identificação do servidor
- identificação do processo
- identificação da etapa, quando houver
- tipo do documento
- escopo do documento, quando necessário
- data e hora
- responsável pela geração
- versão do documento
- histórico relevante
- seção de assinaturas
- identificador único
- vínculo com o estado atual do processo
- referência de superação/invalidação, quando aplicável

---

## Tipos documentais principais

O domínio documental deve, no mínimo, suportar:

- Avaliação da Chefia
- Autoavaliação do Servidor
- Parecer CESAD de Etapa
- Parecer CESAD Conclusivo Final
- Registro de Homologação
- Notificação
- Registro de Ciência
- Portaria

### Artefatos documentais mínimos adicionais
O domínio também deve reservar espaço para:

- Recurso de Etapa
- Despacho da CESAD no recurso de etapa
- Resposta da Chefia no recurso de etapa
- Recurso Final

Nem todos esses artefatos precisam nascer imediatamente como `ProcessDocument` completo, mas devem ter modelagem compatível com rastreabilidade formal futura.

---

## Estrutura padrão do documento processual

Todo documento oficial deve possuir ou permitir derivar:

- cabeçalho institucional
- corpo do documento
- seção de assinaturas
- metadados
- identificador único
- vínculo com processo
- vínculo com etapa, quando aplicável
- vínculo com o conteúdo funcional de origem
- status documental
- versão
- informação de superação, se houver

### Metadados mínimos recomendados

- `processId`
- `stageId` ou referência equivalente, quando aplicável
- `documentType`
- `documentStatus`
- `version`
- `generatedBy`
- `generatedAt`
- `finalSignedAt`, quando houver
- `storageKey`, quando houver PDF
- `supersededByDocumentId`, quando aplicável
- `supersedesDocumentId`, quando aplicável

---

## Regras de criação por tipo

### 1. Documento da avaliação da chefia
O documento da avaliação da chefia nasce a partir da conclusão/submissão da avaliação da etapa pela chefia imediata.

Regras:
- deve estar vinculado à etapa correta
- deve registrar a chefia como signatária originária
- deve prever assinatura posterior do servidor
- não pode ser confundido com autoavaliação

---

### 2. Documento da autoavaliação
O documento da autoavaliação nasce a partir da conclusão/submissão da autoavaliação do servidor.

Regras:
- deve estar vinculado à etapa correta
- deve registrar o servidor como signatário originário
- deve prever assinatura posterior da chefia
- não pode ser embutido como campo da avaliação da chefia

---

### 3. Documento do parecer CESAD de etapa
O parecer CESAD de etapa nasce da análise da comissão sobre uma etapa específica.

Regras:
- deve estar vinculado ao processo e à etapa correspondente
- deve distinguir explicitamente que se trata de parecer de etapa
- deve prever assinaturas dos membros obrigatórios da CESAD
- não pode ser considerado emitido sem completude de assinaturas
- não substitui avaliação nem autoavaliação

Campos de escopo recomendados:
- `opinionKind = STAGE`
- `stageNumber = 1 | 2 | 3 | 4`

---

### 4. Documento do parecer CESAD conclusivo final
O parecer conclusivo final nasce da consolidação das quatro etapas.

Regras:
- só pode ser criado após a elegibilidade documental do processo
- deve consolidar os resultados das quatro etapas
- deve diferenciar-se do parecer de etapa
- deve servir de base formal para homologação
- exige assinaturas dos membros obrigatórios da CESAD

Campos de escopo recomendados:
- `opinionKind = FINAL_CONCLUSIVE`
- `stageNumber = null`

---

### 5. Documento da homologação
O documento de homologação nasce do ato formal da autoridade homologadora.

Regras:
- deve referenciar o parecer conclusivo final
- não deve ser criado sem processo apto à homologação
- deve registrar a autoridade homologadora como signatária
- deve servir de base para a notificação final

---

### 6. Documento da notificação
A notificação nasce por template institucional a partir do processo homologado.

Regras:
- não nasce de formulário livre
- deve resolver automaticamente os dados do processo
- deve informar o prazo recursal final
- deve prever assinatura da autoridade homologadora
- deve servir como marco formal do recurso final

---

### 7. Registro de ciência
O registro de ciência nasce após a notificação, como ato formal do servidor.

Regras:
- deve ficar vinculado à notificação emitida
- deve registrar data/hora
- deve preservar prova do recebimento/ciência
- não deve ser simulado apenas por mudança de status

---

### 8. Documento da portaria
A portaria nasce por template institucional posterior, individual ou coletivo.

Regras:
- pode abranger múltiplos processos/servidores
- não deve ser modelada apenas como documento isolado por processo
- deve ter numeração sequencial única
- deve gerar PDF oficial e conteúdo copiável para DOE
- deve congelar os dados efetivamente publicados

---

## Regras de assinatura

### Regra central
A assinatura incide sobre o documento processual.

Nunca deve ser tratada apenas como flag booleana no conteúdo funcional.

### Requisitos da trilha de assinatura
Cada assinatura deve registrar, no mínimo:

- usuário
- papel esperado
- data/hora
- status da assinatura
- provider, quando houver
- identificador do ato de assinatura, quando houver

### Regra de coerência
O signatário deve ser validado contra:

- o tipo do documento
- o papel esperado
- o processo
- a etapa, quando aplicável

### Regra de completude
Documentos que exigem múltiplos signatários só podem ser tratados como formalmente completos quando todas as assinaturas obrigatórias estiverem concluídas.

---

## Integração obrigatória

Todo documento processual deve se integrar a:

- audit log
- workflow
- storage, quando houver representação física
- assinaturas
- regras de prazo, quando o documento abrir prazo recursal
- histórico de superação/invalidação, quando aplicável

---

## Regras críticas

- documento após assinatura obrigatória completa é imutável
- documento deve refletir fielmente o estado do processo e da etapa
- documento não pode ser criado fora de contexto processual válido
- documento não pode avançar workflow por conta própria
- geração física de PDF deve respeitar a versão oficial do documento lógico
- documento de etapa não pode ser reutilizado como documento de outra etapa
- parecer de etapa não pode ser tratado como parecer conclusivo final
- homologação não pode se basear apenas em parecer isolado de etapa
- reavaliação substitutiva não pode apagar documento anterior já formalizado

---

## Superação, substituição e histórico

### Princípio
No AEP-PA, correção posterior relevante não deve ocorrer por sobrescrita silenciosa de documento oficial.

### Estratégias admitidas
Quando houver necessidade de correção formal, o sistema deve usar uma destas abordagens:

- nova versão formal
- novo documento derivado
- documento invalidado ou superado
- vínculo explícito entre documento original e documento substitutivo

### Caso especial: avaliação substitutiva
Quando um recurso de etapa resultar em reavaliação:

- nasce nova avaliação substitutiva
- o documento anterior não é apagado
- o documento novo deve apontar a relação de substituição
- a trilha histórica deve permitir reconstruir o evento completo

---

## Regras específicas dos artefatos recursais

### Recurso de etapa
Pode ser modelado inicialmente como registro formal estruturado, com ou sem `ProcessDocument` próprio.

Deve conter ou permitir derivar:
- processo
- etapa
- autor do recurso
- data/hora
- fundamento textual
- prazo recursal observado

### Despacho da CESAD no recurso
Deve permitir:
- referência ao recurso
- referência à etapa
- encaminhamento à chefia
- trilha auditável

### Resposta da chefia
Deve permitir:
- decisão de manter ou reavaliar
- justificativa
- anexo opcional, quando aplicável
- vínculo com o recurso e a etapa

### Recurso final
Deve permitir:
- vínculo com a notificação
- data/hora
- fundamento textual
- identificação do servidor
- controle de prazo

---

## Exemplo de uso

- "Criar documento processual da avaliação da chefia da 3ª etapa e registrar assinaturas esperadas"
- "Gerar documento lógico do parecer CESAD da 2ª etapa"
- "Criar documento do parecer conclusivo final após as quatro etapas"
- "Modelar superação formal de avaliação contestada por recurso"

---

## Proibições

- não gerar documento sem estado válido
- não permitir edição após fechamento formal
- não armazenar documento oficial sem vínculo processual
- não tratar PDF como única fonte da verdade do documento
- não permitir assinatura em documento incoerente com a etapa ou com o signatário
- não usar parecer de etapa como base suficiente para homologação final
- não sobrescrever documento contestado sem trilha formal
- não confundir artefato recursal com simples comentário solto do sistema

---

## Regra de prevalência

Na presença de conflito entre:

- conveniência de implementação
- simplificação indevida do documento
- tentativa de usar PDF como fonte única
- ou interpretação parcial do fluxo

deve prevalecer:

1. o documento lógico/processual oficial
2. a coerência com o workflow
3. a trilha de assinatura
4. a imutabilidade pós-fechamento
5. a rastreabilidade histórica completa
