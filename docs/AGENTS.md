# AGENTS

## 1. Objetivo do Projeto

Este projeto implementa um Sistema de Avaliação de Estágio Probatório (AEP-PA), com foco em:

* segurança jurídica
* rastreabilidade completa
* automação de fluxos administrativos
* controle rigoroso de estados do processo

O sistema NÃO é um CRUD.

É um sistema orientado a estados (workflow processual). 

---

## 2. Princípios Arquiteturais (OBRIGATÓRIOS)

1. Orientação a estados
2. Imutabilidade após assinatura
3. Determinismo temporal
4. Regras centralizadas no backend
5. Auditoria obrigatória

Nenhuma implementação pode violar esses princípios. 

---

## 3. Arquitetura do Sistema

Camadas obrigatórias:

* domain → regras de negócio
* workflow → máquina de estados
* application → orquestração
* infrastructure → banco, auth, storage
* api → endpoints
* web → interface

---

## 4. Regras Críticas (NÃO VIOLAR)

* Avaliação assinada é imutável
* Parecer exige assinatura de todos os membros
* Recurso só pode ocorrer após ciência
* Portaria só pode ser emitida após ciência
* Chefia não pode alterar avaliação após assinatura

Violação dessas regras gera nulidade jurídica. 

---

## 5. Estados do Processo

Estados obrigatórios:

* EM_AVALIACAO
* AGUARDANDO_ASSINATURA
* ASSINADO
* EM_ANALISE_CESAD
* PARECER_EMITIDO
* HOMOLOGADO
* NOTIFICADO
* CIENTE
* ENCERRADO

Nenhuma transição pode ser feita fora da workflow-engine.

---

## 6. Regras de Implementação

ANTES de criar qualquer código:

1. Verificar se já existe implementação similar
2. Reutilizar serviços existentes
3. Não duplicar lógica
4. Garantir tipagem forte
5. Implementar validações no backend

---

## 7. Uso de Skills

O projeto utiliza apenas duas skills:

* workflow-engine
* process-document

### Regra:

Se envolver estado do processo → usar workflow-engine
Se envolver documento oficial → usar process-document

---

## 8. Auditoria (OBRIGATÓRIO)

Toda ação crítica deve registrar:

* usuário
* perfil
* data/hora
* ação
* estado do processo

Sem auditoria → implementação inválida

---

## 9. Proibições

Agentes NÃO podem:

* alterar regras jurídicas
* criar transições fora do workflow
* implementar lógica no frontend
* ignorar validação de estado
* modificar dados após assinatura

---

## 10. Workflow de Desenvolvimento

Para qualquer feature:

1. Identificar impacto no fluxo
2. Atualizar workflow se necessário
3. Implementar domínio
4. Criar API
5. Validar regras jurídicas
6. Garantir auditoria
7. Testar fluxo completo

---

## 11. Definição de MVP

Escopo atual:

* Caso 2 (ingresso após 31/07/2015)
* 4 etapas obrigatórias
* fluxo completo até homologação

Funcionalidades fora do MVP não devem ser implementadas.
