# DOC-CESAD-NEXT-STEPS-01 — Proximas entregas funcionais da frente CESAD

## Status

Planejamento documental inicial / pronto para revisao.

## Contexto

A frente de cadastro e gerenciamento formal da Comissao CESAD foi concluida e estabilizada no backend, e a interface administrativa foi entregue no recorte de leitura real. A documentacao de roadmaps foi sincronizada no PR `#80`, fechando a issue `#79`.

A proxima fase deve ser planejada antes da criacao de novas tasks funcionais no Project. O objetivo e evitar sobreposicao de escopo entre backend, frontend, contracts, documentos oficiais e fluxos processuais.

## Objetivo deste documento

Definir uma ordem inicial para as proximas entregas funcionais da frente CESAD, indicando:

- o que ja esta pronto;
- o que esta parcialmente pronto;
- o que ainda precisa ser implementado;
- dependencias entre tasks;
- quais tasks podem rodar em paralelo;
- responsavel sugerido entre Fabricio, Pedro e Edgar;
- criterios minimos para abertura das proximas issues no Project.

## Desenvolvedores disponiveis

| Desenvolvedor | Perfil sugerido de atuacao |
|---|---|
| Fabricio | Documentacao, UX, telas, validacao funcional, fluxos administrativos e visao de produto. |
| Pedro | Contracts, integracao frontend/backend, fluxos de parecer, assinatura e ciencia. |
| Edgar | Backend sensivel, DTOs, regras transacionais, documentos, PDF e integracoes externas. |

---

# 1. Estado atual consolidado

## 1.1 Pronto no backend

| Area | Estado |
|---|---|
| Cadastro formal de Comissao CESAD | Pronto. |
| Ato/portaria da comissao | Pronto no cadastro. |
| Composicao com titulares e suplentes | Pronto. |
| Regra minima de 3 titulares e 2 suplentes | Pronto. |
| Bloqueio de `COMMISSION_ASSISTANT` como membro formal | Pronto. |
| Listagem de comissoes | Pronto. |
| Consulta por ID | Pronto. |
| Edicao de comissao ainda nao utilizada | Pronto. |
| Bloqueio de edicao estrutural de comissao usada | Pronto. |
| Encerramento e supersessao | Pronto no backend, com ressalva de DTO formal futuro. |
| Auditoria administrativa de comissao | Pronto. |
| Seed local minimo | Pronto. |
| Rollover sem parecer iniciado | Pronto no recorte implementado. |
| Supersessao de parecer preparatorio | Pronto no recorte implementado. |
| Autorizacao contextual CESAD por assignment | Pronto. |
| Assinatura colegiada backend do parecer CESAD de etapa | Pronto no recorte interno. |
| Parecer conclusivo final backend | Pronto no recorte funcional/documental. |
| Envio a homologacao backend | Pronto. |
| Homologacao, notificacao e ciencia backend | Pronto no recorte implementado. |

## 1.2 Pronto no frontend

| Area | Estado |
|---|---|
| Tela administrativa `/cesad-comissao/admin` | Pronta no recorte de leitura real. |
| Listagem visual de comissoes | Pronta. |
| Card de comissao atual | Pronto. |
| Exibicao de ato e membros | Pronta quando dados retornam da API. |
| Estados de carregamento, erro e vazio | Prontos. |
| Scaffold visual para cadastro/manutencao | Pronto como estrutura visual, sem envio funcional. |
| Workspace de leitura CESAD de etapa | Parcialmente pronto, com leitura consolidada real. |
| Tela de homologacao | Preparada visualmente, ainda sem integracao funcional completa. |

## 1.3 Parcial ou pendente

| Area | Situacao |
|---|---|
| CRUD funcional da Comissao CESAD pela interface | Pendente. |
| Payloads de escrita de comissao no `@sadep/contracts` | Pendente. |
| DTO formal de encerramento/supersessao | Pendente. |
| Caixa de trabalho/listagem de processos da CESAD | Pendente. |
| Emissao de parecer CESAD de etapa no frontend | Pendente. |
| Preparacao/assinatura colegiada no frontend | Pendente. |
| Parecer conclusivo final no frontend | Pendente. |
| Envio a homologacao pelo frontend | Pendente. |
| Homologacao/notificacao/ciencia no frontend | Pendente. |
| PDF oficial | Pendente. |
| Assinatura externa GOVBR real | Pendente. |
| Supersessao documental ampla | Pendente. |

---

# 2. Principios para abertura das proximas tasks

