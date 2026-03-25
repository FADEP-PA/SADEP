# SKILL: workflow-engine

## Objetivo

Criar e gerenciar fluxos processuais baseados em estados para o sistema AEP-PA, tratado como processo administrativo formal, com transições controladas, auditáveis e juridicamente coerentes.

---

## Quando usar

Use esta skill sempre que:

* criar ou alterar estados do processo
* implementar transições
* validar fluxo administrativo
* bloquear ações por estado
* integrar assinatura, documentos e auditoria ao fluxo processual

---

## Estrutura gerada

* state machine
* transition rules
* guards (validações)
* eventos do sistema
* integração com auditoria
* integração com documentos processuais
* integração com assinaturas

---

## Estados padrão

* EM_AVALIACAO
* AGUARDANDO_ASSINATURA
* ASSINADO
* EM_ANALISE_CESAD
* PARECER_EMITIDO
* HOMOLOGADO
* NOTIFICADO
* CIENTE
* ENCERRADO

---

## Interpretação dos estados

### EM_AVALIACAO
Estado em que a etapa está sendo instruída e preenchida pela chefia imediata.

### AGUARDANDO_ASSINATURA
Estado em que a avaliação da chefia já foi concluída e o processo aguarda a conclusão do ciclo documental e de assinaturas exigidas do servidor e da chefia, conforme os documentos obrigatórios da etapa.

### ASSINADO
Usar apenas quando houver ato formal único e completo de assinatura previsto no fluxo. Não usar como atalho genérico quando ainda existirem documentos pendentes.

### EM_ANALISE_CESAD
Estado em que a instrução documental obrigatória da etapa foi concluída e o processo foi encaminhado para análise da comissão.

---

## Regras obrigatórias

1. Nenhuma transição pode pular estados
2. Toda transição deve ser validada
3. Toda transição deve gerar evento
4. Toda transição deve gerar log de auditoria
5. O workflow é a única fonte de mudança de estado macro do processo
6. Documentos e assinaturas não podem alterar estado por fora da state machine
7. O avanço para a CESAD depende de completude documental e não apenas de uma ação isolada

---

## Guardas críticas

* impedir edição de avaliação da chefia após assinatura do servidor
* impedir edição de autoavaliação após assinatura do servidor
* impedir envio à CESAD sem documentos obrigatórios completos
* impedir envio à CESAD com assinatura pendente
* validar signatário esperado por documento
* validar que a ação parte do perfil correto
* validar que o documento pertence à etapa/processo corretos

---

## Integrações obrigatórias

* audit log
* documentos processuais
* assinaturas
* notificações (quando aplicável)

---

## Regras documentais relevantes

* a avaliação da chefia e a autoavaliação são artefatos distintos
* cada documento possui seu próprio ciclo de assinatura
* o processo pode permanecer em AGUARDANDO_ASSINATURA enquanto houver pendência documental
* o envio à CESAD somente ocorre quando todos os documentos obrigatórios da etapa estiverem completos

---

## Exemplo de uso

"Implementar fluxo de assinatura do servidor na avaliação da chefia usando workflow-engine"

---

## Proibições

* não implementar lógica de transição fora da state machine
* não permitir transições diretas via API sem catálogo/guarda
* não confiar em validação do frontend
* não usar status macro para representar detalhe interno de documento
* não enviar à CESAD apenas porque um documento foi assinado isoladamente