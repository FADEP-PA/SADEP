# FE-PROCESS-LIST-01 - Listagem segura de processos por perfil autenticado

## Status

Pendente / bloqueada por backend.

## Prioridade

Alta futura.

## Area

Frontend, integracao backend/frontend, processos e autorizacao contextual por perfil.

## Contexto

A varredura global confirmou que `FT-24` permanece resolvida: o frontend nao depende mais de `NEXT_PUBLIC_TECHNICAL_PROCESS_ID`. Ainda assim, as jornadas autenticadas continuam sem uma listagem real de processos por perfil. O estado atual permite consulta por identificador informado manualmente, uso de dados demonstrativos e preparacao visual de estados, mas nao substitui endpoint backend seguro de listagem.

Esta task registra a melhoria propria de listagem segura sem reabrir `FT-24`, `FE-CHEFIA-01` ou qualquer task ja resolvida.

## Recorte executado em 2026-05-13

- Mapeamento documental do frontend existente.
- Nenhuma alteracao funcional em tela.
- Nenhuma chamada nova para endpoint inexistente.
- Nenhuma alteracao em backend, contracts, Prisma, banco, autenticacao ou regras processuais.
- Dados demonstrativos e fallbacks visuais permanecem intencionais ate existir contrato seguro.

## Estado atual mapeado

### Consulta geral de processos

- `apps/frontend/src/app/(authenticated)/processos/page.tsx` renderiza `ProcessWorkspace`.
- `apps/frontend/src/features/process/components/process-workspace.tsx` exige `processId` digitado pelo usuario, chama `getTechnicalProcessSnapshot(processId, session.user.role)` e monta uma lista local de ate cinco processos consultados na sessao.
- `apps/frontend/src/features/process/components/process-list-card.tsx` e apresentacional. O card lista apenas `consultedProcesses` mantidos no estado do componente, sem paginacao backend, filtros reais ou autorizacao de listagem.
- `apps/frontend/src/features/dashboard/types/process-dashboard-types.ts` possui tipos suficientes para leitura de snapshot e lista local, mas nao descreve contrato paginado de listagem autenticada.

### Services e chamadas autenticadas existentes

- `apps/frontend/src/shared/api/services/processes-service.ts` concentra chamadas autenticadas por processo: workflow, historico, workspace do servidor, avaliacao da chefia, autoavaliacao, leitura consolidada CESAD e transicoes.
- Nao existe metodo de listagem autenticada de processos nesse service.
- O service ja usa o padrao `AUTHENTICATED_REQUEST`, portanto esta pronto para receber uma funcao futura somente depois de contrato backend real e tipos correspondentes.

### Jornada do servidor estagiario

- `apps/frontend/src/features/process/components/intern-server-workspace.tsx` usa `processIdInput` manual para carregar `getInternWorkspaceSnapshot` e `getWorkflowHistory`.
- Sem snapshot real, a tela usa `createDemoStageCards()` e `DemonstrationModeState`.
- O fallback demonstrativo e necessario para validacao visual enquanto a listagem real do proprio servidor nao existir.

### Jornada da chefia imediata

- `apps/frontend/src/features/process/components/supervisor-evaluation-workspace.tsx` usa `DASHBOARD_ROWS` demonstrativos e `processIdInput` manual para carregar um processo real isolado via `getSupervisorEvaluationWorkspaceSnapshot`.
- Quando um processo real e informado, a tela injeta uma linha `source: 'real'` ao lado dos dados demonstrativos preservados.
- A remocao do fallback especifico da chefia pertence a `FE-CHEFIA-02` e depende de listagem real da chefia autenticada.

### Jornada CESAD

- `apps/frontend/src/features/cesad/components/cesad-stage-read-workspace.tsx` exige `processId` e `stageSequence` digitados para consultar a leitura consolidada de uma etapa.
- Nao ha fila CESAD, paginacao ou listagem de processos em analise por perfil.
- A tela ja diferencia loading, erro, 404 e 403 na consulta pontual, mas nao resolve listagem segura.

### Jornada da autoridade homologadora

- `apps/frontend/src/features/homologacao-autoridade/services/homologation-workspace-service.ts` retorna snapshot frontend com `queue: []`, bloqueios explicitos e acoes formais desabilitadas.
- `apps/frontend/src/features/homologacao-autoridade/components/homologation-authority-workspace.tsx` reserva a area de fila apta sem simular processos homologaveis.
- A futura fila homologatoria deve depender de contrato proprio; esta task nao autoriza homologacao, devolucao, assinatura ou notificacao real.

### Navegacao e autorizacao de rota

- `apps/frontend/src/shared/rbac/menu.ts` expoe `/processos` apenas para perfis de comissao/CESAD no menu principal.
- `apps/frontend/src/shared/rbac/role-catalog.ts` limita `canAccessProcessWorkspace` a servidor, membro CESAD e assistente da comissao.
- `ProcessWorkspace` ainda aplica `AuthGuard` local para servidor, membro CESAD e assistente da comissao. Isso e controle de UX/rota; a autorizacao real precisa continuar no backend.

### Estados de UI reutilizaveis

- `apps/frontend/src/shared/ui/operational-states.tsx` ja fornece estados de vazio, acesso bloqueado, nao encontrado, indisponivel e demonstrativo.
- `apps/frontend/src/shared/ui/process-request-feedback.tsx` ja separa 404, 403 e erro generico para consulta pontual.
- Esses estados podem ser reaproveitados na listagem real, desde que 401/403 nao sejam convertidos em lista vazia.

## Partes prontas para receber contrato real

