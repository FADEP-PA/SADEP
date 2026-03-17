# SKILL: workflow-engine

## Objetivo

Criar e gerenciar fluxos processuais baseados em estados para o sistema AEP-PA.

---

## Quando usar

Use esta skill sempre que:

* criar ou alterar estados do processo
* implementar transições
* validar fluxo administrativo
* bloquear ações por estado

---

## Estrutura gerada

* state machine
* transition rules
* guards (validações)
* eventos do sistema
* integração com auditoria

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

## Regras obrigatórias

1. Nenhuma transição pode pular estados
2. Toda transição deve ser validada
3. Toda transição deve gerar evento
4. Toda transição deve gerar log de auditoria

---

## Exemplo de uso

"Implementar fluxo de assinatura do servidor usando workflow-engine"

---

## Validações críticas

* impedir edição após assinatura
* impedir avanço sem documentos obrigatórios
* validar assinaturas da CESAD
* validar prazo recursal

---

## Integrações obrigatórias

* audit log
* notificações
* documentos (quando aplicável)

---

## Proibições

* não implementar lógica fora da state machine
* não permitir transições diretas via API
* não confiar em validação do frontend
