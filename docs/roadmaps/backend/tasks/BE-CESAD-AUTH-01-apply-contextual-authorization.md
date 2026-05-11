# BE-CESAD-AUTH-01 — Aplicar autorizacao contextual CESAD aos endpoints sensiveis

## Status

Concluida / auditada / aprovada com ressalvas.

## Area

Backend, seguranca, CESAD e autorizacao contextual.

## Contexto

`BE-SEC-03` permanece como guarda-chuva de seguranca contextual CESAD. A varredura global confirmou que ha estruturas auxiliares e testes parciais de autorizacao contextual, mas a politica ainda precisa ser aplicada aos endpoints e fluxos sensiveis.

Esta task detalha a primeira fatia executiva de `BE-SEC-03`: deixar de aceitar acesso CESAD sensivel apenas por role global e status do processo.

## Resultado entregue

- `CesadContextAuthorizationService` foi reaproveitado como camada central de autorizacao contextual.
- Workflow e historico de processos CESAD passaram a exigir vinculo contextual para `CESAD_MEMBER` e `COMMISSION_ASSISTANT`.
- As transicoes CESAD sensiveis `ISSUE_CESAD_OPINION` e `REQUEST_ADJUSTMENT` passaram a exigir autorizacao contextual.
- A leitura consolidada CESAD por etapa passou a exigir autorizacao contextual.
- A leitura, o rascunho e a conclusao do parecer CESAD de etapa passaram a exigir autorizacao contextual.
- `CESAD_MEMBER` sem vinculo ativo e bloqueado.
- `COMMISSION_ASSISTANT` sem vinculo ativo e bloqueado.
- `COMMISSION_ASSISTANT` vinculado permanece restrito a leitura/apoio, sem escrita de parecer nem transicao CESAD.
- Fluxos de servidor avaliado, chefia imediata e admin foram preservados.
- Testes backend foram ampliados para cenarios positivos e negativos.
- Commit funcional aprovado: `211a4d4 feat(backend): apply contextual CESAD authorization`.

## Escopo previsto

- mapear endpoints de leitura consolidada CESAD, parecer por etapa e transicoes relacionadas;
- aplicar service, policy ou guard de autorizacao contextual nos pontos de entrada;
- validar membro, assistente, comissao, processo e etapa conforme o modelo disponivel;
- bloquear acesso baseado apenas em `CESAD_MEMBER` ou `COMMISSION_ASSISTANT` sem vinculo contextual;
- registrar lacunas de schema quando o vinculo processo/etapa/comissao ainda nao existir de forma persistida;
- criar testes positivos e negativos para acesso autorizado e negado.

## Fora do escopo

- concluir integralmente `BE-SEC-03` se ainda houver dependencia de schema ou workflow;
- modelar assinatura colegiada do parecer CESAD;
- alterar o fluxo de quatro etapas;
- implementar parecer conclusivo final;
- implementar homologacao, notificacao, ciencia, recurso ou portaria;
- alterar frontend.

## Criterios de aceite

- endpoints sensiveis CESAD deixam de depender apenas de role global;
- usuarios CESAD sem vinculo contextual adequado recebem negativa de autorizacao;
- usuarios vinculados ao contexto adequado conseguem executar a acao esperada;
- testes cobrem pelo menos um caso positivo e um negativo por grupo de endpoint afetado;
- lacunas estruturais remanescentes ficam documentadas sem marcar `BE-SEC-03` como resolvida.

## Validacoes executadas no recorte aprovado

- `npm run typecheck --workspace @sadep/backend`;
- `npm run typecheck:spec --workspace @sadep/backend`;
- `npm run test --workspace @sadep/backend`;
- `npx prisma validate --schema apps/backend/prisma/schema.prisma` com `DATABASE_URL` temporaria;
- `git diff --check`.

## Ressalvas remanescentes

- A politica ainda usa comissao/membresia vigente como referencia transitoria.
- Ainda nao ha vinculo persistido comissao-processo/etapa.
- Assinatura colegiada CESAD permanece em `BE-DOC-CESAD-SIGN-01`.
- Workflow completo de quatro etapas permanece em `BE-FLOW-4STAGE-01`.
- Parecer conclusivo final permanece em `BE-CESAD-FINAL-01`.
- Homologacao, notificacao e ciencia permanecem em `BE-HOMOLOG-01`.
- Testes adicionais futuros podem cobrir `COMMISSION_ASSISTANT` tentando `REQUEST_ADJUSTMENT`, comissao `SUPERSEDED` e cobertura HTTP adicional para `REQUEST_ADJUSTMENT`.

## Validacoes esperadas

- `npm run typecheck --workspace @sadep/backend`;
- `npm run typecheck:spec --workspace @sadep/backend`;
- testes backend do modulo CESAD/autorizacao;
- `npm run test --workspace @sadep/backend`, se o escopo do patch afetar multiplos modulos;
- `git diff --check`.

## Dependencias

- `BE-SEC-03`;
- modelo atual de comissao/membro CESAD;
- possivel evolucao futura de vinculo persistido processo/etapa/comissao.

## Proxima acao

Manter `BE-SEC-03` aberta para os refinamentos estruturais de vinculo persistido comissao-processo/etapa e integracoes futuras com assinatura colegiada, workflow completo e pareceres posteriores.
