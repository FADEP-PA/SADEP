# Sprint 3B — Fluxo visual inicial das telas de processo

## Objetivo

Consolidar a experiência funcional inicial de leitura do processo administrativo no frontend, conectada ao workflow do backend, sem mover regras de negócio para a interface.

Este documento passa a considerar explicitamente o **Caso 2 com 4 etapas**, incluindo:

- leitura do processo por etapa;
- leitura dos documentos principais da etapa;
- leitura do parecer CESAD da etapa;
- leitura do parecer conclusivo final, quando existir;
- indicação visual de elegibilidade para homologação;
- indicação visual de prazo recursal por etapa e no resultado final.

---

## Princípios obrigatórios

- O frontend **não decide transições**.
- O frontend **não cria regras processuais**.
- O frontend **não calcula elegibilidade jurídica** por conta própria.
- Toda leitura de estado, ações e bloqueios depende do backend.
- Restrições por perfil são exibidas como feedback visual, sem tentativa de contorno pela interface.
- Contadores de prazo e indicadores visuais são apenas **representações da decisão do backend**, nunca fonte autônoma da verdade.

---

## Estrutura visual base da tela de processo

### 1. Entrada principal
- Rota autenticada inicial: `/(authenticated)/inicio`
- Componente central: `ProcessWorkspace`
- Ação principal: informar um `processId` e carregar dados reais do backend

### 2. Blocos funcionais mínimos da tela de processo
- **Listagem de processos**: mantém os últimos processos consultados ou a listagem retornada pelo backend
- **Perfis principais**: expõe contexto do perfil autenticado e dos papéis relevantes do processo
- **Status do processo**: mostra o estado macro retornado pelo workflow
- **Etapa atual / visão por etapas**: mostra em qual etapa o processo está e o status das etapas existentes
- **Ações disponíveis**: exibe somente as ações liberadas pelo backend para o perfil autenticado
- **Histórico resumido**: apresenta a última movimentação auditável relevante
- **Documentos principais**: lista documentos disponíveis no escopo visual do usuário
- **Prazos e alertas**: mostra indicadores de prazo, ciência, recurso e pendências
- **Detalhes técnicos**: apoia conferência da integração front-back
- **Bloqueios visuais**: sinaliza ausência de ações, ausência de histórico, restrição de perfil e processo encerrado

---

## Estrutura visual recomendada por blocos

### Bloco A — Cabeçalho do processo
Deve mostrar, no mínimo:

- identificador do processo
- nome do servidor
- cargo
- matrícula
- etapa atual ou última etapa concluída
- estado macro do processo
- perfil autenticado

### Bloco B — Linha do tempo / etapas
Deve mostrar, visualmente, as quatro etapas do Caso 2, com indicação de situação, por exemplo:

- não iniciada
- em andamento
- aguardando assinatura
- em análise CESAD
- com parecer emitido
- concluída

### Bloco C — Documentos da etapa selecionada
Para a etapa em foco, a interface deve poder exibir:

- avaliação da chefia
- autoavaliação
- parecer CESAD da etapa, quando existir

### Bloco D — Consolidação final
Quando o processo estiver elegível, a interface deve poder exibir:

- parecer conclusivo final
- elegibilidade para homologação
- homologação, quando existente
- notificação final, quando existente
- ciência, quando existente

### Bloco E — Recursos e prazos
A interface deve poder mostrar:

- prazo recursal da etapa
- prazo recursal final
- status do recurso
- data-limite
- contador regressivo
- situação de indisponibilidade após o prazo

---

## Estados visuais previstos

### Estado vazio
Quando nenhum processo foi carregado:

- a tela permanece pronta para uso
- a listagem aparece vazia ou com orientação inicial
- o workspace orienta o usuário a informar um identificador válido

### Estado carregado
Quando o backend retorna dados:

- a listagem recebe o processo consultado
- os cards de status, etapas, ações, histórico e documentos são preenchidos
- os bloqueios visuais são calculados apenas a partir da resposta do backend

