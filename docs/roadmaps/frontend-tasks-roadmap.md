# Frontend Tasks Roadmap — Índice de Compatibilidade

## Status deste documento

Este arquivo era o roadmap frontend principal do SADEP. Durante a modularização documental, ele passou a funcionar como índice de compatibilidade para orientar a leitura da nova estrutura modular do roadmap frontend.

O painel frontend ativo agora é [`frontend/active.md`](./frontend/active.md). Itens frontend resolvidos ficam em [`frontend/resolved.md`](./frontend/resolved.md). As principais tarefas frontend ativas ou pendentes possuem arquivos próprios em [`frontend/tasks/`](./frontend/tasks/).

O histórico detalhado anterior foi resumido na nova estrutura modular. Este índice preserva rastreabilidade, mas não deve mais concentrar blocos longos de histórico, evidências extensas ou instruções operacionais completas.

## Onde consultar agora

| Necessidade | Documento atual |
|---|---|
| Painel frontend ativo | [`frontend/active.md`](./frontend/active.md) |
| Itens frontend resolvidos | [`frontend/resolved.md`](./frontend/resolved.md) |
| `FE-CHEFIA-01` | [`frontend/tasks/FE-CHEFIA-01-supervisor-workspace-integration.md`](./frontend/tasks/FE-CHEFIA-01-supervisor-workspace-integration.md) |
| `FT-24` | [`frontend/tasks/FT-24-process-selection-technical-id.md`](./frontend/tasks/FT-24-process-selection-technical-id.md) |
| `BE-ARCH-01D` | [`backend/tasks/BE-ARCH-01D-frontend-session-alignment.md`](./backend/tasks/BE-ARCH-01D-frontend-session-alignment.md) |
| `DX-POSTCSS-01` | [`cross-cutting/tasks/DX-POSTCSS-01-audit-postcss-next.md`](./cross-cutting/tasks/DX-POSTCSS-01-audit-postcss-next.md) |
| Problemas transversais ativos | [`cross-cutting/active-problems.md`](./cross-cutting/active-problems.md) |
| Problemas transversais resolvidos | [`cross-cutting/resolved-problems.md`](./cross-cutting/resolved-problems.md) |
| Roadmap backend modular | [`backend/active.md`](./backend/active.md) |
| Tracker backend legado | [`backend-implementation-tracker.md`](./backend-implementation-tracker.md) |

## Frentes frontend ativas ou pendentes

### [`FE-CHEFIA-01 — Integração real da chefia imediata`](./frontend/tasks/FE-CHEFIA-01-supervisor-workspace-integration.md)

- **Status:** ativo / parcialmente integrado.
- `/chefia-imediata` consome o workspace real por processo informado na tela.
- A validação visual em navegador passou com backend local, login de chefia e processo `local-fe-chefia-01`.
- Não tratar a tela como integração backend real concluída enquanto houver fallback demonstrativo e ausência de listagem real de processos por perfil.

### [`FT-24 — Reduzir dependência de NEXT_PUBLIC_TECHNICAL_PROCESS_ID`](./frontend/tasks/FT-24-process-selection-technical-id.md)

- **Status:** concluído no recorte frontend.
- Reduzir dependência de ID técnico fixo; `/chefia-imediata`, `/processos` e `/servidor-estagiario` permitem consulta manual por processo.
- O código frontend não consome mais `NEXT_PUBLIC_TECHNICAL_PROCESS_ID`.
- Listagem segura por perfil depende de contrato/backend futuro e não permanece como pendência frontend desta task.
- Melhorias futuras de seleção/listagem segura por perfil devem nascer em task própria.

### Backlog frontend pendente

- `FT-16` — preparar layout base do futuro parecer CESAD de etapa.
- `FT-21` — validar visualmente os fluxos principais com backend local.
- `FT-26` — limpar scaffolds e placeholders legados do frontend.
- `FE-QUAL-01` — candidata futura para testes/frontend quality gate; não representa task formal concluída.

## Relação com BE-ARCH-01D

[`BE-ARCH-01D — Alinhar frontend de sessão`](./backend/tasks/BE-ARCH-01D-frontend-session-alignment.md) impacta diretamente o frontend, mas a coordenação principal está no arquivo próprio da frente backend/frontend de sessão.

- **Status:** concluída / aprovada.
- **Commit funcional aprovado:** `fix(frontend): align session invalidation`.
- **Escopo entregue:** sessão, bootstrap sem revalidacao por troca de rota, `/auth/me`, `401` idempotente, `403`, invalidadores e UX mínima.
- **Fora do escopo:** refresh token, cookies, revogação, logout server-side, backend, contracts, CESAD, workflow e regras processuais.
- **Ressalva:** validacao manual em navegador ainda recomendada para login, logout, reload autenticado, `401` concorrente, `403` e limpeza dos storages.

## Relação com BE-ARCH-01E3 / BE-ARCH-01E4

