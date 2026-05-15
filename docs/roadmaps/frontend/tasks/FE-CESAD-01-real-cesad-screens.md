# FE-CESAD-01 — Integracao real das telas CESAD com processos e pareceres

## Status

Pendente alta.

## Area

Frontend, CESAD, documentos, workflow e integracao backend.

## Contexto

A tela CESAD possui leitura consolidada por processo/etapa, mas a varredura global confirmou que o fluxo frontend ainda nao cobre de forma completa a emissao, acompanhamento documental e assinatura de parecer CESAD.

O backend ja possui autorizacao contextual, documento/assinatura colegiada do parecer CESAD de etapa e, apos `BE-CESAD-FINAL-01B`, documento processual e assinatura colegiada do parecer conclusivo final. Esta task permanece pendente porque essas capacidades ainda nao foram integradas ao frontend e porque o envio formal a homologacao depende de `BE-CESAD-FINAL-01C`.

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
- recriar regras de assinatura colegiada no frontend em vez de consumir contratos/capabilities backend;
- implementar envio a homologacao, homologacao, notificacao ou ciencia;
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
- `BE-CESAD-FINAL-01B`, ja concluida no backend para documento e assinatura final;
- `BE-CESAD-FINAL-01C`, ainda pendente para envio formal a homologacao;
- endpoints/backend contracts e capabilities de parecer CESAD a serem mapeados para a UI;
- possivel `FE-PROCESS-LIST-01`.

## Proxima acao

Mapear os contratos/capabilities backend existentes para parecer CESAD de etapa e parecer conclusivo final, aguardar a decisao da `BE-CESAD-FINAL-01C` quando a tela depender de envio formal a homologacao, e somente entao remover fallback visual.
