# Frontend - Painel Ativo

> Ultima atualizacao: 2026-08-26 (sincronizacao da frente CESAD apos PRs #86, #87, #88, #94, #95 e #98).
> Os arquivos de task ja resolvidos foram movidos para [`docs/archive/frontend/tasks/`](../../../archive/frontend/tasks/).
> O indice de compatibilidade legado foi movido para [`docs/archive/roadmaps-legados/frontend-tasks-roadmap.md`](../../../archive/roadmaps-legados/frontend-tasks-roadmap.md).

## Ativos / pendentes

### Backlog frontend dependente de backend/contracts

| Task | Prioridade | Status | Dependencias principais | Proxima acao segura |
|---|---|---|---|---|
| [`FE-PROCESS-LIST-01`](./tasks/FE-PROCESS-LIST-01-authenticated-process-list.md) | Alta futura | Pendente | Endpoints backend seguros de listagem por perfil e autorizacao contextual | Aguardar contrato backend seguro antes de alterar telas ou remover IDs manuais. |
| [`FE-CHEFIA-02`](./tasks/FE-CHEFIA-02-supervisor-process-list-and-demo-removal.md) | Alta futura | Pendente | Listagem real dos processos da chefia autenticada e autorizacao backend | Aguardar contrato de listagem por chefia antes de remover fallback demonstrativo. |
| [`FE-CESAD-READ-01`](./tasks/FE-CESAD-READ-01-cesad-read-workspace-atual.md) | — | Parcialmente executada | Leitura consolidada real integrada; parecer de etapa ainda possui recortes demonstrativos na jornada autenticada | Continuidade funcional em `#103 — FE-CESAD-STAGE-OPINION-01`. |
| `#103 — FE-CESAD-STAGE-OPINION-01` | Alta | Ready / atribuida a Pedro | Backend ja expoe leitura, rascunho, conclusao, preparacao/status de assinaturas e assinatura do parecer de etapa | Integrar o workspace ao backend real e retirar `DEMO_CESAD_STAGE_OPINIONS` da jornada autenticada. |
| `#101 — FE-CESAD-02` | Alta | Ready / atribuida a Edgar | Backend do parecer conclusivo final ja possui elegibilidade, inicio, rascunho, conclusao, assinatura e envio a homologacao | Integrar o parecer conclusivo final ao workspace processual. |
| [`FE-CESAD-01`](./tasks/FE-CESAD-01-real-cesad-screens.md) | Guarda-chuva historico | Parcialmente executada | As proximas fatias funcionais foram separadas em #101 e #103 | Nao implementar como task monolitica; usar as issues funcionais especificas. |
| [`FE-TEST-01`](./tasks/FE-TEST-01-frontend-test-strategy.md) | Media futura | Parcialmente executada | FE-TEST-01A ao FE-TEST-01F concluidos; aberta apenas para expansoes futuras | Expandir cobertura junto das integracoes #101/#103 sem criar regra de negocio no frontend. |

> `CONTRACT-CESAD-COMMISSION-WRITE-01` e `FE-CESAD-COMISSAO-CRUD-02` nao pertencem mais ao backlog ativo: os payloads compartilhados foram entregues no PR #87 e o CRUD administrativo foi conectado no PR #88, com alinhamentos de dominio/UI no PR #98.

---

## Estrutura de features: o que esta implementado vs. o que e apenas scaffold

A pasta `apps/frontend/src/features/` contem componentes implementados, recortes integrados e diretorios que ainda sao scaffolds reservados.

### Implementado ou parcialmente implementado

| Diretorio | O que tem | Observacao |
|---|---|---|
| `features/auth/` | `login-page.tsx` | Login funcional. |
| `features/process/` | Stage timeline, process history, process actions, process status, supervisor evaluation workspace, intern workspace, appeal status | Componentes de processo parcialmente integrados. |
| `features/cesad/` | Workspace de leitura CESAD, historico, documentos, assinaturas, resumo de etapa e editor de parecer | Leitura real existe, mas a jornada de parecer de etapa ainda deve ser consolidada contra a API em #103. O parecer conclusivo final segue em #101. |
| `features/cesad-comissao/` | Administracao funcional da Comissao CESAD | `/cesad-comissao/admin` consome API real e possui create/update/close/supersede, composicao com Presidente/Titular/Suplente, snapshots funcionais e nome de comissao somente leitura gerado pelo backend. |
| `features/homologacao-autoridade/` | Workspace de homologacao | Workspace preparado; a integracao/validacao frontend completa deve ser tratada em task propria. |
| `features/dashboard/` | `process-dashboard-types.ts` | Tipos de dashboard. |

### Estado funcional da administracao CESAD

O recorte administrativo de Comissao CESAD esta **integrado parcialmente no produto, mas funcional no CRUD entregue**:

- criacao e edicao usam a API real;
- encerramento e supersessao usam payloads formais com motivo;
- a composicao segue exatamente `1 PRESIDENTE + no minimo 2 TITULARES + 2 SUPLENTES`;
- matricula, vinculo e cargo sao exibidos a partir dos snapshots retornados pela API;
- o nome e calculado no backend e exibido como somente leitura;
- IDs e fixtures demonstrativos foram removidos do fluxo funcional administrativo;
- regras juridicas e de vigencia continuam tendo o backend como fonte de verdade.

### Divergencia temporal conhecida de contracts

A API/backend ja adotou `publishedAt` como entrada temporal obrigatoria e deriva o ano persistido a partir dela. O pacote `@sadep/contracts`, entretanto, ainda declara `CesadCommissionActWriteRef.year` como obrigatorio e `publishedAt` como opcional. O frontend atual ainda envia `year` para satisfazer esse tipo, mas o backend deriva o valor efetivo de `publishedAt`.

Politica documental vigente:

1. `publishedAt` e a fonte de verdade de escrita;
2. `year` e campo derivado/persistido de compatibilidade e leitura, nao entrada de negocio independente;
3. o frontend nao deve pedir `year` nem `name` como dados editaveis;
4. o alinhamento futuro de `@sadep/contracts` deve tornar `publishedAt` obrigatorio e remover/depreciar `year` e `name` do payload de escrita, sem alterar essa regra funcional.

---

### Scaffold reservado ou sem integracao funcional completa

Os diretorios abaixo existem na estrutura mas nao possuem componente funcional completo ou dependem de integracao posterior. Qualquer feature que dependa deles requer task propria:

| Diretorio                           | Feature reservada para                                        |
| ----------------------------------- | ------------------------------------------------------------- |
| `features/assinaturas-eletronicas/` | Modulo de assinaturas eletronicas                             |
| `features/auditoria-historico/`     | Visualizacao do historico de auditoria                        |
| `features/autoavaliacao/`           | Workspace de autoavaliacao do servidor estagiario             |
| `features/avaliacoes/`              | Workspace de avaliacoes da chefia imediata                    |
| `features/chefia-imediata/`         | Workspace da chefia imediata com listagem segura de processos |
| `features/documentos-oficiais/`     | Gerenciamento e visualizacao de documentos oficiais           |
| `features/notificacoes-ciencia/`    | Notificacoes e registro de ciencia do servidor                |
| `features/painel-gerencial-cesad/`  | Painel gerencial da CESAD                                     |
| `features/processo-workflow/`       | Componentes do motor de workflow de processo                  |
| `features/servidor-estagiario/`     | Workspace do servidor estagiario                              |

---

## Decisao operacional atual

- Nao reabrir `FE-CESAD-COMISSAO-01`, `CONTRACT-CESAD-COMMISSION-WRITE-01` ou `FE-CESAD-COMISSAO-CRUD-02` como se fossem trabalho ainda nao entregue.
- A continuidade CESAD imediata no frontend esta separada entre `#103` (parecer de etapa) e `#101` (parecer conclusivo final), que podem avancar em paralelo sem sobreposicao de escopo.
- `#101` permanece o proximo recorte funcional de parecer final indicado pela sincronizacao da #96.
- O backend continua sendo fonte de verdade para capacidades, elegibilidade, vigencia, assinatura e estados processuais.
- A divergencia de tipos `year` x `publishedAt` deve ser corrigida em task de contracts propria; esta sincronizacao apenas registra a politica vigente.
- `FE-TEST-01` permanece aberta apenas para expansoes futuras, especialmente telas autenticadas completas e integracoes finais.
- `FE-CHEFIA-01` permanece resolvida parcialmente no recorte de integracao inicial; a continuidade operacional e `FE-CHEFIA-02`, sem reabrir `FT-24`.

---

## Resolvido operacionalmente

Consultar [`resolved.md`](./resolved.md) para os itens frontend concluidos.

Itens resolvidos incluem: `FE-QUAL-02`, `FE-UI-01`, `FE-RESP-01`, `FE-COPY-01`, `FE-UX-01B`, `FE-UX-01A`, `FE-A11Y-01`, `FE-ROADMAP-01`, `FE-QUAL-01`, `FT-26`, `FT-24`, `FE-CHEFIA-01`, `FE-SERVIDOR-01`, `FE-MOBILE-01`, `FE-DEMO-UX-01`, `FT-16`, `FT-17`, `FT-18`, `FT-19`, `FT-20`, `FT-21`, `FT-22`, `FT-23`, `FT-27/DX-01`, `FE-DOC-AUTH-README-01`, `FE-CESAD-COMISSAO-01`, `CONTRACT-CESAD-COMMISSION-WRITE-01`, `FE-CESAD-COMISSAO-CRUD-02` e os recortes frontend de sessao/auth ja aprovados.
