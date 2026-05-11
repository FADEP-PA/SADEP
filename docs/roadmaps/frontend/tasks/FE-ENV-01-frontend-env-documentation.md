# FE-ENV-01 — Documentar variaveis de ambiente do frontend e evitar fallback inseguro de API

## Status

Pendente operacional.

## Area

Frontend, DX, deploy e configuracao.

## Contexto

A varredura global confirmou uso de `NEXT_PUBLIC_API_BASE_URL` no frontend e ausencia de `NEXT_PUBLIC_TECHNICAL_PROCESS_ID`. Tambem apontou a necessidade de documentar melhor variaveis publicas do frontend e riscos de fallback silencioso em producao.

Esta task e documental/operacional ate haver decisao de alterar codigo ou criar arquivo `.env.example`.

## Escopo previsto

- documentar `NEXT_PUBLIC_API_BASE_URL`;
- definir comportamento esperado por ambiente local, homologacao e producao;
- avaliar criacao ou atualizacao de `.env.example` do frontend quando permitido;
- registrar risco de fallback silencioso perigoso em producao;
- alinhar documentacao de setup/deploy com a configuracao real.

## Fora do escopo

- alterar codigo frontend nesta task documental;
- reintroduzir `NEXT_PUBLIC_TECHNICAL_PROCESS_ID`;
- alterar backend, contracts, package.json ou lockfile;
- implementar deploy.

## Criterios de aceite

- documentacao operacional indica qual API o frontend deve consumir;
- ambientes locais e de producao ficam diferenciados;
- ausencia de `NEXT_PUBLIC_TECHNICAL_PROCESS_ID` permanece registrada como resolvida em `FT-24`;
- qualquer mudanca de codigo necessaria vira task propria.

## Validacoes esperadas

- `npm run frontend:check`, se houver alteracao relacionada ao frontend;
- `git diff --check`;
- revisao manual dos documentos de setup/deploy.

## Dependencias

- decisao sobre criar ou nao `.env.example` frontend;
- politica de deploy do projeto.

## Proxima acao

Definir se a proxima fase permite criar arquivo de exemplo de env frontend ou apenas atualizar documentacao de setup.
