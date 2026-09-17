# BE-CESAD-REG-01B — Criar comissão com ato e composição inicial

**Dev:** Pedro
**Status:** Pendente
**Depende de:** BE-CESAD-REG-01A
**Desbloqueia:** 01C, 01F

---

## Objetivo

Implementar o cadastro formal de uma nova comissão CESAD com dados do ato/portaria e composição inicial de titulares e suplentes.

---

## Fora do escopo

- Edição posterior de comissão
- Encerramento manual/supersessão fora do cadastro de nova comissão
- Rollover de processos em andamento
- Seed local
- Frontend
- Alteração em assinatura CESAD, parecer final ou homologação

---

## Perfis autorizados

Permitidos: `ADMIN`, `HOMOLOGATION_AUTHORITY`

Bloqueados: `CESAD_MEMBER`, `COMMISSION_ASSISTANT`, `IMMEDIATE_SUPERVISOR`, `INTERN_SERVER`

---

## Payload mínimo previsto

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

---

## Regras de vigência

- Nova comissão futura pode ser cadastrada
- Comissão futura não deve ser resolvida como atual antes da data inicial
- Não pode haver vigência sobreposta com outra comissão vigente no mesmo período
- Se houver comissão anterior sem data fim e a nova iniciar depois dela, encerrar a anterior em D-1
- Nova comissão não deve reescrever passado nem gerar conflito com atos já praticados

## Regras de composição

- Mínimo 3 titulares e 2 suplentes (quantidade maior permitida)
- Usuário precisa existir e estar ativo
- Usuário não pode ser `COMMISSION_ASSISTANT`
- Usuário não pode aparecer duas vezes na mesma composição vigente
- Vigência do membro deve estar dentro da vigência da comissão

---

## Endpoint

- [ ] Criar `POST /cesad/commissions`
- [ ] Proteger com guard de role (`ADMIN`, `HOMOLOGATION_AUTHORITY`)
- [ ] Bloquear demais perfis

---

## Validações de composição

- [ ] Exigir mínimo 3 titulares
- [ ] Exigir mínimo 2 suplentes
- [ ] Validar que usuários existem e estão ativos
- [ ] Bloquear `COMMISSION_ASSISTANT` como membro formal
- [ ] Bloquear usuário duplicado na mesma composição
- [ ] Validar datas de membros dentro da vigência da comissão

---

## Validações de vigência

- [ ] Bloquear vigência sobreposta com outra comissão cadastrada
- [ ] Encerrar automaticamente comissão anterior sem data fim (D-1) quando nova comissão posterior for cadastrada
- [ ] Permitir cadastro de comissão futura (não resolver como atual antes de `effectiveStartDate`)
- [ ] Bloquear reescrita de passado ou conflito com atos já praticados

---

## Persistência

- [ ] Criar comissão, ato e membros de forma transacional (tudo ou rollback)
- [ ] Garantir que erros deixam o banco consistente

---

## Auditoria

- [ ] Emitir `CESAD_COMMISSION_CREATED`
- [ ] Emitir `CESAD_COMMISSION_ACT_REGISTERED`
- [ ] Emitir `CESAD_COMMISSION_MEMBER_ADDED` para cada membro
- [ ] Emitir `CESAD_COMMISSION_CLOSED` quando houver encerramento automático da anterior

---

## Testes

- [ ] Criação por `ADMIN`
- [ ] Criação por `HOMOLOGATION_AUTHORITY`
- [ ] Bloqueio para demais perfis
- [ ] Bloqueio com menos de 3 titulares
- [ ] Bloqueio com menos de 2 suplentes
- [ ] Bloqueio de `COMMISSION_ASSISTANT` como membro
- [ ] Bloqueio de usuário duplicado
- [ ] Bloqueio de vigência sobreposta
- [ ] Encerramento D-1 de comissão anterior sem data fim
- [ ] Criação de comissão futura sem virar atual antes da data
- [ ] Auditoria dos atos administrativos
- [ ] Rollback transacional em caso de erro

---

## Critérios de aceite

- [ ] Comissão, ato e membros criados transacionalmente
- [ ] Leitura atual (`GET /cesad/commissions/current`) continua funcionando
- [ ] Não há rollover de processos nesta fatia
- [ ] Testes cobrem fluxos principais e bloqueios

---

## Paralelização

Pode ser implementada em paralelo com 01F apenas após estabilizar os contratos de payload e seed. Não deve rodar em paralelo com 01C/01D se essas alterarem os mesmos services antes de a criação estar consolidada.
