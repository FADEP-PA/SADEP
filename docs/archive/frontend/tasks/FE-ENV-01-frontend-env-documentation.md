# FE-ENV-01 — Documentar variaveis de ambiente do frontend e evitar fallback inseguro de API

## Status

Concluida no recorte documental/frontend.

## Area

Frontend, DX, deploy e configuracao.

## Contexto

A varredura global confirmou uso de `NEXT_PUBLIC_API_BASE_URL` no frontend e ausencia de `NEXT_PUBLIC_TECHNICAL_PROCESS_ID`. Tambem apontou a necessidade de documentar melhor variaveis publicas do frontend e riscos de fallback silencioso em producao.

Esta task foi concluida como recorte documental/operacional. Nao houve alteracao de codigo, criacao de `.env.example` ou mudanca de fallback runtime.

## Configuracao documentada

- Variavel publica do frontend: `NEXT_PUBLIC_API_BASE_URL`.
- Uso atual no codigo: `apps/frontend/src/shared/api/http-client.ts`.
- Fallback local atual: `http://localhost:3000`, usado apenas quando `NEXT_PUBLIC_API_BASE_URL` nao esta definida.
- Desenvolvimento local: pode omitir a variavel se o backend estiver em `http://localhost:3000`, ou defini-la explicitamente para evitar ambiguidade.
- Homologacao/producao: deve definir `NEXT_PUBLIC_API_BASE_URL` com a origin HTTPS da API institucional, sem path final, query, fragmento, credenciais ou wildcard.
- `NEXT_PUBLIC_TECHNICAL_PROCESS_ID` permanece removida do frontend e nao deve ser reintroduzida.

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

## Conclusao

- Atualizados `docs/setup/local-setup.md` e `apps/frontend/README.md` com o comportamento esperado de `NEXT_PUBLIC_API_BASE_URL`.
- O painel frontend ativo deixou de listar `FE-ENV-01` como backlog pendente.
- O item foi registrado em `docs/roadmaps/frontend/resolved.md`.
- Decisao tomada: nao criar `.env.example` do frontend neste recorte para evitar novo artefato operacional sem politica de deploy definida.
- Limitacao conhecida: o codigo ainda preserva fallback local para `http://localhost:3000`; se houver decisao de bloquear fallback em build de producao, isso deve virar task propria com alteracao de codigo e validacao especifica.

## Validacoes esperadas

- `npm run frontend:typecheck`;
- `npm run frontend:check`;
- `git diff --check`;
- revisao manual dos documentos de setup/deploy.

## Dependencias

- decisao sobre criar ou nao `.env.example` frontend;
- politica de deploy do projeto.

## Proxima acao

Se a politica de deploy exigir falha explicita sem `NEXT_PUBLIC_API_BASE_URL` em producao, abrir task frontend propria para alterar `http-client.ts` e validar o comportamento por ambiente.