1. **Nao reabrir frentes concluidas.** `BE-CESAD-REG-01` e `FE-CESAD-COMISSAO-01` permanecem encerradas nos recortes ja documentados.
2. **Separar contratos, backend sensivel e frontend.** Fluxos com escrita devem ter contratos claros antes da integracao visual completa.
3. **Evitar frontend que prometa funcionalidade inexistente.** Telas podem ter scaffold, mas acoes reais precisam de backend/contract validado.
4. **Priorizar fluxo operacional antes de polimento documental externo.** Caixa de trabalho, parecer, assinatura e homologacao devem vir antes de PDF/GOVBR real.
5. **Tasks pequenas e auditaveis.** Cada task deve alterar um recorte claro, com criterio de aceite verificavel.
6. **Preservar historico e atos consolidados.** Qualquer mudanca em comissao, parecer ou assinatura deve respeitar assignments, documentos assinados e auditoria.

---

# 3. Roadmap recomendado

## Fase 1 — Base para CRUD funcional da Comissao CESAD

Objetivo: transformar a tela administrativa de leitura real em tela operacional de manutencao da Comissao CESAD, sem quebrar regras backend ja consolidadas.

| Ordem | Task | Responsavel sugerido | Dependencias | Pode rodar em paralelo? |
|---|---|---|---|---|
| 1 | `CONTRACT-CESAD-COMMISSION-WRITE-01` | Pedro | Backend atual de comissoes | Sim, com `BE-CESAD-COMISSAO-CLOSE-DTO-01`. |
| 2 | `BE-CESAD-COMISSAO-CLOSE-DTO-01` | Edgar | Backend atual de close/supersede | Sim, com contracts de escrita. |
| 3 | `FE-CESAD-COMISSAO-CRUD-02` | Fabricio | Contracts minimos e decisao do DTO de encerramento/supersessao | Depois das tasks 1 e 2 ou em paralelo apenas no desenho de UX. |

### 3.1 CONTRACT-CESAD-COMMISSION-WRITE-01

**Objetivo:** mover os payloads de escrita de Comissao CESAD para o pacote `@sadep/contracts`.

**Escopo minimo:**

- `CreateCesadCommissionRequest`.
- `UpdateCesadCommissionRequest`.
- `CloseCesadCommissionRequest`.
- `SupersedeCesadCommissionRequest`.
- Reuso dos enums de ato, status e papel de membro.
- Atualizacao do frontend para importar os tipos compartilhados.

**Fora do escopo:** mudar regras de negocio ou implementar nova UI.

### 3.2 BE-CESAD-COMISSAO-CLOSE-DTO-01

**Objetivo:** formalizar o payload de encerramento/supersessao de comissao.

**Escopo minimo:**

- DTO para encerramento com `reason`, `effectiveEndDate` opcional e metadados auditaveis.
- DTO para supersessao com `reason`, `effectiveEndDate` opcional e, se aplicavel, `successorCommissionId`.
- Ajuste de auditoria para registrar motivo e dados administrativos.
- Testes para bloqueios existentes e novos campos.

**Fora do escopo:** alterar regra de rollover ou criar supersessao documental ampla.

### 3.3 FE-CESAD-COMISSAO-CRUD-02

**Objetivo:** conectar a interface administrativa da Comissao CESAD aos endpoints de escrita ja disponiveis.

**Escopo minimo:**

- Habilitar fluxo de nova comissao.
- Formulario real de comissao, ato e composicao.
- Edicao de comissao ainda nao utilizada.
- Encerramento e supersessao com confirmacao.
- Tratamento de erros do backend em linguagem institucional.
- Estados de sucesso, carregamento e erro.

**Fora do escopo:** rollover por tela, PDF de portaria, GOVBR e assinatura de parecer.

---

## Fase 2 — Atuação operacional da CESAD nos processos

Objetivo: permitir que membros CESAD encontrem, acompanhem e atuem em processos atribuídos, sem depender de ID manual.

| Ordem | Task | Responsavel sugerido | Dependencias | Pode rodar em paralelo? |
|---|---|---|---|---|
| 4 | `FE-CESAD-PROCESS-LIST-01` | Fabricio | Listagem segura por perfil ou endpoint CESAD especifico | Pode iniciar UX antes do endpoint final. |
| 5 | `FE-CESAD-STAGE-OPINION-01` | Pedro/Fabricio | Workspace CESAD atual e endpoints de parecer | Pode rodar apos definicao da caixa de trabalho. |
| 6 | `FE-CESAD-STAGE-SIGNATURE-01` | Pedro | Endpoints de prepare/sign/status de assinatura de etapa | Pode rodar em paralelo com parecer, se contratos estiverem claros. |

### 3.4 FE-CESAD-PROCESS-LIST-01

**Objetivo:** criar caixa de trabalho da CESAD.

**Escopo minimo:**

