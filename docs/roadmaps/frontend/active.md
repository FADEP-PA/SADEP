# Frontend - Painel Ativo

> Ultima atualizacao: 2026-05-15 (DOC-R8 — arquivamento de tasks resolvidas, atualizacao de referencias e mapeamento de diretorios nao implementados).
> Os arquivos de task ja resolvidos foram movidos para [`docs/archive/frontend/tasks/`](../../../archive/frontend/tasks/).
> O indice de compatibilidade legado foi movido para [`docs/archive/roadmaps-legados/frontend-tasks-roadmap.md`](../../../archive/roadmaps-legados/frontend-tasks-roadmap.md).

## Ativos / pendentes

### Backlog frontend dependente de backend/contracts

| Task | Prioridade | Status | Dependencias principais | Proxima acao segura |
|---|---|---|---|---|
| [`FE-PROCESS-LIST-01`](./tasks/FE-PROCESS-LIST-01-authenticated-process-list.md) | Alta futura | Pendente | Endpoints backend seguros de listagem por perfil e autorizacao contextual | Aguardar contrato backend seguro antes de alterar telas ou remover IDs manuais. |
| [`FE-CHEFIA-02`](./tasks/FE-CHEFIA-02-supervisor-process-list-and-demo-removal.md) | Alta futura | Pendente | Listagem real dos processos da chefia autenticada e autorizacao backend | Aguardar contrato de listagem por chefia antes de remover fallback demonstrativo. |
| [`FE-CESAD-01`](./tasks/FE-CESAD-01-real-cesad-screens.md) | Alta futura | Pendente | Backend de parecer CESAD final com documento/assinaturas ja entregue em `BE-CESAD-FINAL-01B`; ainda depende de `BE-CESAD-FINAL-01C`, contratos/capabilities frontend e decisao de integracao real | Aguardar `BE-CESAD-FINAL-01C` e contrato frontend especifico antes de conectar acoes ou remover fallback visual. |
| [`FE-TEST-01`](./tasks/FE-TEST-01-frontend-test-strategy.md) | Media futura | Parcialmente executada (FE-TEST-01A, FE-TEST-01B, FE-TEST-01C e FE-TEST-01D concluidos); aberta apenas para expansoes futuras | Decisao operacional para cobrir `http-client`, services autenticados, ciclo real do `AuthProvider` e telas autenticadas | Avancar para `http-client`/services autenticados via `vi.stubGlobal('fetch', ...)` e ciclo real do `AuthProvider` sem acoplar a `FE-CHEFIA-02`, `FE-PROCESS-LIST-01` ou `FE-CESAD-01`. |

---

## Estrutura de features: o que esta implementado vs. o que e apenas scaffold

A pasta `apps/frontend/src/features/` contem tanto componentes implementados quanto diretorios que sao apenas scaffolds reservados (arquivo `.gitkeep`).

### Implementado (componentes reais existem)

| Diretorio | O que tem | Observacao |
|---|---|---|
| `features/auth/` | `login-page.tsx` | Login funcional com JWT |
| `features/process/` | Stage timeline, process history, process actions, process status, supervisor evaluation workspace, intern workspace, appeal status | Componentes de processo parcialmente integrados |
| `features/cesad/` | Stage read workspace, read-only opinion shell, signature timeline, stage summary card, process header card, stage history panel, process warnings panel | CESAD de etapa com dados demonstrativos; CESAD final ainda nao integrado ao frontend, apesar da entrega backend da `BE-CESAD-FINAL-01B` |
| `features/homologacao-autoridade/` | `homologation-authority-workspace.tsx`, `homologation-workspace-service.ts` | Workspace de homologacao preparado, sem backend funcional |
| `features/dashboard/` | `process-dashboard-types.ts` | Tipos de dashboard |

### Scaffold reservado (apenas `.gitkeep`, sem implementacao)

Os diretorios abaixo existem na estrutura mas nao possuem nenhum componente ou logica implementada. Qualquer feature que dependa deles requer implementacao do zero:

