# FE-QUAL-02 - Reforco do quality gate visual/textual frontend

## Status

Concluida no recorte frontend.

## Recorte executado

Reforcar o gate local de copy/scaffold do frontend para bloquear termos tecnicos ou de prototipo em `apps/frontend/src`, mantendo a verificacao simples, rapida e sem novas dependencias.

## Arquivos afetados

- `scripts/check-frontend-copy.mjs`
- `apps/frontend/src/shared/auth/auth-context.tsx`
- `apps/frontend/src/app/sessao-expirada/page.tsx`
- `apps/frontend/src/features/cesad/data/cesad-stage-opinion-demo.ts`
- `apps/frontend/src/features/process/services/appeal-readiness-service.ts`
- `apps/frontend/src/features/cesad/components/cesad-stage-read-workspace.tsx`
- `apps/frontend/src/features/cesad/components/stage-document-list.tsx`
- `apps/frontend/src/features/cesad/components/read-only-opinion-shell.tsx`

## Decisoes de qualidade

- O gate continua varrendo `apps/frontend/src` e `apps/frontend/README.md`.
- As regras historicas de `AEP-PA`, `Lorem ipsum`, `TODO`, `em breve` e scaffolds placeholder continuam globais.
- As novas regras de termos tecnicos sao restritas a `apps/frontend/src`, para nao bloquear documentacao tecnica legitima no README.
- O gate passou a bloquear `backend`, `mock`, `mocks`, `fake`, `fakes` e `dados falsos` em codigo fonte frontend.
- A microcopy existente foi ajustada para usar termos institucionais como servico de autenticacao, integracao, API e dados demonstrativos.

## Dados demonstrativos

Dados demonstrativos e fallbacks visuais foram preservados. A task apenas ajustou textos associados a estados demonstrativos e indisponibilidade, sem criar CPF, matricula, e-mail, documento sensivel ou dado identificavel.

## Limitacoes conhecidas

- O gate e textual e nao substitui validacao visual em navegador, testes de interacao ou revisao manual de UX.
- A verificacao evita termos proibidos em `apps/frontend/src`, mas nao interpreta se todo texto exibido em tempo de execucao veio de dados externos.
- Referencias tecnicas no README seguem permitidas quando forem documentacao de manutencao.

## Dependencias futuras

- `FE-PROCESS-LIST-01`, `FE-CHEFIA-02` e `FE-CESAD-01` continuam dependentes de backend/contracts seguros.
- Novos gates visuais automatizados exigiriam decisao futura sobre ferramenta e cobertura, sem escopo nesta task.

## Proxima task recomendada

`FE-A11Y-02` - revisar acessibilidade interna de listas, tabelas, modais e estados autenticados, sem alterar integracoes.
