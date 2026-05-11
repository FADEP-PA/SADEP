# BE-CESAD-AUTH-01 — Aplicar autorizacao contextual CESAD aos endpoints sensiveis

## Status

Pendente critica.

## Area

Backend, seguranca, CESAD e autorizacao contextual.

## Contexto

`BE-SEC-03` permanece como guarda-chuva de seguranca contextual CESAD. A varredura global confirmou que ha estruturas auxiliares e testes parciais de autorizacao contextual, mas a politica ainda precisa ser aplicada aos endpoints e fluxos sensiveis.

Esta task detalha a primeira fatia executiva de `BE-SEC-03`: deixar de aceitar acesso CESAD sensivel apenas por role global e status do processo.

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

Inventariar endpoints CESAD sensiveis e decidir a menor camada comum para aplicar a politica contextual sem duplicar regras entre controllers e services.