- Padrao de request autenticado em `processes-service.ts`.
- Componentes de estado de loading, empty, erro e acesso bloqueado.
- Card/lista visual `ProcessListCard`, desde que deixe de representar apenas itens locais da sessao.
- Separacao basica entre leitura de processo, acoes disponiveis e mensagens de bloqueio.
- Tipos de snapshot ja usados pelas telas pontuais, que podem orientar o desenho do payload minimo de listagem.

## Partes ainda acopladas a demonstracao ou ID manual

- Campo manual `processId` em `/processos`.
- Lista `consultedProcesses` local, sem origem backend.
- Campo manual `processIdInput` em `/servidor-estagiario`.
- `createDemoStageCards()` e estados demonstrativos do servidor.
- `DASHBOARD_ROWS` demonstrativos da chefia e mistura controlada de linha `source: 'real'`.
- Campo manual `processIdInput` em `/chefia-imediata`.
- Campo manual `processId` e `stageSequence` em `/cesad-comissao`.
- Fila vazia e bloqueada da homologacao final.

## Riscos de integracao prematura

- Criar chamada para endpoint ainda inexistente e mascarar falha como tela vazia.
- Filtrar autorizacao no cliente e expor IDs ou metadados de processos fora do escopo do usuario.
- Tratar processo visivel como acao permitida, liberando botoes antes de capabilities reais.
- Substituir fallbacks demonstrativos por listas incompletas e reduzir a capacidade de validacao visual.
- Reintroduzir identificador tecnico global por env ou por valor fixo.
- Prometer emissao, assinatura, homologacao, parecer final, persistencia ou autorizacao real sem contrato backend.
- Misturar filas especificas de chefia, CESAD ou homologacao em uma listagem generica sem semantica de perfil.

## Contrato minimo esperado do backend

O endpoint exato deve ser definido pelo backend/contracts antes da implementacao. A capacidade minima esperada e uma listagem autenticada, paginada e autorizada por contexto, com:

- endpoint de listagem para usuario autenticado, sem depender de ID digitado em tela;
- paginacao com `page`, `pageSize`, total de registros e indicacao de proxima pagina quando aplicavel;
- filtros basicos por status, texto/identificador opaco, etapa ou contexto operacional quando autorizados;
- status do processo e etapa/momento atual em formato consumivel pelo frontend;
- papel do usuario naquele processo;
- capabilities do usuario naquele processo, separando leitura visivel de acoes permitidas;
- IDs opacos e estaveis para navegacao/consulta posterior, sem `NEXT_PUBLIC_TECHNICAL_PROCESS_ID` ou ID manual global;
- timestamps ou referencias suficientes para ordenacao e recencia;
- tratamento distinto para loading, lista vazia, erro tecnico, nao autenticado, unauthorized e forbidden;
- garantia backend de que processos nao autorizados nao aparecam na resposta;
- diferenca explicita entre "processo visivel" e "usuario pode agir sobre o processo".

## Criterios para remover IDs manuais e dados demonstrativos

- Existir endpoint backend seguro de listagem por perfil autenticado.
- Existir contrato tipado aprovado para a resposta de listagem, incluindo paginacao, filtros, status, papel e capabilities.
- A listagem retornar somente processos autorizados para o usuario autenticado.
- 401/403 serem tratados como estados de autenticacao/autorizacao, nao como empty state.
- Cada jornada ter decisao propria sobre fallback: `/chefia-imediata` deve respeitar `FE-CHEFIA-02`; CESAD e homologacao precisam de contratos especificos de fila.
- Testes e validacao manual por perfil cobrirem servidor, chefia, CESAD/comissao, autoridade homologadora e admin quando aplicavel.
- Dados demonstrativos so devem ser removidos quando a cobertura visual e operacional equivalente estiver garantida por dados reais seguros.

## Criterios de aceite futuros

- Cada perfil ve apenas processos autorizados pelo backend.
- A UI nao revela processos fora do escopo do usuario autenticado.
- Falhas de autorizacao sao exibidas como erro/sem permissao, nao como lista vazia enganosa.
- A ausencia real de processos e distinguida de falha tecnica.
- A lista suporta loading, empty state, erro, unauthorized/forbidden, paginacao e filtros basicos.
- O usuario consegue abrir um processo da lista sem digitar ID manual.
- A tela diferencia processo visivel de acao permitida por capabilities.
- Fallbacks demonstrativos sao mantidos, reduzidos ou removidos apenas conforme criterios documentados.
- A documentacao deixa claro que esta task nao reabre `FT-24` nem substitui `FE-CHEFIA-02`.

## Fora do escopo

- Reabrir `FT-24`.
- Criar endpoint novo.
- Simular integracao real inexistente.
- Alterar backend, contracts, Prisma, banco, autenticacao real ou regras processuais.
- Implementar workflow backend.
- Implementar homologacao, recurso, parecer final, portaria, assinatura ou persistencia real.
- Remover fallback especifico da chefia sem executar `FE-CHEFIA-02`.

## Validacoes esperadas

- `npm run frontend:typecheck`;
- `npm run frontend:check`;
- `npm run frontend:build`, se viavel no ambiente;
- validacao manual por perfil quando houver endpoints disponiveis;
- `git diff --check`.

## Dependencias

- Endpoints backend seguros de listagem por perfil.
- Autorizacao contextual no backend.
- Contrato real de listagem de processos autenticados.
- Politicas de capabilities por processo.
- `FE-CHEFIA-02` para a experiencia especifica da chefia.
- Contratos especificos para CESAD e homologacao quando houver filas dedicadas.

## Proxima acao segura

Aguardar contrato backend seguro de listagem autenticada por perfil. Enquanto isso, manter o trabalho restrito a documentacao, mapeamento, estados visuais e preparacao frontend sem criar chamadas para endpoints inexistentes.
