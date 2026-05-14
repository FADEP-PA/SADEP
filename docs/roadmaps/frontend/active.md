# Frontend - Painel Ativo

Este painel resume apenas itens frontend ativos ou pendentes. Itens concluidos, resolvidos operacionalmente ou mantidos como historico ficam em [`resolved.md`](./resolved.md) e no indice de compatibilidade em [`../frontend-tasks-roadmap.md`](../frontend-tasks-roadmap.md).

## Ativos / pendentes

### Backlog frontend dependente de backend/contracts

| Task | Prioridade | Status | Dependencias principais | Proxima acao segura |
|---|---|---|---|---|
| [`FE-PROCESS-LIST-01`](./tasks/FE-PROCESS-LIST-01-authenticated-process-list.md) | Alta futura | Pendente | Endpoints backend seguros de listagem por perfil e autorizacao contextual | Aguardar contrato backend seguro antes de alterar telas ou remover IDs manuais. |
| [`FE-CHEFIA-02`](./tasks/FE-CHEFIA-02-supervisor-process-list-and-demo-removal.md) | Alta futura | Pendente | Listagem real dos processos da chefia autenticada e autorizacao backend | Aguardar contrato de listagem por chefia antes de remover fallback demonstrativo. |
| [`FE-CESAD-01`](./tasks/FE-CESAD-01-real-cesad-screens.md) | Alta futura | Pendente | Contratos backend de parecer CESAD, documentos, assinaturas e capabilities | Aguardar/mapear contratos reais antes de conectar acoes ou remover fallback visual. |
| [`FE-TEST-01`](./tasks/FE-TEST-01-frontend-test-strategy.md) | Media futura | Parcialmente executada (FE-TEST-01A, FE-TEST-01B, FE-TEST-01C e FE-TEST-01D concluidos); aberta apenas para expansoes futuras | Decisao operacional para cobrir `http-client`, services autenticados, ciclo real do `AuthProvider` e telas autenticadas sem reabrir contratos backend | Avancar para `http-client`/services autenticados via `vi.stubGlobal('fetch', ...)` e, em seguida, para o ciclo real do `AuthProvider` quando houver janela de qualidade dedicada, sem acoplar a `FE-CHEFIA-02`, `FE-PROCESS-LIST-01` ou `FE-CESAD-01`. |

## Decisao operacional atual

- Nenhuma das tres tasks pendentes dependentes de backend acima deve ser executada como implementacao frontend isolada enquanto os contratos backend correspondentes nao estiverem disponiveis.
- O frontend pode receber recortes seguros de documentacao, UX, responsividade, acessibilidade, dados demonstrativos ou qualidade, desde que nao prometa assinatura, emissao, homologacao, parecer final, persistencia ou integracao real inexistente.
- O recorte `FE-QUAL-02` reforcou o quality gate textual do frontend, mas nao substitui validacao visual em navegador ou testes de interacao.
- `FE-TEST-01` esta parcialmente executada: o recorte `FE-TEST-01A` cobriu `ProcessRequestFeedback` (ausencia de erro, 404, 403, erro generico e preservacao de mensagem/detalhes), o recorte `FE-TEST-01B` cobriu o nucleo dos estados operacionais institucionais (`EmptyState`, `AccessBlockedState`, `TemporaryUnavailableState`, `DemonstrationModeState`), o recorte `FE-TEST-01C` ampliou a cobertura para os demais estados de `apps/frontend/src/shared/ui/operational-states.tsx` (`ProcessNotFoundState`, `StageUnavailableState`, `MissingDocumentState`, `ReadNotReleasedState`, `InsufficientHistoryState` e `ClearState`) e o recorte `FE-TEST-01D` cobriu os cinco ramos institucionais de `apps/frontend/src/shared/auth/auth-guard.tsx` (loading, anonimo, autenticado sem `allowedRoles`, autenticado com papel permitido e autenticado com papel bloqueado) via `vi.mock` de `useAuth` e `next/navigation`. Todos os recortes seguem sem mock de backend real.
- O recorte `FE-TEST-01D` tambem ajustou `scripts/check-frontend-copy.mjs` para ignorar arquivos com sufixo `.test.ts(x)`/`.test.js(x)`: a regra textual permanece ativa para o restante do `src/`, mas APIs idiomaticas do vitest (`vi.mock`, `mockReturnValue`) deixam de regredir o gate de copy institucional ao serem usadas em testes.
- A infraestrutura minima de testes frontend ja existe com `vitest` em ambiente `jsdom`, Testing Library (`@testing-library/react`, `@testing-library/dom`, `@testing-library/jest-dom`), `apps/frontend/vitest.config.ts`, setup em `apps/frontend/src/test/setup.ts` e os scripts `frontend:test` e `frontend:test:run` no monorepo.
- `FE-TEST-01` permanece aberta apenas para expansoes futuras (`http-client`, services autenticados, ciclo real do `AuthProvider`, hooks de sessao e telas autenticadas) e o backlog restante continua dependente de contratos backend onde aplicavel, sem acoplar a `FE-CHEFIA-02`, `FE-PROCESS-LIST-01` ou `FE-CESAD-01`.
- Dados demonstrativos e fallbacks visuais permanecem intencionais quando ajudam a validar telas sem backend completo.
- `FE-CHEFIA-01` permanece resolvida parcialmente no recorte de integracao inicial; a continuidade operacional e `FE-CHEFIA-02`, sem reabrir `FT-24`.
- `FE-DOC-AUTH-README-01` foi concluida nesta atualizacao documental; a documentacao frontend agora descreve access token em memoria, bootstrap por refresh e cookie `HttpOnly`.
- `BE-ARCH-01D`, `BE-ARCH-01E4A`, `BE-ARCH-01E4B` e `BE-ARCH-01E4C` estao registrados em [`resolved.md`](./resolved.md) e nao compoem o backlog ativo frontend.

## Resolvido operacionalmente

Consultar [`resolved.md`](./resolved.md) para os itens frontend concluidos, incluindo `FE-QUAL-02`, `FE-UI-01`, `FE-RESP-01`, `FE-COPY-01`, `FE-UX-01B`, `FE-UX-01A`, `FE-A11Y-01`, `FE-ROADMAP-01`, `FE-QUAL-01`, `FT-26`, `FT-24`, `FE-CHEFIA-01`, `FE-SERVIDOR-01`, `FE-MOBILE-01`, `FE-DEMO-UX-01`, `FT-16`, `FT-17`, `FT-18`, `FT-19`, `FT-20`, `FT-21`, `FT-22`, `FT-23`, `FT-27/DX-01` e os recortes frontend de sessao/auth ja aprovados.
