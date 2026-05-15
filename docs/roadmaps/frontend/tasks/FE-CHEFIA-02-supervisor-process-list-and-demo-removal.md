# FE-CHEFIA-02 — Listagem segura de processos da chefia e remocao de fallback demonstrativo

## Status

Pendente alta. Bloqueada por backend ate que exista contrato seguro de listagem de processos por chefia autenticada e capabilities por processo.

## Area

Frontend, integracao backend/frontend, chefia imediata e autorizacao por perfil.

## Contexto

`FE-CHEFIA-01` entregou integracao inicial da tela `/chefia-imediata` com backend real por processo informado manualmente, mas preservou fallback demonstrativo/local, dados demonstrativos e modo de consulta por ID manual.

Esta task continua a frente da chefia sem reabrir `FT-24`, que permanece resolvida quanto a `NEXT_PUBLIC_TECHNICAL_PROCESS_ID`, e sem reabrir `FE-CHEFIA-01`, que permanece resolvida parcialmente no recorte de integracao inicial.

Este recorte de DOC-R4 expande o registro da task com mapeamento operacional do estado atual da tela, dependencias backend, riscos de remocao precoce do fallback e plano seguro para substituicao gradual. Nenhum codigo frontend foi alterado neste recorte: a task permanece pendente e bloqueada por backend.

## Estado atual da tela da chefia

A rota `/chefia-imediata` carrega `SupervisorEvaluationWorkspace`, protegida por `AuthGuard` para o papel `IMMEDIATE_SUPERVISOR`. A tela possui dois modos coexistentes:

- modo demonstrativo padrao: lista demonstrativa de servidores, modal de avaliacoes anteriores demonstrativas e jornada de avaliacao com `setTimeout` simulado para `Salvar rascunho` e `Enviar para assinatura`;
- modo de processo informado: consulta autenticada por identificador de processo digitado pela chefia, consumindo `GET /processes/:id/supervisor-evaluation/workspace` e exibindo a linha real junto aos dados demonstrativos preservados.

Quando ha processo real carregado:

- `Salvar rascunho` chama `POST /processes/:id/supervisor-evaluation/draft` quando o backend libera `canEditDraft`;
- `Enviar para assinatura` chama `POST /processes/:id/supervisor-evaluation/submit` quando o backend libera `canSubmit`;
- `Retificar avaliacao` chama `POST /processes/:id/supervisor-evaluation/rectify` quando o backend libera `canRectify`;
- a UI respeita as capacidades retornadas pelo backend e nao executa transicao de workflow diretamente.

Quando nao ha processo real carregado:

- a tela exibe `DemonstrationModeState` indicando que a visualizacao permanece demonstrativa;
- a tabela exibe a lista demonstrativa fixa de servidores e o modal de avaliacoes anteriores demonstrativo;
- as acoes `Salvar rascunho` e `Enviar para assinatura` apenas exibem feedback local, sem chamar backend.

Nao existe listagem real de processos sob responsabilidade da chefia autenticada. A consulta depende de identificador de processo informado manualmente pela chefia.

## Arquivos envolvidos

Frontend:

- `apps/frontend/src/app/(authenticated)/chefia-imediata/page.tsx` — entrada da rota autenticada, monta apenas `SupervisorEvaluationWorkspace`;
- `apps/frontend/src/features/process/components/supervisor-evaluation-workspace.tsx` — componente principal da tela, com:
  - guarda por `IMMEDIATE_SUPERVISOR`;
  - estado de `workspaceSnapshot` real e de filtros;
  - dados demonstrativos fixos em `DASHBOARD_ROWS` e `PREVIOUS_EVALUATION_HISTORY`;
  - composicao da lista exibida via `createRealDashboardRow` + `DASHBOARD_ROWS`;
  - chamadas reais a `getSupervisorEvaluationWorkspaceSnapshot`, `saveSupervisorEvaluationDraft`, `submitSupervisorEvaluation` e `rectifySupervisorEvaluation`;
  - simulacoes locais com `setTimeout` para acoes demonstrativas;
