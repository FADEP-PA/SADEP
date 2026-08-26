# DOC-CESAD-NEXT-STEPS-01 — Proximas entregas funcionais da frente CESAD

## Status

Consolidado em 2026-08-26 apos as entregas de Comissao CESAD e a sincronizacao da #96.

## Objetivo

Manter uma visao unica do estado funcional CESAD, separando claramente:

- o que ja foi entregue;
- o que esta integrado parcialmente;
- o que permanece como proxima fatia funcional;
- dependencias que ainda sao reais;
- dividas tecnicas que nao devem ser confundidas com features ausentes.

---

# 1. Estado atual consolidado

## 1.1 Administracao da Comissao CESAD — entregue

A fase administrativa planejada anteriormente esta concluida nos recortes funcionais previstos.

| Entrega | Issue/task | Evidencia | Estado |
|---|---|---|---|
| DTO formal de encerramento/supersessao | `#84 — BE-CESAD-COMISSAO-CLOSE-DTO-01` | PR #86 | Concluida |
| Payloads de escrita compartilhados | `#83 — CONTRACT-CESAD-COMMISSION-WRITE-01` | PR #87 | Concluida |
| CRUD administrativo real | `#85 — FE-CESAD-COMISSAO-CRUD-02` | PR #88 | Concluida |
| Presidente + snapshots + regras de dominio | issues #90/#91 | PR #94 | Concluida |
| API alinhada a presidente/publicacao | issue #92 | PR #95 | Concluida |
| UI administrativa alinhada ao dominio/API | `#93` | PR #98 | Concluida |

### Capacidades entregues

- create/update/close/supersede pela interface administrativa;
- motivo administrativo nos fluxos de encerramento e supersessao;
- exatamente `1 PRESIDENTE + no minimo 2 TITULARES + 2 SUPLENTES`;
- `registrationSnapshot`, `bondSnapshot` e `positionSnapshot` preservados na composicao;
- `PRESIDENTE` participa da composicao efetiva/signatarios conforme regra backend;
- nome da comissao calculado pelo backend e apenas exibido no frontend;
- leitura e escrita usam API real;
- dados/IDs demonstrativos foram retirados do fluxo funcional administrativo;
- `ADMIN` e `HOMOLOGATION_AUTHORITY` continuam sujeitos as autorizacoes definidas no backend.

O CRUD administrativo deve ser descrito como **integrado parcialmente no produto, mas funcional no recorte administrativo entregue**. O termo “parcial” se refere ao produto CESAD como um todo, porque pareceres, caixa de trabalho e homologacao frontend ainda possuem fatias pendentes — nao porque create/update/close/supersede estejam faltando.

## 1.2 Backend processual CESAD — avancado

Ja existem no backend:

- assignment contextual por comissao/processo/etapa;
- rollover nos recortes documentados;
- parecer CESAD de etapa com leitura, rascunho e conclusao;
- preparacao/status/assinatura colegiada do parecer de etapa;
- parecer conclusivo final com elegibilidade, inicio, rascunho e conclusao;
- assinatura colegiada final;
- envio a homologacao;
- homologacao, notificacao e ciencia no recorte backend implementado.

## 1.3 Frontend processual CESAD — proxima prioridade

O frontend possui estruturas e componentes, mas duas fatias devem ser conectadas integralmente a API real:

| Issue | Escopo | Responsavel atual | Dependencia | Paralelismo |
|---|---|---|---|---|
| `#103 — FE-CESAD-STAGE-OPINION-01` | Parecer CESAD **de etapa**: leitura, draft, complete, assinatura/status e remocao de demo da jornada autenticada | Pedro | Endpoints/contracts ja existentes | Pode iniciar agora |
| `#101 — FE-CESAD-02` | Parecer CESAD **conclusivo final**: eligibility, start, draft, complete, assinatura/status e envio a homologacao | Edgar | Backend/contracts do parecer final ja existentes | Pode iniciar agora |

As duas issues nao duplicam escopo e podem andar em paralelo.

A #101 permanece o proximo ajuste funcional de **parecer final** explicitamente referenciado pela #96.

---

# 2. Politica `publishedAt` x `year`

## Decisao definitiva

`publishedAt` e a fonte de verdade temporal para escrita do ato da Comissao CESAD.

Fluxo esperado:

```txt
publishedAt informado pelo cliente
        ↓
backend valida a data de publicacao
        ↓
year = ano civil derivado de publishedAt
        ↓
year e persistido/retornado como valor materializado
        ↓
nome/sequence/year da comissao seguem a mesma referencia temporal
```

