# FT-26 — Limpar scaffolds e placeholders legados do frontend

## Status

Concluida no recorte frontend.

## Area

Frontend, limpeza visual, documentacao operacional e preservacao de dados demonstrativos.

## Objetivo

Remover ou refinar scaffolds, placeholders legados e textos genericos que prejudicavam a aparencia institucional do SADEP, preservando dados demonstrativos uteis e fallback visual necessario para validacao das telas.

## Entrega

- Removidos componentes antigos sem uso em `apps/frontend/src/features/home/components/`.
- Removidos estilos orfaos associados a placeholders operacionais antigos.
- Refinado texto visivel do painel `/admin` para deixar de citar "placeholder generico".
- Atualizado `apps/frontend/README.md` para descrever as telas atuais como areas operacionais ou demonstrativas controladas, e nao como paginas placeholder.
- Refinado marcador vazio da tabela da chefia de `-` para "Nao aplicavel".

## Arquivos afetados

- `apps/frontend/README.md`
- `apps/frontend/src/app/(authenticated)/admin/page.tsx`
- `apps/frontend/src/features/home/components/role-placeholder-page.tsx`
- `apps/frontend/src/features/home/components/role-placeholder-section.tsx`
- `apps/frontend/src/features/process/components/supervisor-evaluation-workspace.tsx`
- `apps/frontend/src/shared/styles/globals.css`

## Dados demonstrativos preservados

- Modo demonstrativo e fallback visual de `/servidor-estagiario`.
- Modo demonstrativo e fallback visual de `/chefia-imediata`.
- Dados demonstrativos do layout de parecer CESAD da etapa.
- Estrutura demonstrativa de homologacao sem ato homologatorio real.
- Placeholders de input que orientam preenchimento, por exemplo ID de processo e textos de avaliacao.

## Decisoes tomadas

- Componentes sem uso foram removidos em vez de renomeados porque nenhuma rota ou import ativo dependia deles.
- Dados demonstrativos foram preservados quando ajudam a validar telas sem backend completo.
- Textos que dependem de backend futuro foram mantidos em linguagem institucional, sem prometer emissao, assinatura, homologacao, integracao ou persistencia real.
- Nao houve alteracao de backend, Prisma, contracts, autenticacao backend ou endpoints.

## Limitacoes conhecidas

- Ainda existem dados demonstrativos e fallbacks intencionais porque `FE-PROCESS-LIST-01`, `FE-CHEFIA-02` e `FE-CESAD-01` dependem de contratos/backend.
- A nomenclatura residual AEP-PA permanece restrita a caminho local, historico e tarefas fora do escopo frontend visual desta task.

## Validacoes

- `npm run frontend:typecheck`
- `npm run frontend:check`
- `git diff --check`

## Proxima task recomendada

Executar `FE-PROCESS-LIST-01` quando houver contrato backend seguro para listagem por perfil, ou manter a proxima etapa em documentacao/UX frontend se os endpoints ainda nao estiverem disponiveis.
