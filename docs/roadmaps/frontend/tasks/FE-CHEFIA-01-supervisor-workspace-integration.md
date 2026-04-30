# FE-CHEFIA-01 — Integracao real da chefia imediata

## Status

Ativo / parcialmente integrado.

## Area

Frontend e integracao backend/frontend.

## Fonte de transicao

- [`../../frontend-tasks-roadmap.md`](../../frontend-tasks-roadmap.md)
- [`../active.md`](../active.md)
- [`../../problemas-atuais-do-projeto.md`](../../problemas-atuais-do-projeto.md)

## Contexto

`/chefia-imediata` nao deve ser tratada como integracao backend real concluida sem validacao. A tela ainda preserva dados demonstrativos como fallback, mas passou a consumir o workspace real da chefia quando houver `NEXT_PUBLIC_TECHNICAL_PROCESS_ID` configurado.

## Estado atual

Tarefas antigas como `FT-05` ou `ALIGN-02` nao devem ser usadas como prova de integracao real da chefia sem nova validacao.

Atualizacao de 2026-04-30:

- a tela carrega `GET /processes/:id/supervisor-evaluation/workspace` quando existe `NEXT_PUBLIC_TECHNICAL_PROCESS_ID`;
- a linha do processo real e exibida junto ao painel, sem remover o fallback demonstrativo;
- `Salvar rascunho` usa `POST /processes/:id/supervisor-evaluation/draft` quando o backend libera `canEditDraft`;
- `Enviar para assinatura` usa `POST /processes/:id/supervisor-evaluation/submit` quando o backend libera `canSubmit`;
- `Retificar avaliacao` usa `POST /processes/:id/supervisor-evaluation/rectify` quando o backend libera `canRectify`;
- a UI respeita as capacidades retornadas pelo backend e nao executa transicao de workflow diretamente.

## Escopo previsto

- revalidar a tela da chefia;
- mapear endpoints reais disponiveis;
- separar UX demonstrativa de integracao real;
- definir se a task e frontend, backend ou alinhamento transversal.

## Fora do escopo

- marcar integracao como concluida;
- alterar workflow;
- alterar backend sem varredura;
- implementar assinatura;
- implementar CESAD.

## Evidencias / referencias

- O roadmap frontend reclassifica `/chefia-imediata` como demonstrativa/local.
- O painel transversal registra `FE-CHEFIA-01` como problema ativo de frontend/integracao.

## Validacoes esperadas

- varredura da rota `/chefia-imediata` concluida no recorte inicial;
- mapeamento de chamadas reais ao backend concluido no recorte inicial;
- identificacao de dados locais e simulacoes concluida no recorte inicial;
- `npm run frontend:typecheck` passou em 2026-04-30;
- `npm run frontend:check` passou em 2026-04-30;
- validacao manual da tela quando houver integracao real planejada.

## Proxima acao

Validar manualmente `/chefia-imediata` com backend local, usuario de chefia e `NEXT_PUBLIC_TECHNICAL_PROCESS_ID` apontando para processo cuja etapa tenha `responsibleSupervisorUserId` vinculado ao usuario autenticado. Depois, decidir se a proxima entrega sera listagem real de processos da chefia ou reducao do fallback demonstrativo.