### Estado atual por camada

| Camada | Estado |
|---|---|
| Prisma | `CesadCommissionAct.publishedAt` e obrigatorio; `year` continua persistido. |
| DTO backend | `publishedAt` obrigatorio; `year` opcional. |
| Service backend | Deriva o ano efetivo de `publishedAt`; nao usa `year` como fonte independente. |
| Frontend administrativo | Solicita data de publicacao e nao deve expor ano/nome como entradas independentes. |
| `@sadep/contracts` | Ainda declara `year` obrigatorio e `publishedAt` opcional, portanto esta defasado em relacao ao backend. |

### Direcao de alinhamento futuro

Em task funcional de contracts propria:

- tornar `publishedAt` obrigatorio no write contract;
- retirar/depreciar `year` do write contract;
- retirar/depreciar `commission.name` do write contract;
- preservar `year` em tipos de leitura quando ele representar o valor materializado retornado pelo backend.

A #96 nao altera codigo ou contracts. Ela apenas estabelece a regra documental e impede que novas implementacoes tratem `year` como segunda fonte de verdade.

---

# 3. Roadmap atualizado

## Fase A — Administracao da Comissao CESAD

**Concluida.** Nao reabrir #83, #84, #85, #90, #91, #92 ou #93 como backlog ficticio.

## Fase B — Atuação operacional CESAD nos processos

1. `#103 — FE-CESAD-STAGE-OPINION-01` — integrar parecer de etapa.
2. `FE-CESAD-PROCESS-LIST-01` — criar caixa/listagem segura da CESAD quando o contrato de listagem estiver definido.
3. Separar assinatura de etapa em task propria apenas se #103 nao puder absorver o recorte ja suportado pela API sem crescer excessivamente.

## Fase C — Parecer final e envio a homologacao

1. `#101 — FE-CESAD-02` — integrar parecer conclusivo final e envio conforme capacidades retornadas pelo backend.
2. Nao criar regra paralela de eligibility ou assinatura no frontend.

## Fase D — Homologacao, notificacao e ciencia no frontend

Apos a integracao do parecer final:

- conectar workspace da autoridade homologadora ao backend real;
- conectar notificacao do resultado;
- conectar ciencia pelo servidor avaliado.

## Fase E — Documentos oficiais e integracoes externas

Posterior aos fluxos internos:

- `BE-DOC-PDF-01` — PDF oficial;
- `FE-DOCS-01` — visualizacao/download;
- `BE-SIGN-GOVBR-01` — assinatura GOV.BR real;
- supersessao documental ampla nos cenarios que permanecem bloqueados por preservacao juridica.

---

# 4. Matriz de dependencias atual

| Entrega | Depende de | Desbloqueia | Estado |
|---|---|---|---|
| Contracts de escrita de comissao | — | CRUD administrativo | Concluido no PR #87 |
| DTO close/supersede | — | CRUD administrativo | Concluido no PR #86 |
| CRUD administrativo | contracts + DTO | Administracao funcional | Concluido no PR #88 |
| Presidente/snapshots/dominio | base de comissoes | API/UI alinhadas | Concluido no PR #94 |
| API presidente/publicacao | dominio | UI alinhada | Concluido no PR #95 |
| UI administrativa alinhada | dominio/API | fluxo admin estavel | Concluido no PR #98 |
| #103 parecer de etapa frontend | endpoints/contracts de etapa existentes | jornada CESAD de etapa real | Ready |
| #101 parecer final frontend | backend/contracts finais existentes | homologacao frontend | Ready |
| Caixa de processos CESAD | listagem segura/autorizacao contextual | navegacao sem ID manual | Pendente |
| Homologacao frontend | parecer final enviado | notificacao/ciencia frontend | Pendente |
| PDF/GOVBR | fluxos internos estabilizados + decisao institucional | documentos externos oficiais | Futuro |

---

# 5. Criterios para novas tasks CESAD

1. Nao listar como futuro algo comprovadamente entregue na `develop`.
2. Usar backend/contracts como fonte de verdade para capacidades e estados.
3. Nao duplicar regra juridica no frontend.
4. Manter tasks pequenas, com escopo de uma fatia funcional clara.
5. Preservar historico, assignments, documentos e assinaturas consolidadas.
6. Quando houver divergencia de tipo entre contracts e backend, registrar e corrigir explicitamente em vez de mascarar com adaptacoes locais novas.
7. Toda task funcional deve declarar validacoes de typecheck/build/testes aplicaveis ao workspace afetado.
