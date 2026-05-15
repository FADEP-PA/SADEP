# ADR-003 — Vínculo persistido entre comissão CESAD, processo e etapa

## Status

Aceita / Decisão arquitetural registrada.

Esta ADR registra a decisão arquitetural para a próxima evolução estrutural de `BE-SEC-03`, após a conclusão auditada de `BE-CESAD-AUTH-01`.

Ela não implementa código, não altera schema Prisma, não cria migration, não altera contracts, testes, frontend, seeds ou roadmaps operacionais.

---

## Contexto

`BE-CESAD-AUTH-01` aplicou `CesadContextAuthorizationService` aos endpoints sensíveis CESAD atuais. Com isso, workflow, histórico, transições sensíveis, leitura consolidada e parecer CESAD de etapa deixaram de depender apenas de role global.

Mesmo assim, `BE-SEC-03` permanece aberta porque a política de autorização contextual ainda usa comissão e membresia vigentes como referência transitória. Essa política não persiste qual comissão CESAD foi formalmente atribuída a determinado processo e etapa.

No SADEP, a etapa entra em análise CESAD por uma transição processual formal (`SEND_TO_CESAD`), dentro da workflow-engine. A partir desse momento, a comissão passa a ter legitimidade para ler a etapa, elaborar parecer, solicitar ajustes e, futuramente, derivar signatários esperados. Esse vínculo precisa ser rastreável, auditável e estável o bastante para suportar mudanças posteriores na composição ou substituição formal da comissão.

---

## Decisão

O SADEP adotará um novo modelo persistente, chamado `CesadStageAssignment`, para representar a atribuição formal de uma comissão CESAD a uma etapa de um processo.

A assignment será vinculada, no mínimo, a:

- processo;
- etapa;
- comissão CESAD.

O vínculo deve ser criado preferencialmente durante a transição `SEND_TO_CESAD`, quando a etapa passa para `EM_ANALISE_CESAD`.

A assignment deverá possuir status próprio, por exemplo:

- `ACTIVE`;
- `SUPERSEDED`;
- `CANCELED`.

A regra de domínio deve permitir apenas uma assignment `ACTIVE` por etapa. Como SQLite não oferece, de forma portável no Prisma, uma garantia simples de unique parcial equivalente para todos os ambientes do projeto, essa unicidade pode ser garantida inicialmente na camada de service/transação, com testes específicos.

Após a implementação dessa modelagem, não deve haver fallback permanente para comissão vigente. A comissão vigente pode ser usada apenas para backfill local/dev ou criação controlada da assignment quando houver uma única comissão ativa inequívoca.

---

## Alternativas consideradas

### A — `ProcessStage.cesadCommissionId`

Adicionar um campo direto em `ProcessStage` seria simples e facilitaria consultas diretas.

Essa alternativa foi rejeitada como desenho principal porque é insuficiente para:

- histórico;
- substituição formal;
- auditoria própria do ato de atribuição;
- reatribuição futura;
- rastreabilidade da decisão de envio à CESAD.

Um campo simples em `ProcessStage` também tende a esconder mudanças de comissão como uma atualização direta, quando o correto é preservar o ato anterior e registrar eventual superação formal.

### B — `CesadStageOpinion.commissionId`

Vincular a comissão diretamente ao parecer de etapa registra qual comissão produziu o parecer.

Essa alternativa foi rejeitada como fonte principal do vínculo porque nasce tarde demais:

- a CESAD precisa acessar a leitura consolidada antes de existir parecer;
- pode haver análise sem rascunho de parecer criado;
- o vínculo processual deve existir desde a entrada em `EM_ANALISE_CESAD`;
- a autorização contextual não pode depender da existência de `CesadStageOpinion`.

`CesadStageOpinion` pode, futuramente, referenciar ou derivar a comissão responsável a partir da assignment, mas não deve ser a fonte primária da atribuição.

### C — `CesadStageAssignment`

Criar um modelo próprio foi escolhido porque permite:

- vínculo explícito entre comissão, processo e etapa;
- criação no momento `SEND_TO_CESAD`;
- autorização contextual por vínculo persistido;
- histórico futuro de substituição ou superação;
- auditoria própria do ato de atribuição;
- derivação futura de signatários esperados;
- compatibilidade com o fluxo de quatro etapas do Caso 2.

---

## Consequências

Consequências positivas:

- reduz a dependência transitória de comissão vigente;
- permite autorização CESAD por vínculo processual real;
- preserva rastreabilidade do envio formal à CESAD;
- prepara o backend para mudanças futuras de composição ou comissão;
- cria base para derivar signatários esperados do parecer a partir do contexto formal da etapa;
- mantém o estado macro do processo enxuto, modelando detalhe fino em entidade complementar.

Custos e trade-offs:

- adiciona uma entidade de domínio e relações Prisma futuras;
- exige validação transacional para impedir múltiplas assignments ativas na mesma etapa;
- exige ajuste em serviços CESAD e workflow quando implementada;
- exige backfill cuidadoso para bases locais/de desenvolvimento;
- exige testes de autorização positiva e negativa por etapa atribuída.

Risco aceito temporariamente:

- até a implementação da assignment, a política existente de comissão/membresia vigente continua sendo uma referência transitória e não encerra `BE-SEC-03`.

---

## Impacto esperado no schema

A implementação futura provavelmente exigirá um modelo semelhante a `CesadStageAssignment`, com campos como:

- `id`;
- `processId`;
- `processStageId`;
- `commissionId`;
- `status`;
- `assignedAt`;
- `assignedByUserId`;
- `assignmentReason`;
- `referenceDate`;
- `supersededAt`;
- `supersededByAssignmentId`;
- `supersededReason`;
- `createdAt`;
- `updatedAt`.

Relações prováveis:

- `EvaluationProcess` -> assignments CESAD;
- `ProcessStage` -> assignments CESAD;
- `CesadCommission` -> assignments de etapa;
- `User` -> usuário responsável pela atribuição;
- autorrelação opcional para superação/substituição.

Índices prováveis:

- por processo;
- por etapa;
- por comissão;
- por status;
- por etapa e status.

A garantia de apenas uma assignment `ACTIVE` por etapa deve ser tratada inicialmente no service/transação, especialmente por compatibilidade com SQLite.

---

## Impacto esperado no workflow

A assignment deve ser criada preferencialmente na transição `SEND_TO_CESAD`, dentro da workflow-engine.

Essa transição já representa o ato formal de envio da etapa instruída à CESAD. Portanto, a criação da assignment deve ocorrer no mesmo recorte transacional da mudança para `EM_ANALISE_CESAD`, após as guards documentais exigidas.

Se não houver comissão ativa inequívoca no momento da atribuição, a transição não deve inferir silenciosamente uma comissão.

Regras esperadas:

- nenhuma comissão ativa: bloquear a criação da assignment e a transição, com erro de domínio claro;
- mais de uma comissão ativa: bloquear a criação da assignment e exigir decisão administrativa explícita;
- comissão `SUPERSEDED`: não pode receber nova assignment ativa ordinária;
- substituição futura: deve ocorrer por ato formal de reatribuição, não por troca automática invisível.

---

## Impacto esperado em autorização contextual

Após a implementação, `CesadContextAuthorizationService` deverá consultar a assignment ativa da etapa para autorizar acesso CESAD.

Diretrizes:

- `CESAD_MEMBER` só deve acessar/escrever/transicionar quando vinculado à comissão atribuída à etapa, respeitadas as permissões da ação;
- `COMMISSION_ASSISTANT` pode manter acesso de leitura/apoio quando vinculado à comissão atribuída, mas sem escrita de parecer nem transição sensível;
- membro encerrado deve ser bloqueado;
- usuário inativo deve ser bloqueado;
- membro de outra comissão ativa deve ser bloqueado;
- comissão vigente sem assignment não deve bastar para autorizar;
- o fallback para comissão vigente não deve permanecer após a implementação.

