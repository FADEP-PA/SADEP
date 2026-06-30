# BE-CESAD-REG-01B — Criar comissao com ato e composicao inicial

## Status

Pendente / especificada / aguardando `BE-CESAD-REG-01A`.

## Relacao com o epico

Task filha de `BE-CESAD-REG-01`.

Primeira fatia de implementacao backend para administracao formal da Comissao CESAD.

## Objetivo

Implementar o cadastro formal de uma nova comissao CESAD com dados do ato/portaria e composicao inicial de titulares e suplentes.

## Escopo

- Criar endpoint de cadastro de comissao.
- Receber dados formais da portaria/ato.
- Receber composicao inicial.
- Validar minimo de 3 titulares e 2 suplentes.
- Validar usuarios existentes e roles compativeis.
- Bloquear `COMMISSION_ASSISTANT` como membro formal.
- Bloquear usuario duplicado na mesma composicao.
- Validar vigencia dos membros dentro da vigencia da comissao.
- Bloquear vigencia sobreposta.
- Encerrar automaticamente comissao anterior sem data fim quando nova comissao posterior for cadastrada.
- Auditar criacao da comissao, registro do ato e composicao inicial.

## Fora do escopo

- Edicao posterior de comissao.
- Encerramento manual/supersessao fora do cadastro de nova comissao.
- Rollover de processos em andamento.
- Seed local.
- Frontend.
- Alteracao em assinatura CESAD, parecer final ou homologacao.

## Perfis autorizados

Permitidos:

- `ADMIN`;
- `HOMOLOGATION_AUTHORITY`.

Bloqueados:

- `CESAD_MEMBER`;
- `COMMISSION_ASSISTANT`;
- `IMMEDIATE_SUPERVISOR`;
- `INTERN_SERVER`.

## Endpoint previsto

Sugestao inicial sujeita a confirmacao na `01A`:

```http
POST /cesad/commissions
```

## Payload minimo previsto

```ts
{
  commission: {
    name: string;
    description?: string | null;
    effectiveStartDate: string;
    effectiveEndDate?: string | null;
  };
  act: {
    actType: 'CONSTITUTION' | 'AMENDMENT' | 'RENEWAL';
    number: string;
    year: number;
    signedAt?: string | null;
    publishedAt?: string | null;
    summary?: string | null;
    referenceText?: string | null;
  };
  members: Array<{
    userId: string;
    roleType: 'TITULAR' | 'SUPLENTE';
    startDate: string;
    endDate?: string | null;
  }>;
}
```

## Regras de vigencia

- Nova comissao futura pode ser cadastrada.
- Comissao futura nao deve ser resolvida como atual antes da data inicial.
- Nao pode haver vigencia sobreposta com outra comissao vigente no mesmo periodo.
- Se houver comissao anterior sem data fim e a nova iniciar depois dela, encerrar a anterior em D-1.
- Nova comissao nao deve reescrever passado nem gerar conflito com atos ja praticados.

## Regras de composicao

- Minimo 3 titulares.
- Minimo 2 suplentes.
- Quantidade maior permitida.
- Usuario precisa existir.
- Usuario precisa estar ativo.
- Usuario nao pode ser `COMMISSION_ASSISTANT`.
- Usuario nao pode aparecer duas vezes na mesma composicao vigente.
- Vigencia do membro deve estar dentro da vigencia da comissao.

## Auditoria esperada

Eventos futuros esperados, conforme decisao da `01A`:

- `CESAD_COMMISSION_CREATED`;
- `CESAD_COMMISSION_ACT_REGISTERED`;
- `CESAD_COMMISSION_MEMBER_ADDED`;
- opcionalmente `CESAD_COMMISSION_CLOSED`, quando houver encerramento automatico da anterior.

Metadata minima:

- usuario executor;
- perfil executor;
- comissao criada;
- ato registrado;
- total de titulares;
- total de suplentes;
- vigencia;
- comissao anterior encerrada, quando aplicavel.

## Testes obrigatorios

- Criacao por `ADMIN`.
- Criacao por `HOMOLOGATION_AUTHORITY`.
- Bloqueio para demais perfis.
- Bloqueio com menos de 3 titulares.
- Bloqueio com menos de 2 suplentes.
- Bloqueio de `COMMISSION_ASSISTANT` como membro.
- Bloqueio de usuario duplicado.
- Bloqueio de vigencia sobreposta.
- Encerramento D-1 de comissao anterior sem data fim.
- Criacao de comissao futura sem virar atual antes da data.
- Auditoria dos atos administrativos.

## Criterios de aceite

- Comissao, ato e membros sao criados de forma transacional.
- Erros deixam o banco consistente.
- Leitura atual continua funcionando.
- Nao ha rollover de processos nesta fatia.
- Testes cobrem os fluxos principais e bloqueios.

## Dependencias

- `BE-CESAD-REG-01A`.
- `ADR-006`.

## Paralelizacao

Pode ser implementada em paralelo com `01F` apenas apos estabilizar os contratos de payload e seed. Nao deve rodar em paralelo com `01C`/`01D` se essas alterarem os mesmos services antes de a criacao estar consolidada.