- `BE-ARCH-01E3` foi concluida/aprovada no backend com refresh token opaco, cookie `HttpOnly`, `POST /auth/refresh`, rotacao, deteccao de reuso e `POST /auth/logout`.
- `BE-ARCH-01E4A` foi concluida/aprovada no frontend com access token em memoria, bootstrap via `POST /auth/refresh`, `credentials: include` em login/refresh/logout, logout chamando `POST /auth/logout` em modo best-effort e `rememberMe` como preferencia local nao sensivel.
- **Commit funcional aprovado:** `feat(frontend): keep access token in memory`.
- **Fix funcional aprovado:** `BE-ARCH-01E4A-FIX — fix(frontend): normalize public auth routes`.
- Atualizacao de 2026-05-04: o `401 público` no bootstrap nao exibe mais aviso indevido de sessao expirada no login porque rotas públicas equivalentes sao normalizadas no helper de auth.
- `BE-ARCH-01E4B` foi concluida no recorte frontend com retry automatico de `401`, single-flight contra refresh storm e protecao contra loop de refresh.
- `BE-ARCH-01E4C` foi concluida no recorte frontend com remocao do caminho legado de token explicito e validacao por gates frontend.
- `BE-ARCH-01E5` e `BE-ARCH-01F` permanecem pendentes; a frente maior `BE-ARCH-01` nao esta totalmente concluida.

## Itens frontend resolvidos

O resumo operacional dos itens frontend resolvidos fica em [`frontend/resolved.md`](./frontend/resolved.md).

Itens principais já registrados como resolvidos, concluídos ou preparados:

- `FT-27 / DX-01` — dependências locais do frontend reconciliadas operacionalmente.
- `FT-22` — investigação/mitigação operacional da instabilidade do frontend em modo dev.
- `FT-23` — gates mínimos do frontend consolidados.
- `FT-20` — consistência visual do shell autenticado revisada sem remover dados demonstrativos.
- `FT-19` — responsividade das telas principais revisada sem remover dados demonstrativos.
- `FT-18` — consistência textual e institucional das áreas por perfil revisada sem remover dados demonstrativos.
- `FT-17` — área de homologação preparada como painel/workspace para expansão, sem equivaler a fluxo backend completo.
- `FT-01` a `FT-15` — histórico frontend concluído conforme roadmap legado anterior.
- `FT-25` — triagem de vulnerabilidades e dependências concluída, com alerta residual separado.

### Ressalvas importantes

- `FT-05` pode ser preservada como histórico visual/estrutural da jornada da chefia, mas não deve ser lida como integração backend real da chefia.
- A integração real de `/chefia-imediata` permanece parcial em [`FE-CHEFIA-01`](./frontend/tasks/FE-CHEFIA-01-supervisor-workspace-integration.md).
- `FT-17` indica painel preparado de homologação; não indica homologação backend funcional completa.

## Relação com backend e problemas transversais

- [`cross-cutting/active-problems.md`](./cross-cutting/active-problems.md) concentra problemas transversais ativos.
- [`cross-cutting/resolved-problems.md`](./cross-cutting/resolved-problems.md) concentra problemas transversais resolvidos ou mitigados.
- [`problemas-atuais-do-projeto.md`](./problemas-atuais-do-projeto.md) agora é índice de compatibilidade transversal.
- [`DX-POSTCSS-01`](./cross-cutting/tasks/DX-POSTCSS-01-audit-postcss-next.md) permanece alerta pendente de audit `postcss`/`next`.

Relações principais:

- `DX-01` foi resolvido operacionalmente quanto ao desalinhamento local do Next.
- `DX-POSTCSS-01` permanece alerta pendente e não deve ser confundido com `DX-01`.
- Ausência de testes frontend permanece risco ou candidata futura de quality gate.
- `/chefia-imediata` permanece frente frontend/integração ativa em `FE-CHEFIA-01`.
- `FT-24` foi resolvida no recorte frontend e nao deve ser confundida com a ausencia futura de listagem segura por perfil.
- `BE-ARCH-01E3` mitigou o gap backend de refresh/rotacao/logout, `BE-ARCH-01E4A` mitigou o risco de access token persistido em storage e o alerta de UX do `401 público` em rota publica, `BE-ARCH-01E4B` concluiu o retry automatico com single-flight, e `BE-ARCH-01E4C` removeu o caminho legado de token explicito no frontend.

## Regras de leitura

- Consultar primeiro [`frontend/active.md`](./frontend/active.md) para o estado operacional frontend.
- Consultar [`frontend/resolved.md`](./frontend/resolved.md) para itens concluídos ou resolvidos.
- Consultar [`frontend/tasks/`](./frontend/tasks/) para frentes ativas específicas.
- Não tratar `FE-CHEFIA-01` como concluída.
- Não reabrir `FT-24` por ausência de listagem segura por perfil; essa melhoria deve ser task futura própria.
- Não confundir `FT-27/DX-01` resolvida com `DX-POSTCSS-01`.
- Não confundir `FT-05` histórica com integração real da chefia.
- Não tratar UI de homologação preparada em `FT-17` como fluxo backend completo.
- `BE-ARCH-01D` está concluída no recorte mínimo de sessão frontend; `BE-ARCH-01E3` está concluída no recorte backend; `BE-ARCH-01E4A` está concluída no recorte frontend inicial; `BE-ARCH-01E4B` e `BE-ARCH-01E4C` estão concluídas no recorte frontend de refresh silencioso; `BE-ARCH-01E5` e `BE-ARCH-01F` permanecem pendentes.

## Fora do escopo deste índice

Este índice não altera:

- status de tasks;
- implementação;
- prioridades;
- decisões de negócio;
- documentação normativa;
- histórico preservado nos arquivos modulares;
- ordem futura do roadmap.
