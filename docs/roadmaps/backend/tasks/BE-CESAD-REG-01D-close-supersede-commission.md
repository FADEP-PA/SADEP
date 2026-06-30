# BE-CESAD-REG-01D — Encerrar ou superseder comissao

## Status

Pendente / especificada / aguardando `BE-CESAD-REG-01A`.

## Relacao com o epico

Task filha de `BE-CESAD-REG-01`.

## Objetivo

Implementar o encerramento formal e a supersessao de comissoes CESAD, preservando historico e evitando reescrita de atos ja praticados.

## Escopo

- Encerrar comissao por data fim.
- Superseder comissao por nova comissao.
- Garantir que nao haja vigencia sobreposta.
- Preservar assignments historicos.
- Bloquear encerramento retroativo que invalide ato consolidado.
- Auditar encerramento e supersessao.

## Fora do escopo

- Criar nova comissao com composicao inicial, ja tratado em `01B`.
- Editar comissao ainda nao utilizada, tratado em `01C`.
- Rollover de processos em andamento, tratado em `01E`.
- Frontend.
- Seed local.

## Endpoints previstos

Sugestoes sujeitas a confirmacao na `01A`:

```http
POST /cesad/commissions/:id/close
POST /cesad/commissions/:id/supersede
```

A supersessao pode ser implementada como parte do cadastro de nova comissao em `01B`, mas esta task deve consolidar o comportamento explicito de encerramento historico.

## Regras de encerramento

- Encerramento nao pode produzir sobreposicao ou lacuna incorreta sem decisao expressa.
- Encerramento retroativo deve ser bloqueado se afetar ato consolidado.
- Se comissao tiver atos preparatorios pendentes, a consequencia deve ser tratada pela frente de rollover.
- Encerrar comissao nao deve apagar membros, atos ou assignments.

## Regras de supersessao

- Nova comissao posterior pode superseder a anterior.
- Se a anterior estiver sem data fim, recebera fim em D-1.
- Assignments antigos permanecem apontando para a comissao anterior.
- Atos consolidados da anterior permanecem validos.
- Atos preparatorios pendentes devem ser tratados por `01E`.

## Autorizacao

Permitidos:

- `ADMIN`;
- `HOMOLOGATION_AUTHORITY`.

Bloqueados:

- `CESAD_MEMBER`;
- `COMMISSION_ASSISTANT`;
- `IMMEDIATE_SUPERVISOR`;
- `INTERN_SERVER`.

## Auditoria esperada

Eventos futuros esperados:

- `CESAD_COMMISSION_CLOSED`;
- `CESAD_COMMISSION_SUPERSEDED`.

Metadata minima:

- usuario executor;
- perfil executor;
- comissao encerrada;
- nova data fim;
- comissao sucessora, quando houver;
- motivo informado;
- indicador de assignments existentes;
- indicador de atos consolidados e preparatorios.

## Testes obrigatorios

- Encerramento por `ADMIN`.
- Encerramento por `HOMOLOGATION_AUTHORITY`.
- Bloqueio para demais perfis.
- Encerramento de comissao sem assignments.
- Encerramento de comissao com assignments historicos sem apagar vinculos.
- Bloqueio de encerramento retroativo que afete ato consolidado.
- Supersessao com encerramento D-1.
- Auditoria de encerramento/supersessao.

## Criterios de aceite

- Historico preservado.
- Nenhuma assignment e sobrescrita.
- Nenhum documento consolidado e invalidado.
- Fluxos pendentes sao apenas sinalizados para `01E`.
- Leitura da comissao atual continua consistente por data.

## Dependencias

- `BE-CESAD-REG-01A`.
- Parcialmente relacionada a `BE-CESAD-REG-01B`.

## Paralelizacao

Pode ser planejada em paralelo com `01C`. A implementacao deve ser coordenada com `01B` se ambas alterarem regras de vigencia/encerramento D-1.
