# SKILL: workflow-engine

## Objetivo

Criar e gerenciar fluxos processuais baseados em estados para o sistema AEP-PA, tratado como processo administrativo formal, com transições controladas, auditáveis e juridicamente coerentes.

---

## Quando usar

Use esta skill sempre que:

- criar ou alterar estados do processo
- implementar transições
- validar fluxo administrativo
- bloquear ações por estado
- integrar assinatura, documentos e auditoria ao fluxo processual
- modelar efeitos processuais de parecer, homologação, notificação e recurso
- avaliar impacto de regras do Caso 2 com 4 etapas

---

## Estrutura gerada

- state machine
- transition rules
- guards (validações)
- eventos do sistema
- integração com auditoria
- integração com documentos processuais
- integração com assinaturas
- integração com prazos recursais e bloqueios temporais, quando aplicável

---

## Estados macro do processo

Estados padrão obrigatórios:

- EM_AVALIACAO
- AGUARDANDO_ASSINATURA
- ASSINADO
- EM_ANALISE_CESAD
- PARECER_EMITIDO
- HOMOLOGADO
- NOTIFICADO
- CIENTE
- ENCERRADO

---

## Interpretação dos estados

### EM_AVALIACAO
Estado em que a etapa está sendo instruída e preenchida pela chefia imediata.

### AGUARDANDO_ASSINATURA
Estado em que a avaliação da chefia já foi concluída e o processo aguarda a conclusão do ciclo documental e de assinaturas exigidas do servidor e da chefia, conforme os documentos obrigatórios da etapa.

### ASSINADO
Usar apenas quando houver ato formal único e completo de assinatura previsto no fluxo.  
Não usar como atalho genérico quando ainda existirem documentos pendentes.

### EM_ANALISE_CESAD
Estado em que a instrução documental obrigatória da etapa foi concluída e o processo foi encaminhado para análise da comissão.

### PARECER_EMITIDO
Estado em que já existe parecer formalmente emitido no escopo correspondente do fluxo.

**Importante:** este estado macro não distingue sozinho:
- parecer de etapa
- parecer conclusivo final

Essa diferenciação deve existir em camada complementar do domínio.

### HOMOLOGADO
Estado em que já houve ato formal de homologação pela autoridade competente.

### NOTIFICADO
Estado em que o resultado formal já foi comunicado ao servidor por notificação oficial.

### CIENTE
Estado em que houve registro formal de ciência do servidor.

### ENCERRADO
Estado de fechamento do processo no fluxo regular.

---

## Regra estrutural do Caso 2

No Caso 2, o AEP-PA representa:

- um único processo administrativo
- quatro etapas internas obrigatórias
- um ciclo documental por etapa
- parecer CESAD por etapa
- parecer conclusivo final após a 4ª etapa
- homologação apenas após parecer conclusivo final

### Regra de progressão

O fluxo natural do processo é:

1. etapas 1 a 4
2. parecer(es) da CESAD no escopo devido
3. parecer conclusivo final
4. homologação
5. notificação
6. ciência
7. encerramento
8. publicação/atos posteriores, quando aplicável

### Documento normativo complementar

Para o fluxo detalhado do Caso 2, consultar obrigatoriamente:

- `docs/workflow/four-stage-flow-and-appeals.md`

---

## Princípio de separação entre estado macro e estado interno

O `ProcessStatus` representa o **estado macro do processo**.

Ele **não deve** ser usado sozinho para representar todos os detalhes de:

- etapa atual
- escopo do parecer
- assinatura pendente
- prazo recursal
- recurso aberto
- reavaliação substitutiva
- suspensão pontual da fase contestada

### Diretriz
Sempre que possível, o detalhamento fino deve ser modelado em estruturas complementares, por exemplo:

- stage status
- appeal status
- opinion kind
- deadline fields
- document status
- flags derivadas do backend

### Objetivo
Evitar inflar o enum principal de estados macro com detalhes internos que pertencem a:
- etapa
- documento
- parecer
- recurso
- assinatura

---

## Regras obrigatórias

1. Nenhuma transição pode pular estados macro
2. Toda transição deve ser validada
3. Toda transição deve gerar evento
4. Toda transição deve gerar log de auditoria
5. O workflow é a única fonte de mudança de estado macro do processo
6. Documentos e assinaturas não podem alterar estado por fora da state machine
7. O avanço para a CESAD depende de completude documental e não apenas de uma ação isolada
8. A homologação final não pode ocorrer sem parecer conclusivo final
9. Recurso não pode ser aberto sem ciência/visualização válida do ato correspondente
10. Reavaliação substitutiva não pode apagar o histórico anterior

