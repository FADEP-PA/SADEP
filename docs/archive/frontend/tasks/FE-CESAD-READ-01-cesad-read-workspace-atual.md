# FE-CESAD-READ-01 — Estado atual do workspace de leitura CESAD

## Status

**Encerrado** (2026-06-29). O que estava pendente nesta task foi completado pelas tasks subsequentes: `FE-CESAD-01` integrou o editor de parecer de etapa (`CesadStageOpinionEditor`) e a API de draft/complete; `FE-PROCESS-LIST-01` eliminou a necessidade de informar o ID manualmente para CESAD. A leitura consolidada via `getCesadStageReadSnapshot` permanece operacional. Parecer conclusivo final e assinatura colegiada aguardam frontend separado apos `BE-HOMOLOG-01`.

## Area

Frontend, CESAD, leitura de etapa, documentos, historico.

## Contexto

O workspace CESAD de leitura consolidada (`CesadStageReadWorkspace`) ja esta integrado ao endpoint real `GET /processes/:processId/stages/:stageSequence/consolidated-read`. A tela e acessivel pelos perfis `CESAD_MEMBER` e `COMMISSION_ASSISTANT` via `AuthGuard`, na rota `/cesad-comissao`.

O fluxo de consulta por processo e etapa funciona de ponta a ponta para os dados estruturais (processo, servidor, etapa, avaliacoes, documentos, historico). O parecer CESAD de etapa ja e exibido quando retornado pela integracao; quando ausente, o espaco e reservado com fallback visual que informa a ausencia, sem simular dados operacionais. O modo demonstrativo (`isDemo`) permanece apenas na tela vazia pre-consulta.

Esta task documenta o que esta operacional hoje e delimita o que ainda nao foi conectado, para evitar interpretacao equivocada do `FE-CESAD-01` como totalmente pendente.

## O que esta implementado e operacional

### Rota e acesso

| Elemento | Detalhe |
|---|---|
| Rota | `/cesad-comissao` |
| Arquivo | `apps/frontend/src/app/(authenticated)/cesad-comissao/page.tsx` |
| Perfis autorizados | `CESAD_MEMBER`, `COMMISSION_ASSISTANT` |
| Guard | `AuthGuard` com `allowedRoles` |

### Componente principal

**`CesadStageReadWorkspace`** (`apps/frontend/src/features/cesad/components/cesad-stage-read-workspace.tsx`)

- Formulario de busca por `processId` e `stageSequence` com validacao de entrada;
- Chamada real ao endpoint consolidado via `getCesadStageReadSnapshot` (`apps/frontend/src/shared/api/services/processes-service.ts`, linha 120);
- Estado de carregamento inline (`InlineLoadingState`);
- Tratamento diferenciado de erro: 404 → `StageUnavailableState`, 403 → `AccessBlockedState`, generico → `FeedbackAlert` com detalhes do payload;
- Painel lateral de resumo com contadores: documentos localizados, pendencias obrigatorias, assinaturas pendentes;
- Cards de estatistica por etapa apos carregamento com sucesso;
- Linha do tempo da etapa (`StageTimeline`) indicando a etapa aberta na consulta.

### Componentes de detalhe exibidos apos consulta bem-sucedida

| Componente | Arquivo | Funcionalidade atual |
|---|---|---|
| `ProcessHeaderCard` | `process-header-card.tsx` | Exibe dados do processo e do servidor |
| `StageSummaryCard` | `stage-summary-card.tsx` | Exibe status documental e codigo da etapa |
| `ProcessWarningsPanel` | `process-warnings-panel.tsx` | Exibe alertas e avisos retornados pelo snapshot |
| `StageDocumentList` | `stage-document-list.tsx` | Lista documentos obrigatorios com status, vinculo com etapa, artefato fisico e timeline de assinaturas |
| `SignatureTimeline` | `signature-timeline.tsx` | Exibe signatarios esperados e status de cada assinatura por documento |
| `StageHistoryPanel` | `stage-history-panel.tsx` | Lista eventos auditaveis da etapa com ator, perfil e data |
| `ReadOnlyOpinionShell` | `read-only-opinion-shell.tsx` | Exibe parecer real quando retornado; exibe estado de ausencia quando nao ha parecer; modo demonstrativo apenas na tela pre-consulta |

### Cards de avaliacao integrados ao snapshot

- **Avaliacao da chefia**: exibe status, resumo, comentarios gerais e criterios com nota quando `supervisorEvaluation` e retornado; exibe `ContentState` de aviso quando ausente.
- **Autoavaliacao**: exibe status, reflexao principal e observacoes adicionais quando `selfEvaluation` e retornado; exibe `ContentState` de aviso quando ausente.

### Contrato de dados (`@sadep/contracts`)

Os seguintes tipos sao consumidos diretamente:

- `CesadStageReadSnapshotRef` — tipo principal do snapshot consolidado;
- `CesadStageOpinionStatus` — enum com `DRAFT` e `COMPLETED`, usado para diferenciar estados do parecer exibido.

## O que ainda nao esta conectado

| Funcionalidade | Motivo | Task relacionada |
|---|---|---|
| Parecer conclusivo final (leitura/assinatura) | Frontend aguarda contratos de `CesadFinalOpinion` e fluxo de homologacao | `BE-HOMOLOG-01` |
| Gerenciamento de comissao | `features/cesad-comissao/` e `features/painel-gerencial-cesad/` sao scaffolds sem implementacao | Sem task aberta |

> `FE-CESAD-01` concluida (2026-06-29): editor de parecer de etapa integrado.
> `FE-PROCESS-LIST-01` concluida (2026-06-29): listagem segura por perfil via `GET /processes`.

## Fora do escopo desta task

- Alterar a implementacao atual;
- Conectar acoes de escrita ou emissao;
- Implementar listagem segura de processos;
- Criar telas de gerenciamento de comissao.

## Criterios de aceite (verificados)

- CESAD acessa a rota `/cesad-comissao` apenas com `CESAD_MEMBER` ou `COMMISSION_ASSISTANT`;
- o formulario de consulta nao aceita entradas invalidas (ID vazio, sequencia nao inteira ou menor que 1);
- 403 do backend exibe `AccessBlockedState` sem mascarar a falta de permissao;
- 404 exibe `StageUnavailableState` sem inferencia local;
- quando `cesadStageOpinion` e retornado, o conteudo real e exibido sem sobrescrever com dados ficticios;
- quando ausente, o espaco exibe estado de aviso; modo demonstrativo esta presente apenas antes da primeira consulta.

## Validacoes esperadas

- `npm run frontend:typecheck`;
- `npm run frontend:check`;
- `git diff --check`.

## Dependencias ja satisfeitas

- `BE-SEC-03` / `BE-CESAD-AUTH-01` — autorizacao contextual no backend;
- endpoint `GET /processes/:processId/stages/:stageSequence/consolidated-read` disponivel.

## Proxima acao

Nenhuma. Task encerrada. Proximas expansoes do workspace CESAD dependem de `BE-HOMOLOG-01` (homologacao, notificacao e ciencia) para o fluxo final.
