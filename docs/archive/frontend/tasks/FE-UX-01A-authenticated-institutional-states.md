# FE-UX-01A - Estados institucionais compartilhados para areas autenticadas

## Status

Concluida no recorte frontend.

## Area

Frontend, UX institucional, estados vazios, loading, erro, indisponibilidade temporaria e modo demonstrativo.

## Objetivo

Padronizar um recorte pequeno dos estados visuais das areas autenticadas do SADEP, sem transformar `FE-UX-01` em refatoracao ampla e sem depender de backend/contracts.

## Recorte executado

- Criados wrappers compartilhados em `operational-states.tsx`:
  - `EmptyState`;
  - `TemporaryUnavailableState`;
  - `DemonstrationModeState`.
- Aplicado o recorte em estados ja existentes de:
  - `/processos`;
  - `/servidor-estagiario`;
  - `/chefia-imediata`;
  - `/cesad-comissao`;
  - `/homologacao-autoridade`.
- Adicionado estado de loading institucional explicito na consulta de etapa CESAD.

## Arquivos afetados

- `apps/frontend/src/shared/ui/operational-states.tsx`
- `apps/frontend/src/features/process/components/process-workspace.tsx`
- `apps/frontend/src/features/process/components/intern-server-workspace.tsx`
- `apps/frontend/src/features/process/components/supervisor-evaluation-workspace.tsx`
- `apps/frontend/src/features/cesad/components/cesad-stage-read-workspace.tsx`
- `apps/frontend/src/features/homologacao-autoridade/components/homologation-authority-workspace.tsx`
- `docs/roadmaps/frontend/tasks/FE-UX-01A-authenticated-institutional-states.md`
- `docs/roadmaps/frontend/resolved.md`
- `docs/roadmaps/frontend/active.md`
- `docs/roadmaps/frontend-tasks-roadmap.md`

## Decisoes tomadas

- O recorte ficou restrito a estados locais ja existentes para evitar refatoracao ampla.
- Estados demonstrativos foram preservados e apenas receberam componente institucional proprio.
- Estados vazios passaram a usar componente compartilhado para nao parecerem falha de tela.
- Indisponibilidade temporaria foi separada de erro tecnico para nao mascarar dependencia futura.
- Nenhum endpoint real novo foi conectado.
- Nenhuma regra de negocio, assinatura, emissao, homologacao, parecer final ou persistencia foi criada.

## Dados demonstrativos

- Dados demonstrativos, fakes seguros, placeholders de input e fallbacks visuais foram preservados.
- Nenhum CPF, matricula, e-mail ou documento sensivel foi criado.
- Nao houve mudanca na origem dos dados demonstrativos.

## Limitacoes conhecidas

- Esta e a primeira fatia de `FE-UX-01`; nao padroniza todos os estados internos de todas as tabelas, modais e formularios.
- A remocao de fallback operacional da chefia depende de `FE-CHEFIA-02`.
- Listagens reais por perfil dependem de `FE-PROCESS-LIST-01` e de backend/contracts seguros.
- Integracao real CESAD permanece dependente de `FE-CESAD-01` e das tasks backend correspondentes.

## Validacoes

- `npm run frontend:typecheck`
- `npm run frontend:check`
- `npm run frontend:build`
- `git diff --check`

## Proxima task recomendada

Executar `FE-UX-01B` para padronizar estados internos de listas, tabelas e modais autenticados, ou `FE-COPY-01` para revisar microcopy institucional de mensagens e alertas.
