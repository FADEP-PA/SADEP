# FE-CESAD-01 — Integracao real das telas CESAD com processos e pareceres

## Status

Pendente alta.

## Area

Frontend, CESAD, documentos, workflow e integracao backend.

## Contexto

A tela CESAD possui leitura consolidada por processo/etapa, mas a varredura global confirmou que o fluxo frontend ainda nao cobre de forma completa a emissao, acompanhamento documental e assinatura de parecer CESAD.

Esta task deve acompanhar a evolucao backend de autorizacao contextual, documentos e assinatura colegiada.

## Escopo previsto

- consumir endpoints reais de processos e etapas CESAD;
- exibir estados reais do parecer por etapa;
- permitir ou bloquear acoes conforme capacidades retornadas pelo backend;
- remover mocks e fallback demonstrativo do fluxo operacional CESAD;
- respeitar autorizacao contextual;
- exibir documentos e assinaturas conforme modelagem backend;
- tratar loading, erro, vazio e sem permissao.

## Fora do escopo

- implementar autorizacao contextual no frontend;
- substituir `BE-SEC-03`;
- implementar assinatura colegiada antes do backend suportar o ciclo;
- implementar parecer conclusivo final se `BE-CESAD-FINAL-01` ainda nao existir;
- alterar regras juridicas/processuais.

## Criterios de aceite

- CESAD ve apenas processos/etapas autorizados pelo backend;
- a tela diferencia parecer inexistente, em rascunho, concluido e pendente de assinatura quando esses estados existirem;
- a UI nao permite acao que o backend nao reconheca como capability;
- falhas de autorizacao e de workflow nao sao mascaradas por fallback local.

## Validacoes esperadas

- `npm run frontend:typecheck`;
- `npm run frontend:check`;
- validacao manual com usuario CESAD e assistente, quando aplicavel;
- `git diff --check`.

## Dependencias

- `BE-SEC-03` / `BE-CESAD-AUTH-01`;
- `BE-DOC-CESAD-SIGN-01`;
- endpoints backend de parecer CESAD;
- possivel `FE-PROCESS-LIST-01`.

## Proxima acao

Aguardar ou mapear o contrato backend de parecer CESAD e capabilities antes de remover fallback visual.