### Estado de erro
Quando a consulta falha:

- a tela exibe `FeedbackAlert` com mensagem principal
- detalhes adicionais são mostrados quando a API fornece causas específicas

### Estado com bloqueios
Quando o processo existe, mas o usuário não pode praticar o ato:

- a interface mostra o dado
- a ação fica ausente, desabilitada ou contextualizada
- o motivo do bloqueio deve ser exibido visualmente, quando disponível

---

## Visões mínimas por perfil

## 1. Servidor-estagiário

### Objetivo da visão
Permitir que o servidor:

- acompanhe o andamento do processo
- visualize os documentos que lhe dizem respeito
- assine quando houver ação liberada
- visualize resultados da etapa
- recorra no prazo, quando cabível
- visualize notificação final
- registre ciência, quando cabível

### Blocos relevantes
- resumo do processo
- etapa atual
- avaliação da chefia
- autoavaliação
- parecer da etapa
- prazo recursal da etapa
- notificação final
- prazo recursal final
- ciência

### Ações possíveis visuais
- assinar avaliação da chefia
- preencher/submeter autoavaliação
- recorrer da etapa
- dar ciência da notificação
- recorrer do resultado final

### Regras visuais
- o botão de recurso da etapa só aparece se o backend indicar disponibilidade
- o botão de recurso final só aparece se o backend indicar disponibilidade
- o contador regressivo deve ser derivado dos dados do backend
- após o prazo, a ação deve aparecer como encerrada ou indisponível

---

## 2. Chefia imediata

### Objetivo da visão
Permitir que a chefia:

- preencha e conclua a avaliação da etapa
- acompanhe assinaturas
- assine a autoavaliação
- visualize o resultado da etapa
- responda a despacho recursal da CESAD, quando houver
- mantenha ou reavalie o servidor, conforme o fluxo recursal

### Blocos relevantes
- etapa atual
- formulário da avaliação
- status da assinatura do servidor
- autoavaliação do servidor
- resposta recursal pendente, quando houver
- histórico da etapa

### Ações possíveis visuais
- salvar rascunho da avaliação
- concluir avaliação
- assinar autoavaliação
- responder despacho recursal
- manter avaliação
- iniciar reavaliação substitutiva

### Regras visuais
- se a avaliação já estiver assinada pelo servidor, o frontend não deve oferecer edição livre
- se houver reavaliação substitutiva aberta, o frontend deve deixar claro que se trata de novo ciclo formal
- a resposta ao recurso deve aparecer apenas quando o backend indicar despacho pendente

---

## 3. CESAD

### Objetivo da visão
Permitir que a comissão:

- visualize processos/etapas sob análise
- leia a etapa consolidada
- elabore parecer de etapa
- acompanhe assinaturas do parecer
- identifique processos aptos ao parecer conclusivo final
- elabore o parecer conclusivo final
- processe recursos de etapa

### Blocos relevantes
- fila de processos em análise
- leitura consolidada da etapa
- documentos da etapa
- parecer de etapa
- assinaturas do parecer da etapa
- elegibilidade para parecer final
- parecer conclusivo final
- recursos de etapa

### Ações possíveis visuais
- abrir processo/etapa
- criar/editar parecer de etapa
- concluir parecer de etapa
- assinar parecer
- abrir parecer conclusivo final
- criar/editar parecer conclusivo final
- concluir parecer conclusivo final
- analisar recurso de etapa
- emitir despacho à chefia

### Regras visuais
- a interface deve distinguir claramente:
  - parecer de etapa
  - parecer conclusivo final
- o frontend não deve liberar parecer conclusivo final por iniciativa própria
- a elegibilidade para parecer final deve vir do backend
- recursos de etapa devem ser exibidos com etapa, prazo, status e ação disponível

---

## 4. Autoridade homologadora

### Objetivo da visão
Permitir que a autoridade:

