# Plano de tasks CESAD — historico e estado consolidado

> Estado consolidado em 2026-08-26 para a issue #96.

Este documento deixou de ser um plano pre-implementacao. Ele registra o que foi decidido, implementado e o que permanece como continuidade real da frente de Comissao CESAD.

## 1. Resultado das frentes planejadas

| Frente original | Entrega consolidada | Evidencia principal | Status |
|---|---|---|---|
| Fundacao de banco e contracts | Papel `PRESIDENTE`, snapshots funcionais e tipos de escrita compartilhados | PRs #87 e #94 | Concluida |
| Backend de dominio | Composicao formal, snapshots, nome automatico e signatarios com presidente | PR #94 | Concluida |
| Backend/API | `publishedAt` obrigatorio, ano derivado, campos de presidente/snapshots expostos | PR #95 e evolucao posterior no PR #98 | Concluida |
| DTO de encerramento/supersessao | `reason`, `effectiveEndDate` e `successorCommissionId` quando aplicavel | PR #86 | Concluida |
| Frontend administrativo | CRUD real de create/update/close/supersede | PR #88 | Concluida |
| Alinhamento final da UI administrativa | Presidente/Titular/Suplente, snapshots, nome somente leitura, datas civis e remocao de mocks/IDs funcionais | PR #98 | Concluida |

Os PRs funcionais relevantes no intervalo historico citado pela #96 sao #86, #87, #88, #89, #94 e #95. Os numeros #90 a #93 correspondem a issues/tasks e nao a PRs nesse repositorio.

## 2. Decisoes consolidadas

### 2.1 Composicao formal

A regra vigente e:

```txt
1 PRESIDENTE + no minimo 2 TITULARES + 2 SUPLENTES
```

- deve existir exatamente um presidente ativo por vigencia;
- `PRESIDENTE` integra a composicao efetiva e participa da derivacao de signatarios quando a regra usa membros efetivos;
- `COMMISSION_ASSISTANT` continua fora da composicao formal.

### 2.2 Snapshots funcionais

A decisao implementada foi preservar os dados funcionais na composicao da comissao, e nao depender apenas do cadastro mutavel do usuario:

- `registrationSnapshot`;
- `bondSnapshot`;
- `positionSnapshot`.

Isso preserva o contexto historico de matricula, vinculo e cargo usado no ato/composicao.

### 2.3 Nome e sequencia da comissao

O nome nao e entrada de negocio editavel. O backend gera o identificador usando sequencia anual e ano derivado da publicacao:

```txt
cesad-{sequencia com 5 digitos}-{ano de publishedAt}
```

O frontend deve apenas exibir o valor retornado pela API.

## 3. Politica definitiva de `publishedAt` e `year`

### Fonte de verdade

`publishedAt` e a fonte de verdade temporal de escrita do ato CESAD.

O comportamento esperado e:

1. o cliente informa `publishedAt`;
2. o backend valida `publishedAt` como obrigatorio;
3. o backend deriva `year` a partir de `publishedAt`;
4. `year` pode continuar persistido no Prisma/read model por compatibilidade, indexacao e leitura, mas nao representa uma segunda fonte de verdade;
5. o nome/ano/sequencia da comissao tambem devem seguir o ano derivado de `publishedAt`.

### Estado real das camadas

| Camada | `publishedAt` | `year` | Observacao |
|---|---|---|---|
| Prisma `CesadCommissionAct` | Obrigatorio | Obrigatorio/persistido | `year` e materializado; `publishedAt` nao aceita `null`. |
| DTO backend | Obrigatorio | Opcional | Backend deriva o valor efetivo a partir de `publishedAt`. |
| Service backend | Fonte de verdade | Derivado | Persistencia usa o ano derivado da publicacao. |
| `@sadep/contracts` | Ainda opcional | Ainda obrigatorio | **Divergencia conhecida de tipagem**. |
| Frontend administrativo | Campo de publicacao editavel | Enviado apenas por compatibilidade com o tipo atual | A UI nao deve pedir ano como entrada independente. |

### Divida tecnica registrada

O pacote `@sadep/contracts` ainda precisa ser alinhado em task funcional propria para refletir a politica ja praticada pelo backend. A direcao esperada e:

- `publishedAt: string` obrigatorio no payload de escrita;
- `year` removido, opcional ou explicitamente depreciado no payload de escrita;
- `commission.name` removido ou opcional no payload de escrita, pois o backend gera o nome;
- manter `year` nos tipos de leitura quando ele representar o valor materializado retornado pela API.

A #96 **nao altera contracts, Prisma, DTOs ou frontend funcional**; apenas documenta a regra e a divergencia atual.

## 4. Estado atual do CRUD administrativo

O CRUD da Comissao CESAD nao deve mais ser listado como futuro.

Entregue:

- listagem e detalhe reais;
- criacao real;
- edicao de comissao ainda permitida pelo backend;
- encerramento com motivo;
- supersessao com motivo e metadados suportados;
- Presidente/Titular/Suplente;
- snapshots de matricula, vinculo e cargo;
- nome automatico somente leitura;
- tratamento institucional de erros;
- remocao de IDs/dados demonstrativos do fluxo funcional administrativo;
- testes de regressao no frontend e backend nos recortes entregues.

O estado correto da frente e **integrado parcialmente no produto**: a administracao da comissao esta funcional, enquanto os fluxos processuais CESAD ainda possuem integracoes frontend pendentes.

## 5. Proximas entregas reais

### Em paralelo agora

- `#103 — FE-CESAD-STAGE-OPINION-01`: integrar o parecer CESAD de etapa ao backend real e retirar dados demonstrativos da jornada autenticada.
- `#101 — FE-CESAD-02`: integrar o parecer conclusivo final ao workspace processual, incluindo elegibilidade, rascunho, conclusao, assinatura/status e envio a homologacao conforme capacidades do backend.

A #101 permanece o proximo recorte funcional de **parecer final** apontado pela #96. A #103 cobre exclusivamente o **parecer de etapa**, portanto pode andar em paralelo sem duplicar escopo.

### Depois dessas integracoes

Permanecem como evolucoes separadas, quando priorizadas:

- caixa/listagem segura de processos CESAD sem ID manual;
- frontend completo de homologacao/notificacao/ciencia;
- documentos oficiais/PDF;
- visualizacao/download documental dedicada;
- assinatura GOV.BR real;
- supersessao documental ampla para cenarios ainda bloqueados.

## 6. Regra de manutencao do roadmap

- nao reabrir tasks concluidas apenas porque a documentacao antiga ainda as citava como futuro;
- novas lacunas devem nascer como issues pequenas e auditaveis;
- backend/API e contracts sao fonte de verdade para capacidades e formatos;
- nenhuma regra juridica deve ser duplicada no frontend;
- atos e documentos consolidados devem preservar historico e auditoria.