- `apps/frontend/src/features/process/components/supervisor-evaluation-document-card.tsx` — card de contexto documental usado em leitura do servidor; nao e o painel da chefia, mas compartilha tipos de avaliacao da chefia;
- `apps/frontend/src/shared/api/services/processes-service.ts` — services autenticados:
  - `getSupervisorEvaluationWorkspaceSnapshot(processId)`;
  - `saveSupervisorEvaluationDraft(processId, body)`;
  - `submitSupervisorEvaluation(processId, body)`;
  - `rectifySupervisorEvaluation(processId, body)`;
  - `signSupervisorEvaluation(processId)`;
- `apps/frontend/src/shared/ui/operational-states.tsx` — fornece `DemonstrationModeState`, `EmptyState`, `AccessBlockedState`, `TemporaryUnavailableState` e outros estados institucionais usados pela tela e necessarios para os estados futuros de loading/empty/erro/unauthorized/forbidden;
- `apps/frontend/src/shared/auth/auth-guard.tsx` — guarda de rota e tratamento institucional de acesso negado.

Documentacao:

- `docs/roadmaps/frontend/active.md` — registra `FE-CHEFIA-02` como pendente alta dependente de backend;
- `docs/roadmaps/frontend/resolved.md` — registra `FE-CHEFIA-01` como parcialmente resolvida e aponta a continuidade para esta task;
- `docs/roadmaps/frontend-tasks-roadmap.md` — indice de compatibilidade que aponta para este arquivo;
- `docs/archive/frontend/tasks/FE-CHEFIA-01-supervisor-workspace-integration.md` — historico arquivado de `FE-CHEFIA-01`.

## Dados demonstrativos que sustentam a experiencia visual

- `DASHBOARD_ROWS` em `supervisor-evaluation-workspace.tsx` (linhas aproximadas 130-193): quatro servidores demonstrativos com status `EM_AVALIACAO`, `EM_ANALISE_CESAD` e `CONCLUIDO`, prazos, etapas e nomes ficticios;
- `PREVIOUS_EVALUATION_HISTORY` no mesmo arquivo (linhas aproximadas 93-128): historico demonstrativo de avaliacoes anteriores para `SUP-001` e `SUP-002`, consumido pelo modal de avaliacoes anteriores;
- `FACTOR_TEMPLATES`, `MONTHLY_OBSERVATION_OPTIONS` e `ADMINISTRATIVE_CONCEPT_OPTIONS`: estruturas de formulario que sao referencia visual e tambem alimentam o payload real quando ha processo informado; nao sao dados demonstrativos puros e nao devem ser removidos com o fallback;
- simulacoes locais com `setTimeout` em `handleSaveDraft` e `handleSubmitEvaluation` para `row.source !== 'real'`, exibindo feedback local de rascunho/envio sem chamar backend;
- mensagens institucionais em `DemonstrationModeState` indicando modo demonstrativo enquanto nenhum processo real for informado.

## Pontos que nao podem ser removidos antes do backend real

- `DASHBOARD_ROWS` e `PREVIOUS_EVALUATION_HISTORY` nao devem ser removidos enquanto o contrato real de listagem de processos da chefia autenticada e de avaliacoes anteriores nao estiver disponivel, sob risco de deixar a tela vazia para apresentacao visual e validacao operacional;
- as simulacoes `setTimeout` de `Salvar rascunho` e `Enviar para assinatura` em modo demonstrativo nao devem ser removidas sem a listagem real, sob risco de exibir botoes que nao executam nada quando nao ha processo informado;
- o campo de consulta manual por identificador de processo nao deve ser removido antes da listagem real, sob risco de deixar a chefia sem caminho para abrir um processo conhecido;
- o `DemonstrationModeState` nao deve ser removido sem substituicao por estado real de listagem (loading/empty/erro/unauthorized/forbidden), sob risco de confundir a chefia sobre o que esta sendo exibido;
- a guarda `AuthGuard` por `IMMEDIATE_SUPERVISOR` nao deve ser relaxada; autorizacao continua sendo responsabilidade do backend, e o frontend apenas reage ao retorno do contrato.

