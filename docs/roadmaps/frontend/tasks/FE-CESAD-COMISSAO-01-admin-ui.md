# FE-CESAD-COMISSAO-01 — Interface administrativa da Comissao CESAD

## Status

Concluida no recorte de leitura real / aprovada com lacunas futuras.

## Atualizacao de fechamento

- **Data de sincronizacao:** 2026-07-03.
- **Issues relacionadas:** `#64` e `#66`.
- **PRs relacionados:** `#67`, `#75`, `#76` e `#78`.
- **Frente backend relacionada:** [`BE-CESAD-REG-01`](../../backend/tasks/BE-CESAD-REG-01-commission-registration-management.md).

Esta task deixou de estar pendente. A interface administrativa da Comissao CESAD foi entregue no recorte de leitura real, com estrutura visual para evolucao de cadastro/manutencao.

A task nao deve ser interpretada como CRUD funcional completo. Criacao, edicao, encerramento e supersessao pela interface ficam para task futura propria.

## Objetivo consolidado

Disponibilizar uma area administrativa para consulta e acompanhamento das comissoes CESAD, permitindo que perfis autorizados visualizem a comissao atual, lista historica/futura, ato designativo e composicao.

## Escopo entregue

- Rota administrativa `/cesad-comissao/admin`.
- Acesso visual para `ADMIN` e `HOMOLOGATION_AUTHORITY`.
- Consumo real do service frontend de comissoes CESAD.
- Listagem de comissoes cadastradas retornadas pela API.
- Identificacao da comissao atual quando aplicavel.
- Exibicao de situacao temporal, como vigente, futura/agendada, encerrada, inativa ou supersedida, conforme dados recebidos.
- Consulta visual de detalhes da comissao selecionada.
- Exibicao de ato/portaria quando retornado pela API.
- Exibicao de titulares e suplentes quando retornados pela API.
- Estados de carregamento, erro e lista vazia.
- Scaffold visual para futura criacao/manutencao.
- Alinhamento de leitura com backend: `ADMIN` e `HOMOLOGATION_AUTHORITY` podem consultar `GET /cesad/commissions` e `GET /cesad/commissions/:id`.
- Ajuste de qualidade textual para o `copy-check` frontend.

## Fora do escopo entregue

- Criar comissao pela interface.
- Editar comissao pela interface.
- Encerrar comissao pela interface.
- Superseder comissao pela interface.
- Enviar formularios reais de ato/portaria.
- Implementar validacao client-side como fonte de verdade.
- Implementar rollover pela tela.
- Alterar assinatura CESAD, parecer final, homologacao ou notificacao.
- Substituir regras backend por regras visuais.

## Dependencias backend resolvidas

| Dependencia | Estado |
|---|---|
| `BE-CESAD-REG-01A` | Concluida. |
| `BE-CESAD-REG-01B` | Concluida. |
| `BE-CESAD-REG-01C` | Concluida. |
| `BE-CESAD-REG-01D` | Concluida com ressalva de DTO formal futuro. |
| `BE-CESAD-REG-01E` | Concluida no recorte de rollover implementado. |
| `BE-CESAD-REG-01F` | Concluida. |
| `FIX-CESAD-ADMIN-01` / `#77` | Concluida; alinhou leitura para `ADMIN` e `HOMOLOGATION_AUTHORITY`. |

## Componentes e tela entregues

- Lista de comissoes.
- Card de comissao atual.
- Painel de detalhes da comissao.
- Bloco de ato/portaria.
- Blocos de titulares e suplentes.
- Estados operacionais de carregamento, erro e ausencia de dados.
- Area visual de previsao de cadastro/manutencao ainda sem envio funcional.

## Regras de UX consolidadas

- Diferenciar status cadastral de situacao temporal.
- Mostrar claramente quando a comissao e futura/agendada.
- Mostrar vigencia e data fim quando disponiveis.
- Nao prometer rollover automatico na interface.
- Deixar claro que as acoes de manutencao dependem de evolucao futura.
- Nao duplicar regra de negocio como fonte de verdade no frontend.

## Autorizacao visual

Perfis com acesso a tela:

- `ADMIN`;
- `HOMOLOGATION_AUTHORITY`.

Acoes sensiveis futuras devem continuar condicionadas ao backend e as regras de autorizacao correspondentes.

## Criterios de aceite consolidados

- A tela administrativa existe e esta acessivel pelos perfis previstos.
- A leitura de comissoes consome dados reais da API.
- A leitura administrativa esta alinhada entre frontend e backend.
- Comissoes, atos e membros sao exibidos quando retornados pela API.
- A interface nao afirma CRUD completo.
- Acoes sensiveis permanecem como evolucao futura.
- O `copy-check` frontend passa.

## Lacunas futuras

As lacunas abaixo devem ser abertas como novas tasks, sem reabrir `FE-CESAD-COMISSAO-01`:

| Task futura | Objetivo |
|---|---|
| `FE-CESAD-COMISSAO-CRUD-02` | Conectar criacao, edicao, encerramento e supersessao pela interface administrativa. |
| `CONTRACT-CESAD-COMMISSION-WRITE-01` | Exportar payloads de escrita de comissao CESAD pelo pacote `@sadep/contracts`. |
| `BE-CESAD-COMISSAO-CLOSE-DTO-01` | Formalizar payload de encerramento/supersessao com motivo, data administrativa e metadados. |

## Proxima acao

Nao executar nova implementacao dentro de `FE-CESAD-COMISSAO-01`.

A evolucao correta e abrir `FE-CESAD-COMISSAO-CRUD-02` quando houver decisao de UX e contrato de escrita consolidado.
