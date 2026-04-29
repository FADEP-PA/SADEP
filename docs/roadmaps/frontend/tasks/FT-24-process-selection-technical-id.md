# FT-24 — Reduzir dependencia de NEXT_PUBLIC_TECHNICAL_PROCESS_ID

## Status

Pendente.

## Area

Frontend e integracao backend/frontend.

## Fonte de transicao

- [`../../frontend-tasks-roadmap.md`](../../frontend-tasks-roadmap.md)
- [`../active.md`](../active.md)
- [`../../problemas-atuais-do-projeto.md`](../../problemas-atuais-do-projeto.md)

## Contexto

O frontend ainda depende de `NEXT_PUBLIC_TECHNICAL_PROCESS_ID` em fluxos operacionais. Isso pode ser aceitavel para demonstracao, mas nao para fluxo real.

## Estado atual

O roadmap frontend mantem `FT-24` como pendente para reduzir dependencia operacional de ID tecnico manual de processo em desenvolvimento.

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

## Proxima acao

Executar varredura de rotas e telas que usam `NEXT_PUBLIC_TECHNICAL_PROCESS_ID`.