## Dependencias de backend

- endpoint backend seguro de listagem de processos sob responsabilidade da chefia autenticada, com identificacao da chefia pelo token/sessao, nao por ID informado pelo frontend;
- autorizacao contextual no backend que garanta que cada chefia ve apenas processos sob sua responsabilidade;
- contrato de `capabilities` por processo (incluindo, no minimo, equivalentes a `canEditDraft`, `canSubmit`, `canRectify`) para alimentar acoes seguras na linha de cada processo;
- contrato para avaliacoes anteriores associadas ao processo/servidor, caso a tela continue exibindo o modal de historico;
- politicas backend para distinguir loading, vazio, erro tecnico, sem permissao (`403`) e sessao expirada (`401`), preservando o comportamento centralizado ja existente no `http-client`;
- coordenacao com `FE-PROCESS-LIST-01`, caso a listagem segura por perfil seja abstraida em frente comum.

## Contrato minimo esperado

Para a substituicao segura do fallback demonstrativo, o backend deve oferecer, no minimo:

- listagem segura `GET` de processos da chefia autenticada, identificada pelo token/sessao, sem necessidade de informar ID de chefia pelo frontend;
- escopo: somente processos sob responsabilidade da chefia autenticada no momento da consulta;
- por processo, no minimo:
  - identificador do processo;
  - status processual (compativel com `ProcessStatus`);
  - etapa atual (rotulo institucional ou codigo mapeavel);
  - servidor vinculado (nome institucional e matricula/identificador adequados);
  - prazos relevantes da etapa em curso (rotulo institucional);
  - `capabilities` por processo (no minimo equivalentes a `canEditDraft`, `canSubmit`, `canRectify`, e indicacoes de `canReviewPrevious` se o historico continuar exibido);
- estados de resposta tratados pelo backend:
  - `200` com lista (possivelmente vazia legitima);
  - `401` para sessao expirada (tratado pelo `http-client` com refresh silencioso);
  - `403` para falta de permissao do perfil;
  - `5xx` para falha tecnica;
- regra para o frontend substituir/remover o fallback demonstrativo apenas apos:
  - confirmacao do contrato pelo backend;
  - validacao de que a listagem real retorna processos da chefia autenticada;
  - validacao de que estados `unauthorized`, `forbidden`, `empty` e `error` ficam distinguiveis no UX.

## Riscos de remover dados demonstrativos antes do contrato real

- ocultar a jornada da chefia em demonstracoes institucionais antes que o backend ofereca listagem real;
- exibir tela vazia ou erro permanente quando o backend de listagem ainda nao existir, prejudicando treinamento, apresentacao e validacao operacional;
- regredir o quality gate textual ao expor mensagens tecnicas ou de prototipo se o fallback for substituido sem microcopy institucional adequada;
- mascarar falha de backend como lista vazia legitima, dificultando diagnostico;
- introduzir chamadas a endpoints inexistentes, gerando ruido de `404`/`500` em homologacao;
- relaxar autorizacao no frontend ao tentar simular listagem por chefia, contornando responsabilidade do backend;
- quebrar a coexistencia atual entre modo demonstrativo e processo informado, perdendo a separacao visual ja entregue em `FE-CHEFIA-01`.

## Plano seguro para substituicao gradual dos dados demonstrativos

A substituicao deve ser executada em recortes pequenos, auditaveis e reversiveis. Sugestao operacional para quando o contrato backend estiver disponivel:

