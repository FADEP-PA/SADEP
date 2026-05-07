# Frontend — Itens Resolvidos

Este arquivo resume itens frontend ja concluidos ou resolvidos. O antigo roadmap frontend permanece como indice de compatibilidade em [`../frontend-tasks-roadmap.md`](../frontend-tasks-roadmap.md).

Esta separacao nao altera status de tasks, nao move documentos legados e nao arquiva historico. Ela apenas prepara a futura reducao dos roadmaps legados.

## FT-27 / DX-01 — Reconciliar dependencias locais do frontend

- **Status documental:** resolvida operacionalmente.
- `npm install` reconciliou o ambiente local.
- `npm ls next` passou com `next@15.5.15`.
- `frontend:check`, build e typecheck do frontend passaram usando `Next.js 15.5.15`.
- Nao houve diff versionado.
- A pendencia `postcss`/audit permanece separada em [`../cross-cutting/tasks/DX-POSTCSS-01-audit-postcss-next.md`](../cross-cutting/tasks/DX-POSTCSS-01-audit-postcss-next.md).

## FT-22 / FT-23 — DX e gates frontend

- **Status documental:** concluidas no roadmap legado.
- `FT-22` investigou a instabilidade do frontend em modo dev e consolidou o uso de limpeza de artefatos quando necessario.
- `FT-23` consolidou gates minimos de qualidade do frontend, incluindo `frontend:check`.
- A leitura de transicao permanece no indice de compatibilidade do roadmap legado.

## FT-20 — Consistencia visual do shell autenticado

- **Status documental:** concluida no recorte frontend.
- O shell autenticado passou a exibir contexto automatico da rota ativa no header.
- A sidebar passou a exibir o perfil ativo com rotulo institucional curto.
- O menu recolhido preserva acesso visual ao logout por icone.
- Dados demonstrativos, placeholders e fakes das telas foram preservados.
- Validacoes aprovadas: `npm run frontend:typecheck`, `npm run frontend:check` e `git diff --check`.

## FT-19 — Responsividade das telas principais

- **Status documental:** concluida no recorte frontend.
- A tabela demonstrativa da chefia imediata passou a virar cards rotulados em tablet/mobile.
- O header autenticado recebeu ajustes de empilhamento para telas estreitas.
- A lista de processos e o modal de avaliacoes anteriores receberam layout de coluna unica em mobile.
- Dados demonstrativos, placeholders e fakes foram preservados.
- Validacoes aprovadas: `npm run frontend:typecheck`, `npm run frontend:check` e `git diff --check`.

## BE-ARCH-01D — Alinhamento minimo de sessao frontend

- **Status documental:** concluida/aprovada na frente backend/frontend de sessao.
- **Commit funcional aprovado:** `fix(frontend): align session invalidation`.
- O frontend deixou de revalidar `/auth/me` em toda troca de rota.
- `401` foi centralizado e tratado com invalidacao idempotente para o MVP.
- `403` preserva sessao e continua como falta de permissao.
- Falhas nao-401 no bootstrap/refresh nao limpam sessao indevidamente.
- `AuthSession`, `rememberMe`, contratos de auth e storage atual foram preservados.
- Validacao manual em navegador ainda e recomendada para login, logout, reload autenticado, `401` concorrente, `403` e limpeza dos storages.

## BE-ARCH-01E4A — Access token em memoria e bootstrap via refresh

- **Status documental:** concluida / auditada / aprovada; ressalva de UX corrigida.
- **Commit funcional aprovado:** `feat(frontend): keep access token in memory`.
- **Fix funcional aprovado:** `BE-ARCH-01E4A-FIX — fix(frontend): normalize public auth routes`.
- Criou store em memoria para `accessToken`.
- Removeu a persistencia de access token em `localStorage` e `sessionStorage`.
- Alterou o bootstrap para `POST /auth/refresh`, restaurando sessao em memoria quando o refresh cookie e valido.
- Login, refresh e logout usam `credentials: include`.
- Logout manual chama `POST /auth/logout` em modo best-effort e preserva limpeza local.
- `rememberMe` virou preferencia local nao sensivel.
- `session.accessToken` foi removido do contexto; consumidores remanescentes foram tratados no recorte `BE-ARCH-01E4C`.
- O `http-client` ficou preparado para uso do token do store em memoria.
- Nao alterou backend, contracts, Prisma, migrations, workflow, CESAD, permissoes ou regras processuais.
- Validacoes aprovadas: `npm run typecheck --workspace @sadep/frontend`, `npm run build --workspace @sadep/frontend`, `npm run frontend:check` e `git diff --check`.
- Ressalva nao bloqueante tratada pelo commit `fix(frontend): normalize public auth routes`: rotas públicas equivalentes sao normalizadas e `401 público` no bootstrap de `/auth/refresh` permanece como anonimo silencioso em rota publica.
- `BE-ARCH-01E4B` e `BE-ARCH-01E4C` foram concluidas posteriormente; `BE-ARCH-01E5` e `BE-ARCH-01F` permanecem pendentes; a frente maior `BE-ARCH-01` nao esta totalmente concluida.

## BE-ARCH-01E4B — Retry 401 com refresh silencioso

- **Status documental:** concluida no recorte frontend.
- O `http-client` faz retry automatico uma unica vez apos `401` em rotas autenticadas nao-`/auth`.
- O refresh usa single-flight por meio de promise compartilhada para evitar storm de `POST /auth/refresh`.
- Se outra requisicao ja atualizou o access token em memoria, a requisicao falhada reutiliza esse token sem disparar novo refresh.
- Rotas `/auth/*` nao entram no retry, preservando protecao contra loop de refresh.
- `BE-ARCH-01E4C` foi concluida posteriormente; `BE-ARCH-01E5` e `BE-ARCH-01F` permanecem pendentes.

## BE-ARCH-01E4C — Remocao de consumidores de access token da sessao

- **Status documental:** concluida no recorte frontend.
- A varredura de codigo nao encontrou `session.accessToken` em uso no frontend.
- O caminho legado `getAuthenticatedUser(accessToken)` foi removido do servico de auth.
- O `http-client` deixou de aceitar token explicito em `RequestOptions`; chamadas autenticadas usam o access token em memoria via `useStoredAccessToken`.
- A validacao automatizada do fluxo frontend fica registrada pelos gates `frontend:typecheck`, `frontend:check` e `git diff --check`.
- `BE-ARCH-01E5` e `BE-ARCH-01F` permanecem pendentes.

## FT-17 — Area de homologacao

- **Status documental:** concluida no roadmap legado como painel preparado.
- A area `/homologacao-autoridade` foi preparada como workspace/painel para expansao.
- Esta conclusao nao deve ser lida como fluxo funcional backend completo de homologacao.

## FT-01 a FT-15 e FT-25

- `FT-01` a `FT-15` aparecem como concluidas no roadmap legado e validadas por gates frontend registrados.
- `FT-25` concluiu a triagem de vulnerabilidades/dependencias que afetam o frontend.
- O alerta residual `next`/`postcss` permanece pendente e separado em `DX-POSTCSS-01`.

## Cuidado especial com FT-05

- `FT-05` pode ser preservada como historico de refinamento visual/estrutural anterior da jornada da chefia.
- Ela nao deve ser interpretada como integracao backend real da chefia.
- A integracao real de `/chefia-imediata` continua pendente em [`./tasks/FE-CHEFIA-01-supervisor-workspace-integration.md`](./tasks/FE-CHEFIA-01-supervisor-workspace-integration.md).

Para a leitura de transicao e links modulares, consultar [`../frontend-tasks-roadmap.md`](../frontend-tasks-roadmap.md).
