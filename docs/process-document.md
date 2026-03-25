# SKILL: process-document

## Objetivo

Estruturar e gerenciar documentos oficiais do processo administrativo do AEP-PA, com validade processual, rastreabilidade, vínculo com o workflow e suporte a assinaturas.

---

## Quando usar

Use esta skill para:

* criar documento formal da avaliação da chefia
* criar documento formal da autoavaliação do servidor
* gerar PDF de avaliação
* gerar parecer da CESAD
* gerar notificações
* estruturar portarias
* controlar versão, imutabilidade e assinaturas de documentos processuais

---

## Conceito central

No AEP-PA, documento processual não é apenas arquivo PDF.

Um documento oficial pode existir primeiro como artefato lógico do processo, vinculado à etapa, ao conteúdo funcional e às assinaturas exigidas, e somente depois gerar representação física em PDF.

---

## Requisitos obrigatórios

Todo documento deve conter ou referenciar:

* identificação do servidor
* identificação do processo
* identificação da etapa
* tipo do documento
* data e hora
* responsável pela geração
* versão do documento
* histórico relevante
* seção de assinaturas
* identificador único
* vínculo com o estado atual do processo

---

## Tipos de documentos

* Avaliação da Chefia
* Autoavaliação do Servidor
* Parecer da CESAD
* Notificação
* Portaria

---

## Estrutura padrão

* cabeçalho institucional
* corpo do documento
* seção de assinaturas
* metadados
* hash ou identificador único
* vínculo com processo e etapa

---

## Regras de criação

* o documento da avaliação da chefia nasce a partir da conclusão/submissão da avaliação da etapa
* o documento da autoavaliação nasce a partir da conclusão da autoavaliação do servidor
* cada documento deve registrar os signatários esperados
* documentos de etapas distintas não podem ser confundidos ou reutilizados

---

## Assinaturas

* assinatura incide sobre o documento processual
* cada documento pode exigir mais de um signatário
* o signatário deve ser validado pelo perfil esperado
* a trilha de assinatura deve registrar usuário, papel, data/hora, status e identificador do ato

---

## Integração obrigatória

* audit log
* workflow
* storage (quando houver representação física)
* assinaturas

---

## Regras críticas

* documento após assinatura obrigatória completa é imutável
* documento deve refletir fielmente o estado do processo e da etapa
* documento não pode ser criado fora de contexto processual válido
* documento não pode avançar workflow por conta própria
* geração física de PDF deve respeitar a versão oficial do documento lógico

---

## Exemplo de uso

"Criar documento processual da avaliação da chefia da 3ª etapa e registrar assinaturas esperadas"

---

## Proibições

* não gerar documento sem estado válido
* não permitir edição após fechamento formal
* não armazenar documento oficial sem vínculo processual
* não tratar PDF como única fonte da verdade do documento
* não permitir assinatura em documento incoerente com a etapa ou com o signatário