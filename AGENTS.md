# AGENTS

## 1. Objetivo do Projeto

Este projeto implementa um Sistema de Avaliação de Desempenho de Estágio Probatório (SADEP), com foco em:

- segurança jurídica
- rastreabilidade completa
- automação de fluxos administrativos
- controle rigoroso de estados do processo

O sistema **NÃO** é um CRUD.

É um sistema orientado a estados, com workflow processual administrativo formal.

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

- domain → regras de negócio
- workflow → máquina de estados
- application → orquestração
- infrastructure → banco, auth, storage
- api → endpoints
- web → interface

---

## 4. Regras Críticas (NÃO VIOLAR)

- Avaliação assinada é imutável
- Parecer exige assinatura de todos os membros obrigatórios
- Recurso só pode ocorrer após ciência/visualização válida
- Portaria só pode ser emitida após ciência, salvo regra excepcional futura formalizada
- Chefia não pode alterar avaliação após assinatura
- Homologação final só pode ocorrer após o parecer conclusivo final
- Reavaliação por recurso não apaga histórico anterior; apenas supera formalmente o ato contestado

Violação dessas regras gera nulidade jurídica ou inconsistência processual grave.

---

## 5. Estrutura Processual do MVP

### Caso coberto

- **Caso 2** (ingresso após 31/07/2015)

### Modelo processual

- **1 processo administrativo**
- **4 etapas internas obrigatórias**
- cada etapa possui ciclo documental próprio
- há parecer CESAD por etapa
- após a 4ª etapa, pode haver parecer conclusivo final
- somente após o parecer conclusivo final o processo pode seguir para homologação, notificação e publicação

---

## 6. Estados do Processo

Estados macro obrigatórios:

- EM_AVALIACAO
- AGUARDANDO_ASSINATURA
- ASSINADO
- EM_ANALISE_CESAD
- PARECER_EMITIDO
- HOMOLOGADO
- NOTIFICADO
- CIENTE
- ENCERRADO

Nenhuma transição pode ser feita fora da `workflow-engine`.

### Observação importante

Estados macro do processo **não substituem** subestados internos de documento, parecer, recurso ou etapa.

Sempre que possível, detalhes internos devem ser modelados sem inflar indevidamente o estado macro do processo.

---

## 7. Regras do Fluxo de 4 Etapas

### Regra estrutural

No Caso 2:

- cada etapa possui avaliação da chefia
- assinatura do servidor na avaliação
- autoavaliação do servidor
- assinatura da chefia na autoavaliação
- parecer CESAD da etapa, quando concluído

### Regra de consolidação

Após a conclusão da 4ª etapa, o sistema pode habilitar:

- elaboração do parecer conclusivo final
- consolidação dos resultados das 4 etapas
- envio à autoridade homologadora

### Trava obrigatória

Antes disso, o sistema não deve:

- habilitar homologação final
- gerar notificação final
- liberar publicação de portaria

### Fonte normativa interna

O detalhamento oficial desse fluxo está no documento:

- `docs/workflow/four-stage-flow-and-appeals.md`

Esse documento deve prevalecer sobre interpretações simplificadas.

---

## 8. Recursos Administrativos

O domínio já reserva espaço para recursos, mesmo quando nem todos os fluxos estiverem implementados.

### Recurso por etapa

- cabível contra resultado/parecer da etapa
- dirigido à CESAD
- prazo de 5 dias da ciência/visualização do resultado da etapa
- suspende a fase contestada no ponto cabível

### Recurso final

- cabível contra resultado final homologado/notificado
- dirigido à autoridade homologadora
- prazo de 5 dias da visualização/ciência da notificação
- suspende o resultado final no ponto cabível

### Regra de reavaliação

No recurso de etapa, a chefia pode:

- manter a avaliação, com justificativa
- ou reavaliar o servidor

Quando houver reavaliação:

- nasce nova avaliação substitutiva
- há novo fluxo formal
- o histórico anterior não é apagado

---

## 9. Regras de Implementação

ANTES de criar qualquer código:

1. Verificar se já existe implementação similar
2. Reutilizar serviços existentes
3. Não duplicar lógica
4. Garantir tipagem forte
5. Implementar validações no backend
6. Verificar impacto no workflow
7. Verificar impacto documental
8. Verificar impacto em auditoria

---

## 10. Uso de Skills / Documentos-base

O projeto utiliza como referências obrigatórias, entre outras, as seguintes diretrizes:

- `docs/skills/workflow-engine-skill.md`
- `docs/skills/process-document-skill.md`
- `docs/domain/document-modeling-catalog.md`
- `docs/workflow/four-stage-flow-and-appeals.md`

### Regra de uso

- Se envolver estado do processo → usar `workflow-engine-skill`
- Se envolver documento oficial → usar `process-document-skill`
- Se envolver tipologia e ciclo de documentos → usar `document-modeling-catalog`
- Se envolver rito do Caso 2, 4 etapas, parecer final e recursos → usar `four-stage-flow-and-appeals`

---

## 11. Auditoria (OBRIGATÓRIO)

Toda ação crítica deve registrar, no mínimo:

- usuário
- perfil
- data/hora
- ação
- estado do processo, quando aplicável
- artefato funcional afetado, quando aplicável
- documento processual afetado, quando aplicável

Sem auditoria → implementação inválida.

---

## 12. Proibições

Agentes NÃO podem:

- alterar regras jurídicas ou procedimentais já consolidadas
- criar transições fora do workflow
- implementar lógica de decisão jurídica no frontend
- ignorar validação de estado
- modificar dados após assinatura
- tratar PDF como fonte única da verdade
- homologar processo sem parecer conclusivo final
- ignorar prazo recursal
- sobrescrever silenciosamente avaliação contestada em recurso

---

## 13. Workflow de Desenvolvimento

Para qualquer feature:

1. Identificar impacto no fluxo
2. Atualizar documentação normativa, se necessário
3. Implementar domínio
4. Implementar workflow/guards
5. Implementar API
6. Validar regras jurídicas
7. Garantir auditoria
8. Garantir coerência documental
9. Testar fluxo completo

---

## 14. Definição de MVP

Escopo atual do MVP:

- Caso 2
- 4 etapas obrigatórias
- ciclo documental por etapa
- análise CESAD por etapa
- parecer conclusivo final
- homologação final
- base preparada para notificação, ciência e recursos

Funcionalidades fora do MVP ou fora do incremento ativo não devem ser implementadas sem decisão explícita.

---

## 15. Regra de prevalência

Na presença de conflito entre:

- entendimento antigo do projeto
- simplificação de interface
- conveniência de implementação
- ou interpretação parcial do fluxo

deve prevalecer:

1. a regra jurídica consolidada
2. o workflow oficial do processo
3. a modelagem documental oficial
4. a auditoria obrigatória
5. os documentos normativos do repositório
