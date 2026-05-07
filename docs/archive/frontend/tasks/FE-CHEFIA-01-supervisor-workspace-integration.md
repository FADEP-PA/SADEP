# FE-CHEFIA-01 — Integracao real da chefia imediata

## Status

Concluida no recorte frontend seguro.

## Area

Frontend e integracao backend/frontend.

## Fonte de transicao

- [`../../../roadmaps/frontend-tasks-roadmap.md`](../../../roadmaps/frontend-tasks-roadmap.md)
- [`../../../roadmaps/frontend/active.md`](../../../roadmaps/frontend/active.md)
- [`../../../roadmaps/problemas-atuais-do-projeto.md`](../../../roadmaps/problemas-atuais-do-projeto.md)

## Contexto

`/chefia-imediata` nao deve ser tratada como integracao backend real concluida sem validacao. A tela ainda preserva dados demonstrativos como fallback, mas passou a consumir o workspace real da chefia quando houver processo informado na tela.

## Estado atual

Tarefas antigas como `FT-05` ou `ALIGN-02` nao devem ser usadas como prova de integracao real da chefia sem nova validacao.

Atualizacao de 2026-04-30:

- a tela passou a carregar `GET /processes/:id/supervisor-evaluation/workspace` quando havia processo informado por configuracao tecnica;
- a linha do processo real e exibida junto ao painel, sem remover o fallback demonstrativo;
- `Salvar rascunho` usa `POST /processes/:id/supervisor-evaluation/draft` quando o backend libera `canEditDraft`;
- `Enviar para assinatura` usa `POST /processes/:id/supervisor-evaluation/submit` quando o backend libera `canSubmit`;
- `Retificar avaliacao` usa `POST /processes/:id/supervisor-evaluation/rectify` quando o backend libera `canRectify`;
- a UI respeita as capacidades retornadas pelo backend e nao executa transicao de workflow diretamente.

Atualizacao complementar de 2026-04-30:

- a tela passou a ter campo de consulta por identificador de processo;
- `NEXT_PUBLIC_TECHNICAL_PROCESS_ID` deixou de ser a unica forma de carregar workspace real naquele recorte;
- validacao real em backend local passou com massa `local-fe-chefia-01`, usuario `supervisor@sadep.local`, rascunho salvo, envio concluido, processo em `AGUARDANDO_ASSINATURA`, documento `READY_FOR_SIGNATURE` e duas assinaturas esperadas.
- validacao visual em navegador passou em modo `next start` na rota `/chefia-imediata`, com login de chefia, consulta do processo `local-fe-chefia-01` e exibicao da linha real em `AGUARDANDO ASSINATURA`.

Atualizacao de 2026-05-07:

- a varredura global nao encontrou consumo de `NEXT_PUBLIC_TECHNICAL_PROCESS_ID` no codigo frontend;
- a pendencia de env tecnica foi encerrada em `FT-24`;
- a tela passou a diferenciar explicitamente modo demonstrativo e processo real carregado;
- a linha real carregada ganhou destaque visual, preservando o fallback demonstrativo para apresentacao;
- `FE-CHEFIA-01` fica concluida no recorte frontend seguro de consulta manual, consumo do workspace real quando informado e separacao visual demo/real;
- a ausencia de listagem segura de processos por perfil nao reabre esta task e deve nascer como task futura propria, alinhada a contrato/backend.

## Escopo previsto

- revalidar a tela da chefia;
- mapear endpoints reais disponiveis;
- separar UX demonstrativa de integracao real;
- definir se a task e frontend, backend ou alinhamento transversal.

## Fora do escopo

- declarar integracao backend plena com listagem real de processos por perfil;
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
- validacao real via backend local passou em 2026-04-30;
- validacao visual em navegador passou em 2026-04-30.
- modo demonstrativo e processo real passaram a ter sinalizacao visual distinta em 2026-05-07;
- destaque visual da linha real carregada implementado em 2026-05-07.

## Proxima acao

Abrir task futura propria para listagem segura de processos por perfil quando houver decisao de contrato/backend. Nao reduzir o fallback demonstrativo sem decisao explicita, pois ele permanece necessario para apresentacao visual.
