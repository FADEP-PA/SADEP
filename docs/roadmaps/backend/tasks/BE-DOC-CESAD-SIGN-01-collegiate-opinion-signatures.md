# BE-DOC-CESAD-SIGN-01 — Modelar e validar assinatura colegiada do parecer CESAD

## Status

Pendente alta.

## Area

Backend, documentos, assinaturas, CESAD e auditoria.

## Contexto

O fluxo processual exige que parecer CESAD observe os signatarios obrigatorios. A varredura global confirmou que o modelo ja possui `CesadStageOpinionExpectedSigner`, mas o ciclo documental completo de assinatura colegiada do parecer ainda nao esta fechado.

Tambem foi identificado risco na modelagem generica de `SignatureRecord` quando houver multiplos signatarios com o mesmo papel funcional.

## Escopo previsto

- revisar o relacionamento entre `ProcessDocument`, `CesadStageOpinion`, `CesadStageOpinionExpectedSigner` e `SignatureRecord`;
- permitir multiplos signatarios CESAD quando aplicavel, sem colidir por role generica;
- validar completude das assinaturas obrigatorias antes de emissao formal;
- preservar snapshot/congelamento da comissao e dos signatarios esperados;
- impedir parecer formalmente emitido com assinatura obrigatoria pendente;
- registrar auditoria documental de assinatura, pendencia e conclusao;
- criar testes de assinatura colegiada e casos negativos.

## Fora do escopo

- substituir `BE-SEC-03` ou resolver autorizacao contextual CESAD;
- implementar parecer conclusivo final;
- implementar homologacao, notificacao, ciencia ou recurso;
- gerar PDF como fonte unica da verdade;
- alterar frontend demonstrativo.

## Criterios de aceite

- o sistema diferencia signatario esperado de assinatura efetivamente realizada;
- multiplos membros CESAD obrigatorios podem assinar o mesmo documento quando a regra exigir;
- parecer CESAD nao pode ser concluido formalmente enquanto houver assinatura obrigatoria pendente;
- historico e auditoria preservam quem assinou, quando e em qual documento;
- testes cobrem assinatura completa, assinatura pendente e tentativa de emissao indevida.

## Validacoes esperadas

- `npm run typecheck --workspace @sadep/backend`;
- `npm run typecheck:spec --workspace @sadep/backend`;
- testes backend de documentos/CESAD/assinaturas;
- `npm run test --workspace @sadep/backend`;
- `git diff --check`.

## Dependencias

- `docs/skills/process-document-skill.md`;
- `docs/domain/document-modeling-catalog.md`;
- `BE-SEC-03` para autorizacao contextual;
- modelo atual de comissao CESAD e signatarios esperados.

## Proxima acao

Desenhar a menor evolucao de schema e dominio que preserve assinaturas ja existentes e permita assinatura colegiada sem sobrescrever ou colidir registros.
