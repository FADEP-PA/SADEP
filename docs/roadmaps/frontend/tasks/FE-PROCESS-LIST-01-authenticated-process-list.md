# FE-PROCESS-LIST-01 — Listagem segura de processos por perfil autenticado

## Status

Pendente alta.

## Area

Frontend, integracao backend/frontend, processos e autorizacao por perfil.

## Contexto

A varredura global confirmou que `FT-24` foi resolvida: o frontend nao depende mais de `NEXT_PUBLIC_TECHNICAL_PROCESS_ID`. Ainda assim, varias jornadas dependem de consulta manual ou selecao explicita sem listagem segura por perfil autenticado.

Esta task registra a melhoria propria de listagem segura, sem reabrir `FT-24`.

## Escopo previsto

- consumir listagens reais de processos para servidor avaliado, chefia, CESAD e autoridade homologadora, conforme endpoints disponiveis;
- respeitar regras de perfil e autorizacao definidas no backend;
- tratar loading, erro, vazio, sem permissao e paginacao/filtros se aplicavel;
- substituir dependencia de IDs tecnicos manuais nas jornadas principais;
- manter separacao entre demonstracao visual e fluxo operacional real.

## Fora do escopo

- reabrir `FT-24`;
- criar decisao juridica ou regra de autorizacao no frontend;
- implementar workflow backend;
- implementar homologacao, recurso ou portaria;
- remover fallback especifico da chefia se isso for tratado em `FE-CHEFIA-02`.

## Criterios de aceite

- cada perfil ve apenas processos autorizados pelo backend;
- a UI nao revela processos fora do escopo do usuario autenticado;
- falhas de autorizacao sao exibidas como erro/sem permissao, nao como lista vazia enganosa;
- a ausencia de processo e distinguida de falha tecnica;
- a documentacao deixa claro que esta task nao reabre `FT-24`.

## Validacoes esperadas

- `npm run frontend:typecheck`;
- `npm run frontend:check`;
- validacao manual por perfil quando houver endpoints disponiveis;
- `git diff --check`.

## Dependencias

- endpoints backend seguros de listagem por perfil;
- politicas de autorizacao backend;
- `FE-CHEFIA-02` para a experiencia especifica da chefia.

## Proxima acao

Mapear quais perfis ja possuem endpoint seguro de listagem e quais dependem de task backend antes de alterar telas.
