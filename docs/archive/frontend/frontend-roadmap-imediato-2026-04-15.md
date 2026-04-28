# Frontend Roadmap Imediato — AEP-PA

**Status:** Diretriz operacional para desenvolvimento frontend  
**Versão:** 1.0.0  
**Data:** 2026-04-15  
**Escopo:** Organizar o que o dev frontend já pode implementar agora, com base no que já existe no frontend e no backend atual  
**Público-alvo:** Desenvolvedor frontend do AEP-PA

---

## 1. Objetivo deste documento

Este documento organiza, de forma prática, o que **já pode ser implementado no frontend agora**, sem depender de abrir frentes maiores do backend além do que já foi entregue.

A intenção é:

- evitar ociosidade do desenvolvimento frontend;
- transformar a base já existente em telas mais completas e úteis;
- preparar a interface para os próximos incrementos do backend;
- organizar o trabalho em tarefas pequenas, com escopo fechado e baixo risco de retrabalho.

---

## 2. Premissas

Este roadmap parte do estado atual já validado do frontend e do backend.

### 2.1. O que já existe no frontend
Já está entregue:

- autenticação real integrada ao backend;
- sessão persistente no navegador;
- rotas protegidas por perfil;
- shell autenticado;
- menu lateral por papel;
- tela técnica de consulta de processos;
- jornada funcional da chefia imediata;
- jornada funcional do servidor estagiário;
- área CESAD estruturada;
- área de homologação estruturada;
- componentes visuais reutilizáveis.  

Esses pontos já aparecem de forma concreta no relatório do frontend. :contentReference[oaicite:1]{index=1}

### 2.2. O que ainda não está funcionalmente pronto
Ainda não existem, no frontend atual, fluxos completos para:

- parecer CESAD de etapa;
- parecer conclusivo final;
- homologação funcional;
- notificação;
- ciência;
- recursos;
- portaria;
- visão completa das quatro etapas com linha do tempo processual. :contentReference[oaicite:2]{index=2}

### 2.3. Diretriz obrigatória
O frontend **não decide regra de negócio**.  
Toda elegibilidade, bloqueio, ação disponível, estado e prazo devem vir do backend.

---

## 3. Estratégia de execução

O trabalho do frontend, neste momento, deve seguir esta lógica:

1. **melhorar e consolidar as áreas já existentes**
2. **aprofundar a experiência visual de leitura processual**
3. **preparar as telas dos próximos perfis**
4. **deixar os espaços prontos para plug-in dos próximos endpoints**

A regra é simples:

- **não inventar workflow**
- **não simular decisão jurídica**
- **não criar fluxo final sem backend correspondente**
- **mas já preparar UX, estrutura visual e componentes reutilizáveis**

---

## 4. O que o dev frontend já pode implementar agora

---

## Bloco A — Consolidação da experiência atual

### A1. Refinar a tela `/processos`
A tela `/processos` já é funcional como workspace técnico. Agora ela pode evoluir para uma visão mais clara e operacional.

#### Pode implementar agora
- melhorar a organização visual dos blocos:
  - resumo do processo
  - ações disponíveis
  - histórico
  - documentos
  - bloqueios
- destacar melhor:
  - status do processo
  - última movimentação
  - ações liberadas
- melhorar mensagens de erro e estado vazio
- adicionar visualização mais amigável do histórico
- melhorar listagem dos processos consultados recentemente

#### Não deve fazer agora
- inferir ações novas
- calcular elegibilidade sem backend
- criar fluxo jurídico próprio

#### Resultado esperado
A tela `/processos` deixa de ser apenas técnica e passa a funcionar como **painel operacional de leitura do processo**.

---

### A2. Refinar a jornada da chefia imediata
A jornada da chefia já está funcional e é a área mais madura do frontend atual. :contentReference[oaicite:3]{index=3}

#### Pode implementar agora
- melhorar UX do formulário da avaliação:
  - agrupamento visual dos critérios
  - ordenação mais clara
  - feedback de validação por campo
  - mensagens de sucesso/erro mais explícitas
- melhorar exibição do estado atual da avaliação:
  - rascunho
  - submetida
  - retificável
  - bloqueada
- destacar melhor o contexto do processo:
  - status
  - etapa atual
  - bloqueios de edição
- melhorar o card do histórico do processo dentro da jornada da chefia
- melhorar visual de loading, bloqueio e ausência de permissão

#### Pode também preparar
- componentes reutilizáveis que depois servirão para:
  - reavaliação substitutiva
  - leitura de despacho
  - resposta da chefia a recurso

#### Não deve fazer agora
- fluxo de recurso da chefia
- despacho recursal
- reavaliação por recurso
- novas transições sem backend

---

### A3. Refinar a jornada do servidor estagiário
A jornada do servidor já possui consulta e assinatura da avaliação quando o backend libera. :contentReference[oaicite:4]{index=4}