1. Recorte 1 — service e tipos: adicionar service autenticado para a listagem real (por exemplo, `getSupervisorAssignedProcesses`), com tipo derivado do contrato `@sadep/contracts` quando existir, sem alterar UI.
2. Recorte 2 — estados institucionais: cobrir loading, empty real, erro tecnico, `unauthorized` e `forbidden` no painel da chefia usando os estados ja existentes em `operational-states.tsx`, ainda mantendo o fallback demonstrativo na coexistencia atual.
3. Recorte 3 — linhas reais coexistindo: passar a tabela a exibir as linhas reais devolvidas pelo backend acima das linhas demonstrativas, com marcador visual distinto ja consolidado (`supervisor-dashboard__row--real`).
4. Recorte 4 — capabilities por linha: substituir os rotulos de acao demonstrativos por rotulos derivados das `capabilities` do backend, sem alterar regras de assinatura, parecer, homologacao, emissao, persistencia ou autorizacao.
5. Recorte 5 — remocao do fallback: remover `DASHBOARD_ROWS`, `PREVIOUS_EVALUATION_HISTORY` e simulacoes `setTimeout` apenas apos a listagem real estar estavel e validada em homologacao com chefia autenticada.
6. Recorte 6 — consulta manual residual: avaliar se o campo de consulta manual por identificador deve ser mantido como atalho operacional ou removido. Decisao deve ficar registrada em task propria, sem reabrir `FT-24`.

Cada recorte deve preservar:

- a guarda por `IMMEDIATE_SUPERVISOR`;
- a separacao visual entre demo e processo informado enquanto a coexistencia for necessaria;
- a microcopy institucional (sem termos tecnicos ou de prototipo);
- regras de assinatura, parecer, homologacao, emissao, persistencia e autorizacao do backend.

## Criterios de aceite futuros

- chefia autenticada ve lista real de processos sob sua responsabilidade, identificada pelo token/sessao, sem ID manual;
- a tela nao exige que o usuario informe ID tecnico manualmente para iniciar a jornada principal;
- fallback demonstrativo/local nao e usado no fluxo operacional apos o recorte de remocao;
- estados de loading, vazio, erro, `unauthorized` e `forbidden` ficam distinguiveis e nao mascaram falha de backend;
- acoes por linha refletem capabilities retornadas pelo backend;
- nenhuma chamada a endpoint inexistente e introduzida;
- regras de assinatura, parecer, homologacao, emissao, persistencia e autorizacao seguem inalteradas no frontend;
- `FE-CHEFIA-01` permanece resolvida parcial; `FT-24` permanece resolvida; nenhuma das duas e reaberta;
- o quality gate textual continua passando, sem regressao de microcopy institucional.

## Escopo previsto

- listar processos reais atribuidos a chefia autenticada;
- remover dependencia de ID manual na jornada principal;
- remover fallback demonstrativo/local da tela operacional apos contrato real disponivel;
- remover mocks e `setTimeout` relacionados ao fluxo principal;
- preservar estados de loading, erro, vazio, sem permissao e sessao expirada;
- consumir endpoints reais e manter autorizacao no backend;
- manter linguagem institucional e compatibilidade visual com o shell autenticado.

## Fora do escopo

- reabrir `FT-24`;
- reabrir `FE-CHEFIA-01`;
- criar autorizacao de negocio no frontend;
- implementar endpoints backend sem task propria;
- alterar regras juridicas, workflow, documentos, assinaturas, parecer, homologacao, emissao ou persistencia;
- remover demonstracoes de outras telas nao relacionadas;
- redesign visual da tela da chefia;
- alterar Prisma, banco, contratos backend ou autenticacao real.

## Validacoes esperadas

- `npm run frontend:typecheck`;
- `npm run frontend:check`;
- validacao manual em navegador com chefia autenticada apos contrato real disponivel;
- `git diff --check`.

## Dependencias

- endpoint backend seguro para listagem de processos da chefia autenticada;
- autorizacao contextual backend adequada;
- contrato de `capabilities` por processo;
- coordenacao com `FE-PROCESS-LIST-01`, se a listagem for abstraida por perfil.

## Proxima acao

Confirmar com a frente backend o contrato de listagem de processos da chefia autenticada e o conjunto minimo de `capabilities` por processo antes de iniciar qualquer recorte de remocao do fallback demonstrativo na jornada principal. Ate la, manter a tela demonstrativa coexistindo com a consulta por processo informado conforme entregue por `FE-CHEFIA-01`.
