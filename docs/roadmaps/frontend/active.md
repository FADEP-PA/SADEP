# Frontend - Painel Ativo

> Ultima atualizacao: 2026-07-03 (sincronizacao pos entrega/estabilizacao da administracao de Comissao CESAD).
> Os arquivos de task ja resolvidos foram movidos para [`docs/archive/frontend/tasks/`](../../../archive/frontend/tasks/).
> O indice de compatibilidade legado foi movido para [`docs/archive/roadmaps-legados/frontend-tasks-roadmap.md`](../../../archive/roadmaps-legados/frontend-tasks-roadmap.md).

## Ativos / pendentes

### Backlog frontend dependente de backend/contracts

| Task | Prioridade | Status | Dependencias principais | Proxima acao segura |
|---|---|---|---|---|
| [`FE-PROCESS-LIST-01`](./tasks/FE-PROCESS-LIST-01-authenticated-process-list.md) | Alta futura | Pendente | Endpoints backend seguros de listagem por perfil e autorizacao contextual | Aguardar contrato backend seguro antes de alterar telas ou remover IDs manuais. |
| [`FE-CHEFIA-02`](./tasks/FE-CHEFIA-02-supervisor-process-list-and-demo-removal.md) | Alta futura | Pendente | Listagem real dos processos da chefia autenticada e autorizacao backend | Aguardar contrato de listagem por chefia antes de remover fallback demonstrativo. |
| [`FE-CESAD-READ-01`](./tasks/FE-CESAD-READ-01-cesad-read-workspace-atual.md) | — | Parcialmente executada | Leitura consolidada real integrada; parecer em modo somente leitura; emissao, assinatura e parecer final ainda nao conectados | Nenhuma acao pendente nesta task; continuidade em `FE-CESAD-01`. |
| [`FE-CESAD-01`](./tasks/FE-CESAD-01-real-cesad-screens.md) | Alta futura | Pendente | Backend de parecer final/homologacao avancou; depende ainda de desenho de integracao frontend, contracts/capabilities e decisao de UX real | Aguardar contrato frontend especifico antes de conectar acoes ou remover fallback visual. |
| `FE-CESAD-COMISSAO-CRUD-02` | Media/alta futura | Pendente | `FE-CESAD-COMISSAO-01` entregou leitura real; backend de comissoes esta disponivel; falta conectar formulario, edicao, encerramento e supersessao com UX segura | Abrir task propria antes de implementar CRUD funcional; nao reabrir `FE-CESAD-COMISSAO-01`. |
| `CONTRACT-CESAD-COMMISSION-WRITE-01` | Media futura | Pendente | Payloads de criacao/edicao ainda estao locais no service frontend | Exportar payloads de escrita pelo pacote `@sadep/contracts` antes ou junto da evolucao CRUD. |
| [`FE-TEST-01`](./tasks/FE-TEST-01-frontend-test-strategy.md) | Media futura | Parcialmente executada | FE-TEST-01A ao FE-TEST-01F concluidos; aberta apenas para expansoes futuras | Avaliar cobertura de telas autenticadas completas apos `CI-GATES-01` sem acoplar a `FE-CHEFIA-02`, `FE-PROCESS-LIST-01` ou `FE-CESAD-01`. |

---

## Estrutura de features: o que esta implementado vs. o que e apenas scaffold

A pasta `apps/frontend/src/features/` contem componentes implementados, recortes em leitura real e diretorios que ainda sao apenas scaffolds reservados.

### Implementado ou parcialmente implementado

| Diretorio | O que tem | Observacao |
|---|---|---|
| `features/auth/` | `login-page.tsx` | Login funcional. |
| `features/process/` | Stage timeline, process history, process actions, process status, supervisor evaluation workspace, intern workspace, appeal status | Componentes de processo parcialmente integrados. |
| `features/cesad/` | Workspace de leitura CESAD, historico, documentos, assinaturas e resumo de etapa | Leitura consolidada real integrada; modo demonstrativo apenas na tela pre-consulta; emissao, assinatura e parecer final ainda nao conectados. Ver [`FE-CESAD-READ-01`](./tasks/FE-CESAD-READ-01-cesad-read-workspace-atual.md). |
| `features/cesad-comissao/` | Tela administrativa de Comissao CESAD com leitura real do backend | A rota `/cesad-comissao/admin` consome dados reais de comissoes, ato e membros. Acoes de nova comissao, edicao, encerramento e supersessao permanecem como scaffold/acoes futuras. Ver [`FE-CESAD-COMISSAO-01`](./tasks/FE-CESAD-COMISSAO-01-admin-ui.md). |
| `features/homologacao-autoridade/` | Workspace de homologacao | Workspace preparado; a integracao/validacao frontend completa deve ser tratada em task propria. |
| `features/dashboard/` | `process-dashboard-types.ts` | Tipos de dashboard. |

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

> **Atencao:** `features/cesad-comissao/` deixou de ser scaffold vazio. O estado atual e leitura real + acoes administrativas futuras. Nao tratar a tela como CRUD completo ate haver task propria para criacao, edicao, encerramento e supersessao pela interface.

---

## Decisao operacional atual

- Nenhuma das tasks de produto pendentes dependentes de backend/contracts deve ser executada como implementacao frontend isolada enquanto os contratos e criterios de UX correspondentes nao estiverem definidos.
- A administracao de Comissao CESAD no frontend esta entregue no recorte de leitura real e deve evoluir por novas tasks pequenas, sem reabrir `FE-CESAD-COMISSAO-01`.
- O frontend pode receber recortes seguros de documentacao, UX, responsividade, acessibilidade, dados demonstrativos ou qualidade, desde que nao prometa assinatura, emissao, homologacao, parecer final, persistencia ou integracao real ainda nao conectada.
- `FE-TEST-01` permanece aberta apenas para expansoes futuras, especialmente telas autenticadas completas e integracoes finais.
- `FE-CHEFIA-01` permanece resolvida parcialmente no recorte de integracao inicial; a continuidade operacional e `FE-CHEFIA-02`, sem reabrir `FT-24`.
- Dados demonstrativos e fallbacks visuais permanecem intencionais quando ajudam a validar telas sem integracao completa.

---

## Resolvido operacionalmente

Consultar [`resolved.md`](./resolved.md) para os itens frontend concluidos. Os arquivos de task correspondentes foram movidos para [`docs/archive/frontend/tasks/`](../../../archive/frontend/tasks/).

Itens resolvidos incluem: `FE-QUAL-02`, `FE-UI-01`, `FE-RESP-01`, `FE-COPY-01`, `FE-UX-01B`, `FE-UX-01A`, `FE-A11Y-01`, `FE-ROADMAP-01`, `FE-QUAL-01`, `FT-26`, `FT-24`, `FE-CHEFIA-01`, `FE-SERVIDOR-01`, `FE-MOBILE-01`, `FE-DEMO-UX-01`, `FT-16`, `FT-17`, `FT-18`, `FT-19`, `FT-20`, `FT-21`, `FT-22`, `FT-23`, `FT-27/DX-01`, `FE-DOC-AUTH-README-01`, `FE-CESAD-COMISSAO-01` e os recortes frontend de sessao/auth ja aprovados.