- Listar processos atribuídos à comissao vigente ou ao membro CESAD logado.
- Separar por status operacional: aguardando analise, parecer em elaboracao, aguardando assinatura, concluido, com bloqueio/rollover.
- Abrir workspace CESAD sem ID manual.
- Respeitar autorizacao contextual.

### 3.5 FE-CESAD-STAGE-OPINION-01

**Objetivo:** permitir emissao/elaboracao do parecer CESAD de etapa no frontend.

**Escopo minimo:**

- Tela de edicao/elaboracao do parecer.
- Salvamento de rascunho quando suportado.
- Preparacao para conclusao do parecer funcional.
- Tratamento de bloqueios por etapa, status, comissao ou ausencia de assignment.

### 3.6 FE-CESAD-STAGE-SIGNATURE-01

**Objetivo:** conectar preparacao e assinatura colegiada de parecer CESAD de etapa no frontend.

**Escopo minimo:**

- Preparar assinaturas esperadas.
- Exibir signatarios e status.
- Permitir assinatura pelo membro esperado.
- Atualizar status do documento/parecer apos assinatura completa.

---

## Fase 3 — Parecer final e envio à homologação

Objetivo: operacionalizar no frontend o fluxo final da CESAD apos as quatro etapas.

| Ordem | Task | Responsavel sugerido | Dependencias | Pode rodar em paralelo? |
|---|---|---|---|---|
| 7 | `FE-CESAD-FINAL-OPINION-01` | Pedro | Backend de parecer final ja entregue | Pode iniciar apos validacao do workspace CESAD. |
| 8 | `FE-CESAD-SEND-HOMOLOGATION-01` | Fabricio | Parecer final completo e assinado | Deve vir depois da task 7. |

### 3.7 FE-CESAD-FINAL-OPINION-01

**Objetivo:** conectar a elaboracao/visualizacao do parecer conclusivo final no frontend.

**Escopo minimo:**

- Verificar elegibilidade para parecer final.
- Criar/iniciar parecer final quando permitido.
- Editar/concluir parecer final.
- Preparar e acompanhar assinatura colegiada final.

### 3.8 FE-CESAD-SEND-HOMOLOGATION-01

**Objetivo:** permitir envio formal do parecer final à autoridade homologadora pelo frontend.

**Escopo minimo:**

- Exibir pre-condicoes para envio.
- Executar envio quando parecer final estiver completo e assinado.
- Registrar feedback visual de sucesso/erro.

---

## Fase 4 — Homologação, notificação e ciência

Objetivo: conectar no frontend o backend de homologacao ja implementado.

| Ordem | Task | Responsavel sugerido | Dependencias | Pode rodar em paralelo? |
|---|---|---|---|---|
| 9 | `FE-HOMOLOG-01` | Fabricio | Backend de homologacao ja entregue; envio a homologacao no frontend | Pode iniciar UX em paralelo com fase 3. |
| 10 | `FE-SERVIDOR-CIENCIA-01` | Pedro | Notificacao/homologacao integrada | Depois ou em paralelo com `FE-HOMOLOG-01`, se contratos estiverem claros. |

### 3.9 FE-HOMOLOG-01

**Objetivo:** integrar a tela de autoridade homologadora ao fluxo real.

**Escopo minimo:**

- Consultar status de homologacao.
- Homologar parecer final.
- Devolver para regularizacao.
- Notificar servidor avaliado.
- Exibir documentos/status correspondentes.

### 3.10 FE-SERVIDOR-CIENCIA-01

**Objetivo:** permitir que servidor avaliado registre ciencia do resultado no frontend.

**Escopo minimo:**

- Exibir resultado homologado/notificado.
- Registrar ciencia.
- Exibir estado final ao servidor.

---

## Fase 5 — Documentos oficiais e integração externa

Objetivo: evoluir a camada documental e de assinatura externa quando os fluxos internos estiverem consolidados.

| Ordem | Task | Responsavel sugerido | Dependencias | Pode rodar em paralelo? |
|---|---|---|---|---|
| 11 | `BE-DOC-PDF-01` | Edgar | Modelos documentais internos estaveis | Pode iniciar apos estabilizar parecer/homologacao. |
| 12 | `FE-DOCS-01` | Fabricio | Endpoints/documentos disponiveis | Pode rodar apos primeiros documentos oficiais. |
| 13 | `BE-SIGN-GOVBR-01` | Edgar | Politica institucional e documentos finais estaveis | Deve ser posterior. |
| 14 | `BE-CESAD-DOC-SUPERSESSION-01` | Edgar | Regras documentais e casos reais de substituicao | Pode ser antecipada se surgir necessidade juridica/processual. |

### 3.11 BE-DOC-PDF-01

