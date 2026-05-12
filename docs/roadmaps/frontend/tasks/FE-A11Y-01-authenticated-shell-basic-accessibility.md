# FE-A11Y-01 - Acessibilidade basica do shell autenticado

## Status

Concluida no recorte frontend.

## Area

Frontend, acessibilidade basica, shell autenticado e navegacao por teclado.

## Objetivo

Melhorar a navegacao por teclado e os nomes acessiveis do shell autenticado do SADEP, sem alterar fluxos, regras de negocio, dados demonstrativos, endpoints ou contratos.

## Entrega

- Adicionado link de pular para o conteudo principal no shell autenticado.
- Adicionado alvo explicito no conteudo principal com `id="conteudo-principal"`.
- Adicionado rotulo acessivel no menu lateral do ambiente autenticado.
- Adicionados nomes acessiveis estaveis para links de navegacao e botao de saida quando a sidebar esta recolhida.
- Criado estilo de foco visivel para o skip link, preservando a interface institucional.

## Arquivos afetados

- `apps/frontend/src/shared/ui/app-shell.tsx`
- `apps/frontend/src/shared/styles/globals.css`
- `docs/roadmaps/frontend/tasks/FE-A11Y-01-authenticated-shell-basic-accessibility.md`
- `docs/roadmaps/frontend/resolved.md`
- `docs/roadmaps/frontend-tasks-roadmap.md`

## Decisoes tomadas

- O recorte ficou limitado ao shell autenticado compartilhado para melhorar todas as areas autenticadas sem refatoracao ampla.
- Nenhum componente de negocio foi alterado.
- Nenhum endpoint real novo foi conectado.
- Nenhuma regra juridica, processual, de assinatura, emissao, homologacao ou persistencia foi criada.

## Dados demonstrativos

- Dados demonstrativos, fakes seguros, placeholders de input e fallbacks visuais foram preservados.
- Nenhum CPF, matricula, e-mail ou documento sensivel foi criado.

## Limitacoes conhecidas

- Esta task nao substitui auditoria automatizada completa de acessibilidade.
- Fluxos internos complexos, tabelas e formularios especificos podem exigir futuras tasks de acessibilidade por tela.
- Listagem real por perfil, remocao de fallback operacional da chefia e integracao real CESAD continuam dependentes de backend/contracts.

## Validacoes

- `npm run frontend:typecheck`
- `npm run frontend:check`
- `npm run frontend:build`
- `git diff --check`

## Proxima task recomendada

Executar `FE-UX-01` para padronizar estados vazios, loading e erro nas areas autenticadas sem depender de backend novo.
