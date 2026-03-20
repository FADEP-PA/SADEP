# Sprint 3B — Fluxo visual inicial das telas de processo

## Objetivo

Consolidar a primeira experiência funcional de leitura do processo administrativo no frontend, conectada ao workflow base do backend, sem mover regras de negócio para a interface.

## Estrutura entregue

### 1. Entrada principal
- Rota autenticada inicial: `/(authenticated)/inicio`
- Componente central: `ProcessWorkspace`
- Ação principal: informar um `processId` e carregar dados reais do backend.

### 2. Blocos funcionais da tela de processo
- **Listagem de processos**: mantém os últimos processos consultados na sessão atual.
- **Perfis principais**: expõe placeholders reais para servidor, chefia, CESAD e autoridade homologadora.
- **Status do processo**: mostra estado atual retornado pelo workflow.
- **Ações disponíveis**: exibe somente as ações liberadas pelo backend para o perfil autenticado.
- **Histórico resumido**: apresenta a última movimentação auditável disponível.
- **Detalhes técnicos**: apoia conferência da integração front-back.
- **Bloqueios visuais**: sinaliza ausência de ações, ausência de histórico, restrição de perfil e processo encerrado.

## Estados visuais previstos

### Estado vazio
Quando nenhum processo foi carregado:
- a tela permanece pronta para uso;
- a listagem aparece vazia;
- o workspace orienta o usuário a informar um identificador válido.

### Estado carregado
Quando o backend retorna dados:
- a listagem recebe o processo consultado;
- os cards de status, ações, histórico e detalhes técnicos são preenchidos;
- os bloqueios visuais são calculados apenas a partir da resposta do backend.

### Estado de erro
Quando a consulta falha:
- a tela exibe `FeedbackAlert` com mensagem principal;
- detalhes adicionais são mostrados quando a API fornece causas específicas.

## Princípios respeitados
- O frontend **não decide transições**.
- O frontend **não cria regras processuais**.
- Toda leitura de estado e ações depende do workflow retornado pelo backend.
- Restrições por perfil são exibidas como feedback visual, sem tentativa de contorno na interface.

## Próximo passo natural após esta entrega
Evoluir da listagem em memória da sessão para uma listagem real baseada em endpoint dedicado de processos, preservando os mesmos componentes já criados.
