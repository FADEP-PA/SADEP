# FE-SERVIDOR-01 — Refinar jornada demonstrativa do servidor estagiario

## Status

Concluida no recorte frontend.

## Area

Frontend e experiencia visual do servidor estagiario.

## Contexto

O foco operacional atual prioriza as jornadas de servidor estagiario e chefia imediata. A tela `/servidor-estagiario` precisa preservar dados demonstrativos para apresentacao visual, mas tambem deixar clara a diferenca entre modo demonstrativo e processo real carregado.

## Escopo realizado

- preservou dados demonstrativos, placeholders e fakes;
- manteve consulta manual de processo criada no recorte `FT-21`;
- adicionou bloco visual de modo da jornada, diferenciando demonstracao e processo real;
- exibiu o processo em foco no resumo superior;
- destacou visualmente a etapa atual nos cards da jornada;
- nao alterou backend, contracts, workflow, regras processuais ou auditoria.

## Fora do escopo

- remover dados demonstrativos;
- criar endpoint backend;
- implementar listagem segura por perfil;
- alterar regras juridicas ou estados de workflow;
- implementar CESAD, homologacao ou recurso.

## Validacoes

- `npm run frontend:typecheck`;
- `npm run frontend:check`;
- `git diff --check`.
