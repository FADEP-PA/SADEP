# DX-FE-ENV-EXAMPLE-01 — Criar .env.example do frontend

## Status

Pendente / DX.

## Area

Frontend, DX, setup e deploy.

## Contexto

A varredura global confirmou que `NEXT_PUBLIC_API_BASE_URL` existe no codigo frontend e possui fallback local para `http://localhost:3000`, mas nao ha referencia clara equivalente a `.env.example` no frontend.

Esta atualizacao apenas registra a task. A criacao do arquivo `.env.example` fica para recorte proprio, para evitar alterar configs fora do escopo documental autorizado.

## Escopo previsto

- criar `apps/frontend/.env.example`, se aprovado como arquivo de configuracao/documentacao;
- documentar `NEXT_PUBLIC_API_BASE_URL`;
- explicitar comportamento local, homologacao e producao;
- alinhar `apps/frontend/README.md` e `docs/setup/local-setup.md` se necessario.

## Fora do escopo

- alterar codigo frontend;
- remover fallback local sem decisao tecnica propria;
- alterar envs do backend;
- reabrir `FT-24`.

## Criterios de aceite

- setup frontend fica reproduzivel sem depender de conhecimento implicito;
- deploy/homologacao exigem API base explicita;
- `NEXT_PUBLIC_TECHNICAL_PROCESS_ID` nao e reintroduzida.

## Proxima acao

Executar em recorte proprio de DX/configuracao, com revisao humana sobre tratar `.env.example` como documentacao ou config.
