# BE-CESAD-REG-01F — Seed local minimo de comissao CESAD

## Status

Pendente / especificada / executar apos contratos de cadastro estabilizados.

## Relacao com o epico

Task filha de `BE-CESAD-REG-01`.

## Objetivo

Criar seed local minimo que permita testar fluxos CESAD com uma comissao vigente, ato formal e composicao minima de titulares e suplentes.

## Escopo

- Criar ou atualizar seed apenas para ambiente de desenvolvimento/local.
- Cadastrar uma comissao CESAD vigente.
- Cadastrar ato/portaria local de exemplo.
- Vincular no minimo 3 titulares e 2 suplentes.
- Garantir que usuarios seed possuam roles compativeis.
- Manter `COMMISSION_ASSISTANT` fora da composicao formal.
- Evitar execucao em producao.

## Fora do escopo

- Endpoint de cadastro.
- Frontend.
- Dados reais de servidores ou portarias reais.
- Rollover.
- Homologacao, notificacao ou ciencia.

## Pre-condicoes

- Definicao de contracts/payloads em `01A`.
- Preferencialmente implementacao de criacao em `01B`, para que o seed use o mesmo padrao de dominio sempre que possivel.

## Dados esperados

- Comissao local com nome identificavel como ambiente de desenvolvimento.
- Ato ficticio com tipo, numero, ano e vigencia.
- 3 usuarios `CESAD_MEMBER` titulares.
- 2 usuarios `CESAD_MEMBER` suplentes.
- 1 usuario `COMMISSION_ASSISTANT` separado, sem vinculo como membro.

## Regras de seguranca

- Seed deve falhar em `NODE_ENV=production`.
- Nao usar dados reais.
- Senha deve continuar vindo de variavel local segura, como ja ocorre no seed atual.
- Seed deve ser idempotente.

## Testes/validacoes esperadas

- Rodar seed duas vezes sem duplicar dados.
- `GET /cesad/commissions/current` deve retornar a comissao local vigente.
- Composicao deve conter 3 titulares e 2 suplentes.
- Assistente deve existir como usuario, mas nao como membro.
- Banco local deve passar em `db:check`, se aplicavel.

## Criterios de aceite

- Ambiente local passa a ter comissao CESAD funcional para testes manuais.
- Seed nao usa dados reais.
- Seed nao executa em producao.
- Fluxos de leitura CESAD continuam funcionando.

## Dependencias

- `BE-CESAD-REG-01A`.
- Preferencialmente `BE-CESAD-REG-01B`.

## Paralelizacao

Pode ser preparada em paralelo com frontend demonstrativo e documentacao, mas a implementacao deve aguardar a estabilizacao do modelo de criacao da comissao.
