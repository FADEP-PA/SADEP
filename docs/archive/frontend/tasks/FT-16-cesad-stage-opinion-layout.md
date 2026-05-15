# FT-16 — Preparar layout base do futuro parecer CESAD de etapa

## Status

Concluida no recorte frontend.

## Area

Frontend, CESAD, layout institucional e dados demonstrativos.

## Objetivo

Preparar em `/cesad-comissao` a estrutura visual do futuro parecer CESAD por etapa, sem implementar emissao, assinatura, homologacao, persistencia ou fluxo juridico completo.

## Entrega

- Criado `ReadOnlyOpinionShell` para representar o layout base do parecer CESAD da etapa.
- Criada camada frontend de dados demonstrativos em `cesad-stage-opinion-demo.ts`.
- A tela `/cesad-comissao` passou a exibir:
  - modo demonstrativo com parecer ausente, em elaboracao e pronto/consolidado;
  - shell de leitura para parecer retornado no snapshot real da etapa;
  - estado de ausencia de parecer quando o backend nao retorna documento funcional.
- O layout diferencia visualmente dados demonstrativos de leitura real.
- Nenhuma acao formal foi habilitada.

## Arquivos afetados

- `apps/frontend/src/features/cesad/components/cesad-stage-read-workspace.tsx`
- `apps/frontend/src/features/cesad/components/read-only-opinion-shell.tsx`
- `apps/frontend/src/features/cesad/data/cesad-stage-opinion-demo.ts`
- `apps/frontend/src/shared/styles/globals.css`

## Decisoes tomadas

- O layout foi implementado como componente isolado para poder ser reaproveitado quando `FE-CESAD-01` receber contrato backend real.
- Os dados demonstrativos usam identificadores ficticios `SADEP-CESAD-DEMO-*`, sem CPF, matricula real, e-mail real ou documento sensivel.
- O frontend nao simula assinatura, emissao, homologacao ou parecer conclusivo final.
- A consulta real de leitura consolidada da etapa foi preservada; nenhum endpoint novo foi conectado.

## Limitacoes conhecidas

- A elaboracao e persistencia do parecer dependem de endpoints e capacidades backend.
- A assinatura colegiada depende de `BE-DOC-CESAD-SIGN-01`.
- A autorizacao contextual CESAD depende de `BE-SEC-03` / `BE-CESAD-AUTH-01`.
- A integracao real completa das telas CESAD permanece em `FE-CESAD-01`.

## Validacoes

- `npm run frontend:typecheck`
- `npm run frontend:check`
- `git diff --check`

## Proxima task recomendada

Executar `FT-26` para limpar scaffolds/placeholders legados do frontend sem remover dados demonstrativos uteis. A integracao real CESAD deve aguardar contratos backend ou seguir por `FE-CESAD-01` quando as dependencias estiverem disponiveis.
