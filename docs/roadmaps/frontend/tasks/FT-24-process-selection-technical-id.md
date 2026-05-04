# FT-24 — Reduzir dependencia de NEXT_PUBLIC_TECHNICAL_PROCESS_ID

## Status

Ativo / parcialmente mitigado.

## Area

Frontend e integracao backend/frontend.

## Fonte de transicao

- [`../../frontend-tasks-roadmap.md`](../../frontend-tasks-roadmap.md)
- [`../active.md`](../active.md)
- [`../../problemas-atuais-do-projeto.md`](../../problemas-atuais-do-projeto.md)

## Contexto

O frontend ainda depende de identificador tecnico de processo em fluxos operacionais. Isso pode ser aceitavel para demonstracao, mas nao para fluxo real.

## Estado atual

O roadmap frontend mantem `FT-24` como frente ativa para reduzir dependencia operacional de ID tecnico manual de processo em desenvolvimento.

Atualizacao de 2026-04-30:

- `/chefia-imediata` deixou de depender exclusivamente de `NEXT_PUBLIC_TECHNICAL_PROCESS_ID`;
- a rota agora permite informar o identificador de processo na propria tela;
- `NEXT_PUBLIC_TECHNICAL_PROCESS_ID` permanece apenas como preenchimento inicial opcional;
- a solucao ainda nao substitui uma listagem segura de processos por perfil.

Atualizacao de 2026-05-04:

- varredura frontend encontrou uso da variavel tecnica em `/chefia-imediata`, `/processos` e `/servidor-estagiario`;
- a leitura de `NEXT_PUBLIC_TECHNICAL_PROCESS_ID` foi centralizada em helper unico de selecao de processo;
- `/servidor-estagiario` passou a permitir consulta manual por identificador de processo na propria tela;
- `/processos` e `/chefia-imediata` permanecem com consulta manual e usam a variavel apenas como preenchimento inicial opcional;
- a dependencia operacional de ID tecnico fixo foi mitigada nas telas mapeadas, mas a task continua aberta ate existir listagem segura de processos por perfil.

## Escopo previsto

- substituir dependencia de ID tecnico fixo;
- introduzir listagem ou selecao segura de processos conforme perfil;
- alinhar backend e frontend sobre fonte real de processos disponiveis.

## Fora do escopo

- implementar painel completo sem endpoints;
- mudar autorizacao;
- alterar workflow.

## Evidencias / referencias

- O roadmap frontend registra `FT-24` como pendente.
- O painel transversal tambem aponta dependencia de process id tecnico como problema de integracao/frontend.

## Validacoes esperadas

- varredura de usos de `NEXT_PUBLIC_TECHNICAL_PROCESS_ID`;
- typecheck frontend;
- build frontend;
- validacao manual das telas afetadas quando houver mudanca funcional futura.

Validacoes executadas em 2026-05-04:

- `npm run frontend:typecheck` passou;
- `npm run frontend:check` passou, incluindo build Next.js.

## Proxima acao

Alinhar a proxima entrega frontend com `FE-CHEFIA-01`: substituir a consulta manual/fallback por listagem segura de processos por perfil quando houver endpoint real disponivel.