#### Pode implementar agora
- melhorar a visualização do documento da avaliação da chefia
- melhorar o card de contexto documental:
  - status do documento
  - pendência de assinatura
  - quem já assinou
  - quem falta assinar
- melhorar a experiência da ação de assinatura
- melhorar mensagens de indisponibilidade:
  - assinatura não liberada
  - documento ainda ausente
  - visualização parcial
- organizar melhor a lista de processos consultados

#### Pode também preparar
- layout base para futura autoavaliação do servidor
- espaço reservado para futura leitura de parecer da etapa
- espaço reservado para prazo recursal da etapa

#### Não deve fazer agora
- recurso de etapa
- autoavaliação se o endpoint ainda não estiver pronto para uso na tela
- notificação final
- recurso final

---

## Bloco B — CESAD: o que já pode ser desenvolvido agora

O backend agora já possui leitura consolidada da etapa pela CESAD, em modo somente leitura, com guarda de momento processual, leitura por etapa, documentos, assinaturas e histórico. Esse é o melhor ponto para o frontend avançar agora.

### B1. Tornar a área `/cesad-comissao` realmente funcional como painel de leitura
Hoje ela ainda é espaço preparado/placeholder estruturado. :contentReference[oaicite:5]{index=5}

#### Pode implementar agora
- consumir a leitura consolidada da etapa pela CESAD
- transformar a tela em um workspace real de leitura da etapa
- exibir:
  - cabeçalho do processo
  - dados do servidor
  - número da etapa
  - status do processo
  - status da instrução documental
  - avaliação da chefia
  - autoavaliação
  - documentos da etapa
  - assinaturas
  - histórico resumido
  - warnings de compatibilidade/limitações, quando vierem do backend

#### Estrutura recomendada da tela
- bloco 1: processo e servidor
- bloco 2: status da etapa
- bloco 3: avaliação da chefia
- bloco 4: autoavaliação
- bloco 5: documentos da etapa
- bloco 6: assinaturas
- bloco 7: histórico resumido
- bloco 8: avisos e restrições

#### Não deve fazer agora
- editor de parecer
- botão de emitir parecer
- assinatura de parecer
- conclusão de parecer

---

### B2. Criar componentes reutilizáveis para o ciclo CESAD
Mesmo antes da implementação do parecer de etapa, o frontend já pode preparar componentes visuais que serão reaproveitados.

#### Pode implementar agora
Criar componentes como:

- `ProcessHeaderCard`
- `StageSummaryCard`
- `StageDocumentList`
- `SignatureTimeline`
- `StageHistoryPanel`
- `ProcessWarningsPanel`
- `ReadOnlyOpinionShell` (somente layout, sem lógica negocial ainda)

#### Vantagem
Quando o backend do parecer de etapa chegar, a tela da CESAD já estará pronta para acoplar o formulário/editor no lugar certo.

---

### B3. Preparar UX do parecer CESAD de etapa
Mesmo sem backend completo do parecer, o dev frontend já pode montar a estrutura visual.

#### Pode implementar agora
- layout da futura tela de parecer de etapa
- divisão visual entre:
  - leitura dos artefatos da etapa
  - área futura do parecer
  - status futuro das assinaturas
- componentes de formulário ainda desacoplados da persistência
- layout de “rascunho do parecer” sem envio real

#### Importante
Isso deve ser feito como:
- componente isolado
- sem integração final
- sem fingir que a feature já está pronta

---

## Bloco C — Homologação: o que já pode ser preparado

### C1. Evoluir a área `/homologacao-autoridade`
Hoje ela está estruturada, mas ainda sem fluxo processual completo. :contentReference[oaicite:6]{index=6}

#### Pode implementar agora
- transformar a página em um painel institucional melhor organizado
- preparar:
  - card de fila futura
  - card de parecer final
  - card de decisão homologatória
  - card de notificação final
- criar estados vazios e placeholders funcionais, não genéricos
- estruturar componentes reutilizáveis para:
  - leitura do parecer final
  - decisão homologatória
  - visualização da notificação

#### Não deve fazer agora
- homologar de fato
- assinar homologação
- gerar notificação
- recurso final

---

## Bloco D — Linha do tempo e visão por etapas

Esse é um dos melhores investimentos de frontend agora, porque ajuda várias áreas futuras.

### D1. Criar componente de timeline das 4 etapas
O relatório mostra que ainda não há visão completa por etapa com linha do tempo das quatro etapas. :contentReference[oaicite:7]{index=7}

#### Pode implementar agora
Criar um componente visual reutilizável para exibir:

- etapa 1
- etapa 2
- etapa 3
- etapa 4

com estados visuais como:
- não iniciada
- em andamento
- aguardando assinatura
- em análise CESAD
- parecer emitido
- concluída

#### Importante
Mesmo que o backend ainda não forneça todos os detalhes de cada etapa, o componente já pode ser preparado para receber:
- lista de etapas
- status por etapa
- etapa atual
- destaque visual da etapa selecionada

