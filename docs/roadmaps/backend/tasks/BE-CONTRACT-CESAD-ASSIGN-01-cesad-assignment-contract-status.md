# BE-CONTRACT-CESAD-ASSIGN-01 — Expor status de CesadStageAssignment em contracts, se necessario

## Status

Condicional / futura.

## Area

Backend, contracts, CESAD e integracao frontend/backend.

## Contexto

A varredura global confirmou que o Prisma ja possui `CesadStageAssignmentStatus` e que `@sadep/contracts` ja expoe eventos e actions relacionados a supersessao de assignment CESAD.

No recorte atual, o frontend nao consome diretamente o status da assignment. Portanto, nao ha prioridade imediata para alterar contracts apenas por simetria com o schema.

## Escopo previsto

- expor status de `CesadStageAssignment` em `@sadep/contracts` se a API publica ou o frontend passarem a consumir diretamente esse status;
- alinhar tipos de resposta de endpoints CESAD que exponham assignment;
- preservar compatibilidade com os enums ja existentes de workflow e auditoria.

## Fora do escopo

- alterar Prisma schema ou migrations;
- implementar novo endpoint CESAD;
- alterar frontend antes de existir consumo real;
- resolver assinatura colegiada, quatro etapas, parecer final ou homologacao.

## Criterios de aceite

- ha demanda real de API/frontend para o status da assignment;
- `@sadep/contracts` expoe o tipo sem duplicar semantica divergente do backend;
- backend e frontend compilam consumindo o contrato compartilhado.

## Dependencias

- evolucao de endpoints CESAD que exponham assignment;
- possivel `FE-CESAD-01`;
- possivel tela administrativa de reatribuicao CESAD.

## Proxima acao

Manter como alerta condicional. Nao implementar enquanto o status de assignment nao for parte de contrato publico ou consumo frontend real.