Backfill local/dev pode existir apenas quando houver uma única comissão ativa inequívoca. Se não houver comissão ativa ou houver múltiplas, não deve haver inferência silenciosa.

---

## Impacto esperado em parecer CESAD e signatários esperados

`CesadStageOpinionExpectedSigner` deverá derivar `commissionId` da `CesadStageAssignment`, e não da comissão ativa do dia.

Isso evita que alterações posteriores na comissão vigente alterem retroativamente o contexto de responsabilidade da etapa já enviada à CESAD.

Diretrizes futuras:

- o parecer CESAD de etapa deve permanecer vinculado ao processo e à etapa;
- a comissão responsável pelo parecer deve ser resolvida a partir da assignment ativa da etapa;
- signatários esperados devem ser derivados da comissão atribuída;
- snapshots de nome, email, papel e membro atuante devem continuar preservados;
- assinatura colegiada completa permanece responsabilidade de `BE-DOC-CESAD-SIGN-01`.

---

## Relação com BE-DOC-CESAD-SIGN-01

Esta ADR não resolve assinatura colegiada.

Ela cria a decisão arquitetural necessária para que `BE-DOC-CESAD-SIGN-01` possa, depois, derivar os signatários obrigatórios a partir de uma comissão formalmente atribuída à etapa.

Limite seguro:

- `CesadStageAssignment` define a comissão responsável;
- `BE-DOC-CESAD-SIGN-01` define e valida o ciclo de assinaturas, múltiplos signatários, completude e integração final com `SignatureRecord` e `ProcessDocument`.

---

## Relação com BE-FLOW-4STAGE-01

Esta ADR não implementa o fluxo completo de quatro etapas.

A decisão é compatível com o Caso 2 porque cada `ProcessStage` poderá ter sua própria assignment CESAD quando entrar em análise.

Limite seguro:

- a assignment se aplica à etapa existente e à etapa corrente resolvida pelo workflow atual;
- `BE-FLOW-4STAGE-01` continuará responsável por progressão formal entre etapas, conclusão de etapas anteriores, abertura de etapas posteriores e bloqueios de consolidação.

---

## Relação com BE-CESAD-FINAL-01

Esta ADR não modela parecer conclusivo final.

A decisão não impede que, futuramente, o parecer conclusivo final tenha assignment própria ou reaproveite uma regra formal de comissão responsável pelo processo consolidado. Essa decisão deverá ser tomada no escopo de `BE-CESAD-FINAL-01` ou task arquitetural específica.

---

## Fora do escopo

Esta ADR não faz:

- implementação de código;
- alteração de schema Prisma;
- migration;
- alteração de testes;
- alteração de frontend;
- alteração de contracts;
- alteração de seeds;
- criação de task de implementação;
- marcação de `BE-SEC-03` como resolvida;
- marcação de `BE-CESAD-AUTH-02` como implementada;
- assinatura colegiada;
- progressão formal das quatro etapas;
- parecer conclusivo final;
- homologação;
- notificação;
- ciência;
- recursos.

---

## Próximos passos

1. Criar task de implementação controlada para `BE-CESAD-AUTH-02`, sem marcar `BE-SEC-03` como resolvida.
2. Modelar `CesadStageAssignment` no Prisma em migration própria.
3. Criar serviço transacional para resolver/criar assignment na transição `SEND_TO_CESAD`.
4. Alterar `CesadContextAuthorizationService` para autorizar por assignment ativa da etapa.
5. Alterar derivação de `CesadStageOpinionExpectedSigner` para usar a comissão da assignment.
6. Criar testes positivos e negativos para comissão atribuída, ausência de comissão, múltiplas comissões, comissão `SUPERSEDED`, membro encerrado, assistente e membro de outra comissão.
7. Planejar, em `BE-DOC-CESAD-SIGN-01`, a integração completa com assinatura colegiada e documentos do parecer.
