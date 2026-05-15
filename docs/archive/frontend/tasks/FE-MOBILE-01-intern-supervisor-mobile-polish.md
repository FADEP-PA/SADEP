# FE-MOBILE-01 — Polimento mobile servidor e chefia

## Status

Concluida no recorte frontend.

## Area

Frontend visual e responsividade.

## Contexto

As telas `/servidor-estagiario` e `/chefia-imediata` ja preservavam o modo demonstrativo e a consulta manual de processo real. O recorte desta task foi apenas melhorar a leitura em telas estreitas, sem alterar workflow, backend, contratos ou regras processuais.

## Escopo entregue

- refinamento do empilhamento mobile dos blocos de modo demonstrativo/processo real;
- ajuste de largura e alinhamento de acoes em cards da chefia e do servidor;
- melhoria da leitura dos cards de etapa do servidor em telas estreitas;
- preservacao dos dados demonstrativos, placeholders e fakes usados para apresentacao visual.

## Fora do escopo

- alterar backend;
- alterar workflow;
- remover fallback demonstrativo;
- implementar listagem real de processos por perfil;
- alterar regras de assinatura, autoavaliacao ou avaliacao da chefia.

## Validacoes esperadas

- `npm run frontend:typecheck`;
- `npm run frontend:check`;
- `git diff --check`.
