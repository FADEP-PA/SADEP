# BE-HOMOLOG-01 — Modelar fluxo de homologacao, notificacao e ciencia

## Status

Pendente alta, dependente de parecer conclusivo final.

## Area

Backend, workflow, documentos, autoridade homologadora e ciencia.

## Contexto

Homologacao final so pode ocorrer apos parecer conclusivo final da CESAD. A varredura global confirmou que a area de homologacao no frontend e demonstrativa/preparada, mas o backend ainda nao possui fluxo funcional completo de homologacao, notificacao e ciencia.

Esta task registra a frente futura sem antecipar implementacao indevida.

`BE-FLOW-4STAGE-01B` concluiu a progressao formal das quatro etapas por `COMPLETE_CURRENT_STAGE`, mas a conclusao da etapa 4 nao libera homologacao.

`BE-CESAD-FINAL-01A` concluiu a base funcional do parecer conclusivo final (`CesadFinalOpinion`, elegibilidade, consolidacao historica e fluxo `start`/`saveDraft`/`complete`). `BE-CESAD-FINAL-01B` concluiu a camada documental e a assinatura colegiada final, incluindo `ProcessDocument.opinionKind`, documento final `CESAD_OPINION / FINAL_CONCLUSIVE`, expected signers finais e documento `SIGNED` somente apos completude colegiada.

Mesmo assim, a homologacao continua dependente de envio formal a homologacao em `BE-CESAD-FINAL-01C`. A 01B sozinha nao homologa, nao notifica e nao libera efeitos finais.

## Escopo previsto

- modelar decisao de homologacao apos parecer conclusivo final;
- modelar notificacao do servidor avaliado;
- modelar ciencia/visualizacao valida;
- registrar efeitos processuais de homologacao, notificacao e ciencia;
- prever documentos correlatos e assinaturas quando aplicavel;
- garantir auditoria completa dos atos;
- preparar pontos de extensao para recurso final sem implementa-lo automaticamente.

## Fora do escopo

- homologar processo sem parecer conclusivo final;
- implementar recurso administrativo completo;
- implementar portaria/publicacao;
- alterar fluxo das quatro etapas;
- implementar decisao juridica no frontend;
- tratar tela demonstrativa como fluxo backend concluido.

## Criterios de aceite

- workflow bloqueia homologacao antes do parecer conclusivo final;
- homologacao, notificacao e ciencia possuem atos, datas e usuarios rastreaveis;
- documentos processuais afetados ficam identificados;
- ciencia valida passa a ser pre-condicao para prazos recursais futuros;
- testes cobrem tentativa prematura e fluxo autorizado.

## Validacoes esperadas

- `npm run typecheck --workspace @sadep/backend`;
- `npm run typecheck:spec --workspace @sadep/backend`;
- testes backend de workflow/homologacao/documentos;
- `npm run test --workspace @sadep/backend`;
- `git diff --check`.

## Dependencias

- `BE-CESAD-FINAL-01A`, ja concluida no recorte funcional, sem liberar homologacao isoladamente;
- `BE-CESAD-FINAL-01B`, ja concluida no recorte documental e de assinatura colegiada final, sem liberar homologacao isoladamente;
- `BE-CESAD-FINAL-01C`, como ponte formal `SEND_TO_HOMOLOGATION`, se mantida no roadmap;
- `BE-FLOW-4STAGE-01`, concluida no recorte de progressao formal das quatro etapas;
- `docs/workflow/four-stage-flow-and-appeals.md`;
- regras futuras de recurso final.

## Proxima acao

Aguardar a ponte formal `BE-CESAD-FINAL-01C` e entao definir os atos minimos de homologacao, notificacao e ciencia.