- visualize processos aptos à homologação
- leia o parecer conclusivo final
- visualize o histórico consolidado
- homologue ou devolva, quando permitido
- assine homologação e notificação final
- analise recurso final

### Blocos relevantes
- fila de homologação
- parecer conclusivo final
- histórico do processo
- decisão homologatória
- notificação final
- recurso final, quando houver

### Ações possíveis visuais
- abrir processo apto
- homologar
- devolver
- assinar ato homologatório
- assinar notificação
- analisar recurso final

### Regras visuais
- a autoridade não deve receber visualmente processo não apto à homologação
- a homologação deve se apoiar no parecer conclusivo final
- a notificação final deve aparecer vinculada ao resultado homologado
- o recurso final deve aparecer como bloco separado do recurso de etapa

---

## Blocos visuais de documentos

### 1. Card/lista de documentos
A interface deve mostrar, quando aplicável:

- tipo do documento
- etapa vinculada, quando houver
- status documental
- status de assinatura
- data de geração
- ação de visualizar/baixar, quando disponível

### 2. Distinção visual necessária
A interface deve diferenciar visualmente:

- documento de etapa
- documento final
- documento em rascunho
- documento pronto para assinatura
- documento assinado
- documento superado/substituído, quando houver

### 3. Superação documental
Quando existir avaliação substitutiva ou documento superado, a interface deve:

- indicar que existe versão anterior
- preservar acesso histórico, conforme perfil
- deixar claro qual é o documento vigente

---

## Blocos visuais de prazo recursal

### Recurso por etapa
Quando o backend indicar que há prazo recursal ativo para a etapa, a interface deve mostrar:

- mensagem contextual
- data-limite
- contador regressivo
- ação “Recorrer”, quando disponível

### Recurso final
Quando o backend indicar que há prazo recursal ativo para o resultado final, a interface deve mostrar:

- vínculo com a notificação
- data-limite
- contador regressivo
- ação “Recorrer”, quando disponível

### Encerramento do prazo
Quando o prazo terminar, a interface deve:

- remover ou desabilitar a ação correspondente
- exibir status de prazo encerrado, quando fizer sentido

---

## Bloqueios visuais previstos

A interface deve suportar, entre outros, estes bloqueios:

- processo inexistente
- perfil sem permissão de ação
- etapa ainda não disponível
- documento ainda não gerado
- documento pendente de assinatura
- parecer final ainda não habilitado
- homologação ainda não habilitada
- recurso fora do prazo
- recurso já aberto
- processo encerrado

Esses bloqueios devem ser **informados**, nunca “resolvidos” pela interface.

---

## Contrato esperado com o backend

O frontend idealmente deve receber do backend, de forma explícita:

- estado macro do processo
- etapa atual
- status por etapa
- ações disponíveis por perfil
- documentos disponíveis
- status documental
- status de assinatura
- elegibilidade para parecer final
- elegibilidade para homologação
- prazo recursal da etapa, quando aplicável
- prazo recursal final, quando aplicável
- status de recurso, quando aplicável
- mensagens de bloqueio, quando aplicável

### Regra
O frontend **não deve derivar sozinho** essas regras a partir de combinações implícitas de campos quando o backend puder fornecê-las explicitamente.

---

## Princípios preservados

- O frontend **não decide transições**.
- O frontend **não cria regras processuais**.
- O frontend **não calcula elegibilidade jurídica** por conta própria.
- Toda leitura de estado e ações depende do workflow retornado pelo backend.
- Restrições por perfil são exibidas como feedback visual, sem tentativa de contorno.
- O frontend funciona como **camada de apresentação do rito**, não como fonte normativa do rito.

---

## Próximos passos naturais após esta atualização

1. evoluir da leitura genérica do processo para leitura por etapa
2. introduzir cards/abas de documentos da etapa
3. introduzir visão da CESAD por etapa
4. introduzir visão de elegibilidade para parecer final
5. introduzir prazos recursais visuais
6. introduzir blocos específicos de homologação e notificação