---

## Guardas críticas

### Guardas documentais
- impedir edição de avaliação da chefia após assinatura do servidor
- impedir edição de autoavaliação após assinatura do servidor
- impedir envio à CESAD sem documentos obrigatórios completos
- impedir envio à CESAD com assinatura pendente
- validar signatário esperado por documento
- validar que o documento pertence à etapa/processo corretos

### Guardas de parecer
- impedir parecer de etapa fora da etapa correspondente
- impedir parecer conclusivo final antes da completude das 4 etapas
- impedir parecer formalmente emitido sem assinaturas obrigatórias da CESAD
- impedir homologação sem parecer conclusivo final

### Guardas recursais
- impedir recurso antes da ciência/visualização válida
- impedir recurso fora do prazo de 5 dias
- impedir duplicidade indevida de recurso incompatível
- impedir reavaliação sem base formal do fluxo recursal
- impedir sobrescrita silenciosa da avaliação contestada

---

## Integrações obrigatórias

- audit log
- documentos processuais
- assinaturas
- notificações
- prazos e contadores temporais, quando aplicável

---

## Regras documentais relevantes

- a avaliação da chefia e a autoavaliação são artefatos distintos
- cada documento possui seu próprio ciclo de assinatura
- o processo pode permanecer em AGUARDANDO_ASSINATURA enquanto houver pendência documental
- o envio à CESAD somente ocorre quando todos os documentos obrigatórios da etapa estiverem completos
- o parecer de etapa e o parecer conclusivo final são documentos logicamente distintos, ainda que compartilhem o mesmo tipo documental-base
- a homologação atua sobre o parecer conclusivo final
- a notificação final atua como marco para o recurso final

---

## Regras recursais mínimas

### Recurso por etapa
- cabível contra o resultado/parecer da etapa
- dirigido à CESAD
- prazo de 5 dias a contar da ciência/visualização do resultado da etapa
- suspende a fase contestada no ponto cabível até resolução

### Recurso final
- cabível contra o resultado final homologado/notificado
- dirigido à autoridade homologadora
- prazo de 5 dias a contar da visualização/ciência da notificação
- suspende o resultado final no ponto cabível até resolução

### Reavaliação substitutiva
Quando houver reavaliação por recurso:
- nasce nova avaliação substitutiva
- a avaliação anterior não é apagada
- o fluxo formal deve reiniciar no ponto necessário
- a nova avaliação deve voltar ao ciclo documental correspondente

---

## Estratégia de modelagem recomendada

### Macroestado enxuto
Manter o `ProcessStatus` como representação macro do rito.

### Subestado complementar
Modelar detalhes finos em estruturas auxiliares, como por exemplo:

- `currentStageNumber`
- `opinionKind`
- `appealScope`
- `appealStatus`
- `appealDeadlineAt`
- `stageCompletionStatus`
- `finalOpinionEligible`

### Vantagem
Essa abordagem:
- preserva clareza do fluxo principal
- evita explosão de estados
- melhora a manutenção
- mantém aderência jurídica e rastreabilidade

---

## Exemplo de uso

- "Implementar fluxo de assinatura do servidor na avaliação da chefia usando workflow-engine"
- "Validar se o processo está apto ao parecer conclusivo final"
- "Impedir homologação sem as quatro etapas completas"
- "Modelar guarda de prazo para recurso por etapa"

---

## Proibições

- não implementar lógica de transição fora da state machine
- não permitir transições diretas via API sem catálogo/guarda
- não confiar em validação do frontend
- não usar status macro para representar detalhe interno de documento
- não enviar à CESAD apenas porque um documento foi assinado isoladamente
- não homologar sem parecer conclusivo final
- não abrir recurso fora do prazo
- não sobrescrever avaliação contestada sem trilha formal de substituição
- não usar o frontend para decidir elegibilidade processual

---

## Regra de prevalência

Na presença de conflito entre:

- conveniência de implementação
- simplificação excessiva de estados
- modelagem visual de interface
- ou interpretação parcial do fluxo

deve prevalecer:

1. a regra jurídica consolidada
2. a state machine oficial
3. os guards do backend
4. o documento `docs/workflow/four-stage-flow-and-appeals.md`
5. a trilha obrigatória de auditoria