| Diretorio | Feature reservada para |
|---|---|
| `features/assinaturas-eletronicas/` | Modulo de assinaturas eletronicas (GOVBR e internas) |
| `features/auditoria-historico/` | Visualizacao do historico de auditoria |
| `features/autoavaliacao/` | Workspace de autoavaliacao do servidor estagiario |
| `features/avaliacoes/` | Workspace de avaliacoes da chefia imediata |
| `features/cesad-comissao/` | Gerenciamento de comissao CESAD (membros, atos, vigencia) |
| `features/chefia-imediata/` | Workspace da chefia imediata com listagem segura de processos |
| `features/documentos-oficiais/` | Gerenciamento e visualizacao de documentos oficiais |
| `features/notificacoes-ciencia/` | Notificacoes e registro de ciencia do servidor |
| `features/painel-gerencial-cesad/` | Painel gerencial da CESAD |
| `features/processo-workflow/` | Componentes do motor de workflow de processo |
| `features/servidor-estagiario/` | Workspace do servidor estagiario |

> **Atencao:** os workspaces de autoavaliacao, avaliacoes da chefia, gestao de comissao CESAD e notificacoes dependem de contratos backend ainda nao implementados. Nao iniciar implementacao frontend isolada nesses modulos sem contrato backend correspondente.

---

## Decisao operacional atual

- Nenhuma das tres tasks pendentes dependentes de backend acima deve ser executada como implementacao frontend isolada enquanto os contratos backend correspondentes nao estiverem disponiveis.
- O frontend pode receber recortes seguros de documentacao, UX, responsividade, acessibilidade, dados demonstrativos ou qualidade, desde que nao prometa assinatura, emissao, homologacao, parecer final, persistencia ou integracao real inexistente.
- `FE-TEST-01` esta parcialmente executada: `FE-TEST-01A` cobriu `ProcessRequestFeedback`; `FE-TEST-01B` cobriu o nucleo dos estados operacionais institucionais; `FE-TEST-01C` ampliou para os demais estados de `operational-states.tsx`; `FE-TEST-01D` cobriu os cinco ramos de `auth-guard.tsx` via `vi.mock`. Todos sem mock de backend real. Task permanece aberta apenas para expansoes futuras.
- O recorte `FE-TEST-01D` ajustou `scripts/check-frontend-copy.mjs` para ignorar arquivos com sufixo `.test.ts(x)`/`.test.js(x)`.
- `FE-CHEFIA-01` permanece resolvida parcialmente no recorte de integracao inicial; a continuidade operacional e `FE-CHEFIA-02`, sem reabrir `FT-24`.
- Dados demonstrativos e fallbacks visuais permanecem intencionais quando ajudam a validar telas sem backend completo.

---

## Resolvido operacionalmente

Consultar [`resolved.md`](./resolved.md) para os itens frontend concluidos. Os arquivos de task correspondentes foram movidos para [`docs/archive/frontend/tasks/`](../../../archive/frontend/tasks/).

Itens resolvidos incluem: `FE-QUAL-02`, `FE-UI-01`, `FE-RESP-01`, `FE-COPY-01`, `FE-UX-01B`, `FE-UX-01A`, `FE-A11Y-01`, `FE-ROADMAP-01`, `FE-QUAL-01`, `FT-26`, `FT-24`, `FE-CHEFIA-01`, `FE-SERVIDOR-01`, `FE-MOBILE-01`, `FE-DEMO-UX-01`, `FT-16`, `FT-17`, `FT-18`, `FT-19`, `FT-20`, `FT-21`, `FT-22`, `FT-23`, `FT-27/DX-01`, `FE-DOC-AUTH-README-01` e os recortes frontend de sessao/auth ja aprovados (`BE-ARCH-01D`, `BE-ARCH-01E4A`, `BE-ARCH-01E4B`, `BE-ARCH-01E4C`).
