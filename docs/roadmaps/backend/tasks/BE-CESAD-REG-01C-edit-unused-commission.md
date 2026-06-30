# BE-CESAD-REG-01C — Editar comissao ainda nao utilizada

## Status

Pendente / especificada / aguardando `BE-CESAD-REG-01A` e preferencialmente `01B`.

## Relacao com o epico

Task filha de `BE-CESAD-REG-01`.

## Objetivo

Permitir edicao controlada de comissao CESAD que ainda nao tenha sido usada em processo, preservando a seguranca historica da aplicacao.

## Escopo

- Implementar endpoint de edicao de comissao.
- Permitir ajuste de dados formais enquanto a comissao nao tiver `CesadStageAssignment` associado.
- Permitir ajuste de ato/portaria e composicao inicial antes de uso processual.
- Revalidar vigencia, composicao minima e membros compativeis.
- Bloquear edicao estrutural quando a comissao ja tiver sido usada em processo.
- Auditar alteracoes.

## Fora do escopo

- Retificacao formal de comissao ja usada.
- Alteracao de atos consolidados.
- Rollover de processos em andamento.
- Encerramento/supersessao formal.
- Frontend.
- Seed.

## Endpoint previsto

Sugestao sujeita a confirmacao na `01A`:

```http
PUT /cesad/commissions/:id
```

ou

```http
PATCH /cesad/commissions/:id
```

## Regra principal

Se a comissao ja tiver sido usada em `CesadStageAssignment`, bloquear alteracoes estruturais.

Alteracoes estruturais incluem:

- vigencia;
- status;
- ato/portaria principal;
- membros titulares e suplentes;
- composicao minima;
- dados que afetem competencia ou validade de atos.

## Alteracoes permitidas

Enquanto a comissao nao tiver uso processual:

- corrigir nome/descricao;
- ajustar vigencia, desde que sem conflito;
- ajustar ato/portaria;
- alterar composicao;
- trocar titulares/suplentes;
- ajustar datas de membros dentro da vigencia da comissao.

## Alteracoes nao permitidas nesta fatia

- Editar comissao ja usada.
- Reabrir documento assinado.
- Alterar expected signers ja congelados.
- Trocar comissao de processo.
- Corrigir erro material de comissao usada; isso deve ser task futura de retificacao formal.

## Autorizacao

Permitidos:

- `ADMIN`;
- `HOMOLOGATION_AUTHORITY`.

Bloqueados:

- `CESAD_MEMBER`;
- `COMMISSION_ASSISTANT`;
- `IMMEDIATE_SUPERVISOR`;
- `INTERN_SERVER`.

## Validacoes obrigatorias

- Comissao existe.
- Comissao nao possui `CesadStageAssignment`.
- Nova vigencia nao conflita.
- Composicao minima respeitada.
- Membros existem e estao ativos.
- `COMMISSION_ASSISTANT` bloqueado como membro formal.
- Usuario duplicado bloqueado.
- Datas dos membros dentro da vigencia.

## Auditoria esperada

Evento futuro esperado:

- `CESAD_COMMISSION_UPDATED`.

Metadata minima:

- usuario executor;
- perfil executor;
- comissao alterada;
- campos alterados;
- valores anteriores e novos para dados estruturais;
- contagem de titulares e suplentes;
- indicador de ausencia de uso processual.

## Testes obrigatorios

- Edicao por `ADMIN`.
- Edicao por `HOMOLOGATION_AUTHORITY`.
- Bloqueio para demais perfis.
- Bloqueio quando ha `CesadStageAssignment`.
- Bloqueio de vigencia conflitante.
- Bloqueio por composicao minima invalida.
- Bloqueio de `COMMISSION_ASSISTANT` como membro.
- Auditoria da alteracao.
- Transacao atomica em caso de erro.

## Criterios de aceite

- Edicao permitida apenas antes de uso processual.
- Nao ha reescrita historica.
- Comissao usada permanece imutavel estruturalmente.
- Leitura de comissao atual continua consistente.
- Testes cobrem permissoes, bloqueios e auditoria.

## Dependencias

- `BE-CESAD-REG-01A`.
- Preferencialmente `BE-CESAD-REG-01B`.

## Paralelizacao

Pode ser preparada em paralelo com `01D` em nivel de documentacao/planejamento, mas a implementacao deve ser coordenada para evitar conflitos nos mesmos services de comissao.
