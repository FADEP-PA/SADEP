# SKILL: process-document

## Objetivo

Gerar documentos oficiais do processo administrativo com validade jurídica.

---

## Quando usar

Use esta skill para:

* gerar PDF de avaliação
* gerar parecer da CESAD
* gerar notificações
* estruturar portarias

---

## Requisitos obrigatórios

Todo documento deve conter:

* identificação do servidor
* identificação do processo
* data e hora
* responsável
* histórico relevante
* estrutura institucional

---

## Tipos de documentos

* Avaliação
* Parecer
* Notificação
* Portaria

---

## Estrutura padrão

* cabeçalho institucional
* corpo do documento
* seção de assinaturas
* metadados
* hash ou identificador único

---

## Integração obrigatória

* audit log
* storage (S3 ou equivalente)
* workflow (estado atual)

---

## Regras críticas

* documento após assinatura é imutável
* deve refletir fielmente o estado do processo
* deve ser gerado de forma assíncrona

---

## Exemplo de uso

"Gerar PDF do parecer final usando process-document"

---

## Proibições

* não gerar documento sem estado válido
* não permitir edição após geração oficial
* não armazenar documento fora do storage definido
