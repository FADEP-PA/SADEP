# Frontend - Painel Ativo

Este painel resume apenas itens frontend ativos ou pendentes. Itens concluidos, resolvidos operacionalmente ou mantidos como historico ficam em [`resolved.md`](./resolved.md) e no indice de compatibilidade em [`../frontend-tasks-roadmap.md`](../frontend-tasks-roadmap.md).

## Ativos / pendentes

### Backlog frontend dependente de backend/contracts

| Task | Prioridade | Status | Dependencias principais | Proxima acao segura |
|---|---|---|---|---|
| [`FE-PROCESS-LIST-01`](./tasks/FE-PROCESS-LIST-01-authenticated-process-list.md) | Alta futura | Pendente | Endpoints backend seguros de listagem por perfil e autorizacao contextual | Mapear contrato disponivel antes de alterar telas ou remover IDs manuais. |
| [`FE-CHEFIA-02`](./tasks/FE-CHEFIA-02-supervisor-process-list-and-demo-removal.md) | Alta futura | Pendente | Listagem real dos processos da chefia autenticada e autorizacao backend | Aguardar contrato de listagem por chefia antes de remover fallback demonstrativo. |
| [`FE-CESAD-01`](./tasks/FE-CESAD-01-real-cesad-screens.md) | Alta futura | Pendente | Contratos backend de parecer CESAD, documentos, assinaturas e capabilities | Aguardar/mapear contratos reais antes de conectar acoes ou remover fallback visual. |

## Decisao operacional atual

- Nenhuma das tres tasks pendentes acima deve ser executada como implementacao frontend isolada enquanto os contratos backend correspondentes nao estiverem disponiveis.
- O frontend pode receber recortes seguros de documentacao, UX, responsividade, acessibilidade, dados demonstrativos ou qualidade, desde que nao prometa assinatura, emissao, homologacao, parecer final, persistencia ou integracao real inexistente.
- Dados demonstrativos e fallbacks visuais permanecem intencionais quando ajudam a validar telas sem backend completo.
- `FE-CHEFIA-01` permanece resolvida parcialmente no recorte de integracao inicial; a continuidade operacional e `FE-CHEFIA-02`, sem reabrir `FT-24`.
- `BE-ARCH-01D`, `BE-ARCH-01E4A`, `BE-ARCH-01E4B` e `BE-ARCH-01E4C` estao registrados em [`resolved.md`](./resolved.md) e nao compoem o backlog ativo frontend.

## Resolvido operacionalmente

Consultar [`resolved.md`](./resolved.md) para os itens frontend concluidos, incluindo `FE-RESP-01`, `FE-COPY-01`, `FE-UX-01B`, `FE-UX-01A`, `FE-A11Y-01`, `FE-ROADMAP-01`, `FE-QUAL-01`, `FT-26`, `FT-24`, `FE-CHEFIA-01`, `FE-SERVIDOR-01`, `FE-MOBILE-01`, `FE-DEMO-UX-01`, `FT-16`, `FT-17`, `FT-18`, `FT-19`, `FT-20`, `FT-21`, `FT-22`, `FT-23`, `FT-27/DX-01` e os recortes frontend de sessao/auth ja aprovados.