**Objetivo:** gerar documentos oficiais em PDF para atos relevantes.

### 3.12 FE-DOCS-01

**Objetivo:** permitir visualizacao/download de documentos oficiais no frontend.

### 3.13 BE-SIGN-GOVBR-01

**Objetivo:** integrar assinatura externa GOVBR real, quando houver decisao institucional e requisitos tecnicos.

### 3.14 BE-CESAD-DOC-SUPERSESSION-01

**Objetivo:** tratar supersessao documental ampla, inclusive documentos parcialmente assinados, substituicao de signatario e invalidacao formal de versoes.

---

# 4. Paralelizacao recomendada

## Pode iniciar em paralelo imediatamente

| Task | Responsavel | Observacao |
|---|---|---|
| `CONTRACT-CESAD-COMMISSION-WRITE-01` | Pedro | Base para frontend CRUD. |
| `BE-CESAD-COMISSAO-CLOSE-DTO-01` | Edgar | Evolui backend sensivel sem bloquear contracts de criacao/edicao. |
| Desenho UX de `FE-CESAD-COMISSAO-CRUD-02` | Fabricio | Apenas UX/scaffold; integracao real apos contracts. |

## Pode iniciar em paralelo depois da fase 1

| Task | Responsavel | Observacao |
|---|---|---|
| `FE-CESAD-PROCESS-LIST-01` | Fabricio | Caixa de trabalho operacional. |
| `FE-CESAD-STAGE-OPINION-01` | Pedro/Fabricio | Pode avancar junto da listagem se houver rota por ID. |
| `FE-CESAD-STAGE-SIGNATURE-01` | Pedro | Depende de clareza de endpoints de assinatura. |

## Deve aguardar

| Task | Motivo |
|---|---|
| `FE-CESAD-SEND-HOMOLOGATION-01` | Depende de parecer final frontend completo e assinado. |
| `FE-SERVIDOR-CIENCIA-01` | Depende de homologacao/notificacao conectadas. |
| `BE-DOC-PDF-01` | Melhor apos estabilizar fluxo funcional. |
| `BE-SIGN-GOVBR-01` | Depende de decisao institucional e maturidade documental. |

---

# 5. Ordem de criacao das issues no Project

## Grupo 1 — Criar primeiro

1. `CONTRACT-CESAD-COMMISSION-WRITE-01` — assignee sugerido: Pedro.
2. `BE-CESAD-COMISSAO-CLOSE-DTO-01` — assignee sugerido: Edgar.
3. `FE-CESAD-COMISSAO-CRUD-02` — assignee sugerido: Fabricio.

## Grupo 2 — Criar apos estabilizar Grupo 1

4. `FE-CESAD-PROCESS-LIST-01` — assignee sugerido: Fabricio.
5. `FE-CESAD-STAGE-OPINION-01` — assignee sugerido: Pedro/Fabricio.
6. `FE-CESAD-STAGE-SIGNATURE-01` — assignee sugerido: Pedro.

## Grupo 3 — Criar apos validacao do fluxo CESAD de etapa

7. `FE-CESAD-FINAL-OPINION-01` — assignee sugerido: Pedro.
8. `FE-CESAD-SEND-HOMOLOGATION-01` — assignee sugerido: Fabricio.
9. `FE-HOMOLOG-01` — assignee sugerido: Fabricio.
10. `FE-SERVIDOR-CIENCIA-01` — assignee sugerido: Pedro.

## Grupo 4 — Criar quando houver decisao documental/institucional

11. `BE-DOC-PDF-01` — assignee sugerido: Edgar.
12. `FE-DOCS-01` — assignee sugerido: Fabricio.
13. `BE-SIGN-GOVBR-01` — assignee sugerido: Edgar.
14. `BE-CESAD-DOC-SUPERSESSION-01` — assignee sugerido: Edgar.

---

# 6. Recomendacao executiva

A primeira rodada de Project deve conter apenas o Grupo 1, porque ele destrava a evolucao natural da tela administrativa ja existente:

1. `CONTRACT-CESAD-COMMISSION-WRITE-01`.
2. `BE-CESAD-COMISSAO-CLOSE-DTO-01`.
3. `FE-CESAD-COMISSAO-CRUD-02`.

Depois que essas tres tasks estiverem em andamento ou concluidas, o Grupo 2 pode ser aberto para tratar a atuacao operacional da CESAD nos processos.

## Proxima acao apos este documento

1. Revisar este plano.
2. Aprovar o PR documental da task `#81`.
3. Criar as tres issues do Grupo 1 no Project.
4. Mover Grupo 1 para `Ready`.
5. Manter Grupo 2 como backlog planejado ate a conclusao ou estabilizacao da fase administrativa.
