# FT-24 — Reduzir dependencia de NEXT_PUBLIC_TECHNICAL_PROCESS_ID

## Status

Resolvido / aprovado no recorte frontend identificado pela varredura global.

## Area

Frontend e integracao backend/frontend.

## Fonte de transicao

- [`../../../roadmaps/frontend-tasks-roadmap.md`](../../../roadmaps/frontend-tasks-roadmap.md)
- [`../../../roadmaps/frontend/active.md`](../../../roadmaps/frontend/active.md)
- [`../../../roadmaps/problemas-atuais-do-projeto.md`](../../../roadmaps/problemas-atuais-do-projeto.md)

## Contexto

O frontend dependia de identificador tecnico de processo em fluxos operacionais. Isso era aceitavel para demonstracao, mas nao para fluxo real.

## Estado atual

`FT-24` esta resolvida no recorte frontend. A varredura global confirmou ausencia de `NEXT_PUBLIC_TECHNICAL_PROCESS_ID` no codigo frontend.

Atualizacao de 2026-04-30:

- `/chefia-imediata` deixou de depender exclusivamente de `NEXT_PUBLIC_TECHNICAL_PROCESS_ID`;
- a rota agora permite informar o identificador de processo na propria tela;
- `NEXT_PUBLIC_TECHNICAL_PROCESS_ID` permanecia apenas como preenchimento inicial opcional naquele recorte;
- a solucao ainda nao substitui uma listagem segura de processos por perfil.

Atualizacao de 2026-05-04:

- varredura frontend encontrou uso da variavel tecnica em `/chefia-imediata`, `/processos` e `/servidor-estagiario`;
- a leitura de `NEXT_PUBLIC_TECHNICAL_PROCESS_ID` foi removida do codigo frontend;
- `/servidor-estagiario` passou a permitir consulta manual por identificador de processo na propria tela;
- `/processos`, `/chefia-imediata` e `/servidor-estagiario` dependem de selecao/consulta explicita na UI, sem preenchimento por env tecnica;
- nao ha endpoint real de listagem segura de processos por perfil exposto para o frontend neste momento;
- a dependencia operacional frontend de ID tecnico fixo foi eliminada nas telas mapeadas.

## Escopo realizado

- substituir dependencia de ID tecnico fixo;
- permitir consulta manual/selecao explicita de processos nas telas mapeadas;
- remover consumo de `NEXT_PUBLIC_TECHNICAL_PROCESS_ID` do codigo frontend.

## Fora do escopo

- implementar painel completo sem endpoints;
- mudar autorizacao;
- alterar workflow.
- criar endpoint backend de listagem de processos por perfil.
- implementar listagem segura de processos por perfil; essa melhoria deve nascer como task futura propria.

## Evidencias / referencias

- A varredura global pos-auth confirmou que o codigo frontend nao consome `NEXT_PUBLIC_TECHNICAL_PROCESS_ID`.
- `FE-CHEFIA-01` foi concluida posteriormente no recorte frontend seguro e tambem arquivada; listagem segura por perfil permanece melhoria futura propria.

## Validacoes esperadas

- varredura de usos de `NEXT_PUBLIC_TECHNICAL_PROCESS_ID`;
- typecheck frontend;
- build frontend;
- validacao manual das telas afetadas quando houver mudanca funcional futura.

Validacoes executadas em 2026-05-04:

- `npm run frontend:typecheck` passou;
- `npm run frontend:check` passou, incluindo build Next.js.
- varredura final no codigo frontend nao encontrou `NEXT_PUBLIC_TECHNICAL_PROCESS_ID`.

## Proxima acao

Manter `FT-24` fechada no recorte frontend. A listagem segura por perfil deve ser tratada quando houver contrato/backend disponivel, em task futura propria; ate la, o frontend nao depende mais de `NEXT_PUBLIC_TECHNICAL_PROCESS_ID`.