#### Onde será reutilizado
- `/processos`
- `/servidor-estagiario`
- `/chefia-imediata`
- `/cesad-comissao`
- futuramente homologação

---

### D2. Criar visualização padronizada de documentos por etapa
#### Pode implementar agora
Criar componente para mostrar, por etapa:

- avaliação da chefia
- autoavaliação
- parecer da etapa
- status do documento
- status de assinatura
- disponibilidade de leitura

Esse componente pode começar sendo usado na área CESAD e depois ser reaproveitado em outras áreas.

---

## Bloco E — Componentes transversais que já podem ser feitos

### E1. Melhorar semântica visual dos status
#### Pode implementar agora
Padronizar visualmente:

- status do processo
- status documental
- status de assinatura
- status da etapa
- status de leitura/bloqueio

#### Resultado esperado
Menos improviso por tela e mais consistência visual global.

---

### E2. Componentes de empty state / blocked state / warning state
#### Pode implementar agora
Padronizar estados como:

- processo não encontrado
- perfil sem permissão
- etapa ainda não disponível
- leitura ainda não liberada
- documento ausente
- assinaturas pendentes
- histórico insuficiente
- funcionalidade ainda não disponível

Isso já ajuda muito as áreas CESAD e homologação.

---

### E3. Resolver dívida visual/técnica pequena já detectada
O relatório aponta uma inconsistência de tipagem envolvendo `StatusBadge` e o valor `danger`. :contentReference[oaicite:8]{index=8}

#### Pode implementar agora
- corrigir essa divergência
- padronizar o vocabulário visual aceito por `StatusBadge`
- revisar usos espalhados do componente

---

## 5. O que ainda **não** deve ser puxado pelo frontend agora

Para evitar retrabalho, o dev frontend **não deve** implementar como feature final, neste momento:

- editor final de parecer CESAD com persistência completa
- assinatura de parecer CESAD
- parecer conclusivo final funcional
- homologação funcional
- geração de notificação
- registro de ciência
- recursos por etapa
- recurso final
- portaria
- DOE
- contadores recursais reais sem backend correspondente

Esses itens dependem de incrementos específicos do backend e de regras processuais já documentadas.

---

## 6. Roadmap recomendado para o dev frontend

---

## Fase 1 — ganho rápido e útil imediato
### Prioridade alta
1. Refinar `/processos`
2. Refinar `/chefia-imediata`
3. Refinar `/servidor-estagiario`
4. Corrigir tipagem/semântica do `StatusBadge`

### Entregável
Melhoria da experiência das áreas já operacionais, sem depender de novos endpoints.

---

## Fase 2 — CESAD entra em modo funcional de leitura
### Prioridade altíssima
5. Tornar `/cesad-comissao` um workspace real de leitura da etapa
6. Criar componentes:
   - `ProcessHeaderCard`
   - `StageSummaryCard`
   - `StageDocumentList`
   - `SignatureTimeline`
   - `StageHistoryPanel`
   - `ProcessWarningsPanel`

### Entregável
Área CESAD deixa de ser placeholder e vira painel real de leitura processual.

---

## Fase 3 — preparação dos próximos fluxos
### Prioridade média
7. Criar timeline visual das 4 etapas
8. Criar visualização padronizada de documentos por etapa
9. Criar layout base do futuro parecer CESAD de etapa
10. Estruturar melhor a área `/homologacao-autoridade` como painel preparado

### Entregável
Frontend pronto para acoplar os próximos incrementos do backend com menos retrabalho.

---

## 7. Sequência ideal de execução

### Ordem recomendada
1. ajuste de componentes transversais
2. refinamento de `/processos`
3. refinamento de `/chefia-imediata`
4. refinamento de `/servidor-estagiario`
5. implementação real da leitura em `/cesad-comissao`
6. criação da timeline de 4 etapas
7. criação da visualização por etapa/documentos
8. preparação visual da homologação
9. preparação visual do parecer de etapa

---

## 8. Regras para o dev frontend

1. **Não inventar regra jurídica**
2. **Não calcular elegibilidade sem backend**
3. **Não criar ação funcional sem endpoint correspondente**
4. **Preferir componentes reutilizáveis**
5. **Preparar layout futuro sem simular funcionalidade pronta**
6. **Manter consistência com os contratos de `@aep-pa/contracts`**
7. **Respeitar a segregação por perfil já existente**
8. **Tratar warnings e bloqueios como parte da UX, não como erro visual**

---

## 9. Conclusão

O frontend do AEP-PA já possui base sólida e dois fluxos realmente operacionais: chefia imediata e servidor estagiário. O melhor uso do tempo do dev frontend agora não é “esperar o backend”, mas:

- consolidar essas áreas;
- transformar a área CESAD em leitura real;
- construir componentes e estruturas reutilizáveis;
- preparar a camada visual dos próximos incrementos.

O foco imediato deve ser: **fazer o frontend deixar de ter áreas apenas estruturadas e transformá-las em áreas operacionais de leitura e acompanhamento**, começando pela CESAD.