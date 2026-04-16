# AEP-PA Backend Implementation Tracker

**Status:** Controle operacional das implementações do backend  
**Versão:** 1.0.0  
**Data:** 2026-04-16  
**Objetivo:** Registrar, controlar e acompanhar as implementações do backend do AEP-PA com suporte a execução por agente de IA e validação humana.

---

## Finalidade deste documento

Este documento funciona como o **tracker oficial das implementações do backend**.

Ele deve ser usado para:

- indicar qual feature está ativa no momento;
- indicar qual task específica deve ser implementada;
- controlar o que está pendente e o que já foi concluído;
- servir de referência para prompts de implementação e de auditoria;
- evitar que o agente avance fora do escopo autorizado;
- manter histórico operacional do backend até o encerramento do projeto.

Ao final do ciclo de desenvolvimento do backend, este documento poderá ser arquivado.

---

## Regras de uso

- `[ ]` = item não iniciado
- `[x]` = item concluído e aprovado
- um item **não deve** ser marcado como concluído apenas porque houve geração de código
- um item só pode ser marcado como `[x]` após:
  - implementação
  - revisão
  - auditoria, quando aplicável
  - aprovação humana
- o agente de IA deve sempre ser instruído a:
  - consultar este documento antes de implementar
  - trabalhar em apenas um item por vez
  - não avançar para outros itens sem autorização
  - não marcar itens como concluídos sem instrução explícita

---

## Regra operacional para uso com Codex

Sempre que uma nova implementação for iniciada, o prompt deve indicar explicitamente:

1. o arquivo a ser consultado:
   - `docs/backend-implementation-tracker.md`
2. a feature ativa
3. a task específica autorizada
4. a proibição de avançar para outras tasks
5. a proibição de marcar o item como concluído sem autorização

---

## Estado atual

### Feature ativa
**Correções estruturais do backend antes da retomada dos incrementos funcionais**

### Contexto atual
Estamos concluindo correções estruturais e de integridade no backend antes de seguir com os próximos incrementos funcionais do fluxo processual.

Itens já corrigidos recentemente fora deste tracker inicial:
- saneamento do pipeline de validação do backend
- correção de `artifactPath` no fluxo documental
- integridade de assinaturas em `SignatureRecord`

Esses itens já foram tratados e aprovados, então o tracker começa, neste momento, pela próxima implementação ativa.

---

# Tasks do backend

## Bloco 1 — Correções estruturais correntes

### [ ] BE-STR-01 — Modelar signatários esperados do parecer CESAD

**Objetivo**  
Permitir que o parecer CESAD suporte múltiplas assinaturas de membros distintos da comissão, sem quebrar a integridade dos documentos simples que continuam exigindo apenas um signatário por papel.

**Motivação**  
A regra atual de assinatura funciona para documentos com um signatário por papel, mas não atende o caso real do parecer CESAD, que exige três assinaturas de membros distintos da CESAD.

**Escopo**
- modelar entidade específica para os signatários esperados do parecer CESAD
- ajustar `schema.prisma`
- criar migration correspondente
- ligar a modelagem ao documento/processo/etapa/usuário, conforme a arquitetura real
- preparar a base para os próximos incrementos de formalização e assinatura do parecer CESAD
- criar ou ajustar testes mínimos da nova modelagem

**Fora do escopo**
- implementar a assinatura final do parecer CESAD
- gerar PDF
- emitir documento formal final
- parecer conclusivo final
- homologação
- frontend
- refatoração global de todo o sistema de assinatura

**Critério de conclusão**
- a modelagem de signatários esperados do parecer CESAD existir e estar coerente com o domínio
- a base ficar pronta para múltiplos membros distintos da CESAD no mesmo parecer
- os documentos simples existentes não serem quebrados
- schema, migration e testes mínimos estarem consistentes

**Observações**
- esta task não substitui `SignatureRecord`; ela adiciona uma camada de modelagem específica para o parecer CESAD
- a separação entre “signatário esperado” e “assinatura efetiva” deve ficar explícita

---

## Bloco 2 — Correções pendentes do checklist

### [ ] BE-STR-02 — Corrigir a regra de retificação ligada ao estado das assinaturas

**Objetivo**  
Tornar a regra de retificação da avaliação da chefia determinística e robusta, sem depender de leitura frágil do estado das assinaturas.

**Escopo**
- revisar `canRectifySupervisorEvaluation`
- alinhar a regra ao modelo íntegro de assinaturas
- ajustar testes automatizados dos cenários relevantes

**Fora do escopo**
- alterações amplas no fluxo documental
- alterações de frontend
- novos fluxos processuais

**Dependência**
- integridade de assinaturas precisa estar estabilizada

---

## Bloco 3 — Dívida técnica controlada

### [ ] BE-TECH-01 — Migrar configuração depreciada do Prisma

**Objetivo**  
Remover o uso de `package.json#prisma` e migrar para configuração compatível com as próximas versões do Prisma.

**Escopo**
- introduzir `prisma.config.ts` ou equivalente recomendado
- ajustar scripts relacionados
- validar geração e seed

**Fora do escopo**
- alteração de domínio
- migrações funcionais do processo

---

## Bloco 4 — Próximos incrementos funcionais do processo

> Estes itens serão detalhados depois que as correções estruturais prioritárias forem concluídas.

### [ ] BE-FLOW-10C — Formalização documental do parecer CESAD de etapa
### [ ] BE-FLOW-10D — Assinaturas do parecer CESAD de etapa
### [ ] BE-FLOW-11A — Elegibilidade para parecer conclusivo final
### [ ] BE-FLOW-11B — Artefato funcional do parecer conclusivo final
### [ ] BE-FLOW-11C — Formalização e assinaturas do parecer conclusivo final
### [ ] BE-FLOW-12A — Fila e leitura da homologação
### [ ] BE-FLOW-12B — Registro formal da homologação
### [ ] BE-FLOW-13A — Geração da notificação final
### [ ] BE-FLOW-13B — Registro de ciência
### [ ] BE-FLOW-14A — Abertura do recurso por etapa
### [ ] BE-FLOW-14B — Despacho da CESAD no recurso de etapa
### [ ] BE-FLOW-14C — Resposta da chefia ao recurso de etapa
### [ ] BE-FLOW-14D — Avaliação substitutiva
### [ ] BE-FLOW-14E — Abertura do recurso final
### [ ] BE-FLOW-15A — Fila de elegibilidade para portaria
### [ ] BE-FLOW-15B — Geração da portaria

---

## Ordem de trabalho atual recomendada

1. **BE-STR-01 — Modelar signatários esperados do parecer CESAD**
2. **BE-STR-02 — Corrigir a regra de retificação ligada ao estado das assinaturas**
3. **BE-TECH-01 — Migrar configuração depreciada do Prisma**
4. Retomar os incrementos funcionais a partir do **10C**

---

## Instrução padrão para prompts futuros

Sempre que um agente de IA for usado, o prompt deve seguir esta lógica:

- consultar `docs/backend-implementation-tracker.md`
- localizar a feature ativa
- localizar a task autorizada
- implementar somente aquela task
- não avançar para a próxima
- não marcar como concluída sem autorização explícita

---

## Encerramento

Este documento deverá ser mantido atualizado durante a evolução do backend.  
Ao final do ciclo de implementações do backend, ele poderá ser movido para uma pasta de histórico ou arquivamento.