# BE-CESAD-FINAL-01 — Modelar parecer conclusivo final da CESAD

## Status

Pendente alta.

## Area

Backend, CESAD, workflow, documentos e dominio processual.

## Contexto

No Caso 2, o parecer conclusivo final da CESAD so pode ocorrer apos a conclusao das quatro etapas avaliativas. A varredura global confirmou que existem pareceres CESAD por etapa, mas nao ha modelagem funcional completa do parecer conclusivo final.

Sem este parecer final, homologacao, notificacao e publicacao nao devem ser habilitadas.

## Escopo previsto

- diferenciar parecer CESAD por etapa de parecer conclusivo final;
- definir pre-condicoes para elaboracao do parecer final;
- consolidar resultados das quatro etapas;
- prever ciclo documental e assinatura, quando aplicavel;
- integrar o parecer final ao workflow como pre-condicao de homologacao futura;
- registrar auditoria de elaboracao, assinatura, conclusao e envio a autoridade homologadora.

## Fora do escopo

- implementar homologacao final na mesma task;
- implementar notificacao, ciencia, recurso ou portaria;
- apagar ou sobrescrever pareceres de etapa;
- tratar PDF como fonte unica da verdade;
- alterar regras juridicas consolidadas.

## Criterios de aceite

- parecer final nao pode ser iniciado antes das quatro etapas estarem formalmente concluidas;
- parecer final nao substitui nem apaga pareceres de etapa;
- workflow impede homologacao sem parecer conclusivo final;
- documentos e assinaturas seguem a modelagem documental oficial;
- auditoria registra o ato conclusivo e artefatos afetados.

## Validacoes esperadas

- `npm run typecheck --workspace @sadep/backend`;
- `npm run typecheck:spec --workspace @sadep/backend`;
- testes backend de workflow/CESAD/documentos;
- `npm run test --workspace @sadep/backend`;
- `git diff --check`.

## Dependencias

- `BE-FLOW-4STAGE-01`;
- `BE-DOC-CESAD-SIGN-01`, se assinatura colegiada for exigida para o parecer final;
- `docs/workflow/four-stage-flow-and-appeals.md`;
- `docs/domain/document-modeling-catalog.md`.

## Proxima acao

Definir a entidade ou extensao de dominio do parecer conclusivo final e suas pre-condicoes sem antecipar homologacao.
