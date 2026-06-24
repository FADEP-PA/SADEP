# Problemas Ativos Transversais

> Ultima atualizacao: 2026-06-24 (BE-CESAD-FINAL-01C — reconciliacao documental pos-implementacao).
> O indice de compatibilidade legado foi movido para [`docs/archive/roadmaps-legados/problemas-atuais-do-projeto.md`](../../../archive/roadmaps-legados/problemas-atuais-do-projeto.md).

## Seguranca

- `BE-SEC-03` — autorizacao contextual CESAD por processo; o risco critico imediato foi reduzido substancialmente. `BE-CESAD-AUTH-01` aplicou politica contextual aos endpoints sensiveis atuais, `BE-CESAD-AUTH-02` criou `CesadStageAssignment` como vinculo persistido comissao-processo-etapa, `BE-CESAD-ASSIGN-REPLACE-01` implementou reatribuicao/supersessao formal em recorte seguro, e `BE-DOC-CESAD-SIGN-01` concluiu a assinatura colegiada do parecer CESAD de etapa. O guarda-chuva permanece ativo apenas por lacunas futuras de workflow completo, parecer conclusivo final, homologacao/notificacao/ciencia, documentos posteriores e demais integracoes estruturais.
- [`SEC-HARD-01` — hardening adicional de seguranca HTTP, rate limit e CSRF](./tasks/SEC-HARD-01-http-rate-limit-csrf.md): melhoria futura separada de `BE-ARCH-01E5`.
- [`SEC-LOG-PII-01` — reduzir PII e ruido em logs](./tasks/SEC-LOG-PII-01-auth-logs-pii-noise.md): subtarefa de hardening para revisar e-mails em logs de auth e stacks/mensagens de erros esperados no filtro global.
- `BE-AUDIT-AUTH-01` — auditoria persistida de eventos de autenticacao; task backend futura, separada de `BE-ARCH-01F`.

## Frontend / integracao

- `FE-CHEFIA-01` — `/chefia-imediata` parcialmente integrada ao workspace real por processo informado na tela; validacao visual concluida e fallback demonstrativo/local ainda ativo.
- `FE-CHEFIA-02` — listagem segura de processos da chefia e remocao de fallback demonstrativo. Depende de contrato backend.
- `FE-PROCESS-LIST-01` — listagem segura de processos por perfil autenticado; melhoria futura propria e nao reabre `FT-24`.
- `FE-CESAD-01` — integracao real das telas CESAD com processos, pareceres, autorizacao contextual e documentos. `BE-CESAD-FINAL-01B` ja entregou documento e assinatura final; `BE-CESAD-FINAL-01C` ja entregou o envio formal a homologacao. A integracao frontend continua dependente de contrato/capability frontend especificos.
- `FE-TEST-01` — estrategia minima futura de testes frontend; parcialmente executada (01A ao 01F concluidos). Aberta apenas para expansoes futuras.
- **Diretorios de feature com apenas `.gitkeep`** — `features/assinaturas-eletronicas/`, `features/auditoria-historico/`, `features/autoavaliacao/`, `features/avaliacoes/`, `features/cesad-comissao/`, `features/chefia-imediata/`, `features/documentos-oficiais/`, `features/notificacoes-ciencia/`, `features/painel-gerencial-cesad/`, `features/processo-workflow/` e `features/servidor-estagiario/` sao scaffolds sem implementacao. Qualquer trabalho nesses modulos requer contrato backend correspondente.

## Sessao / auth

Sem pendencia ativa dentro da familia `BE-ARCH-01` apos os recortes `BE-ARCH-01E5` e `BE-ARCH-01F`.

Observacao: a estrategia de producao com refresh/revogacao foi tratada incrementalmente em `BE-ARCH-01E2`, `BE-ARCH-01E3`, `BE-ARCH-01E4A`, `BE-ARCH-01E4B`, `BE-ARCH-01E4C`, `BE-ARCH-01E5` e `BE-ARCH-01F`. Novas evolucoes de auth devem nascer como tasks proprias.

## Backend / arquitetura

Sem pendencia estrutural ativa nesta categoria apos o recorte `BE-ARCH-02`. Novos contratos funcionais devem nascer como tasks proprias.

O proximo bloco de implementacao backend prioritario e `BE-HOMOLOG-01` (homologacao, notificacao e ciencia). `BE-CESAD-FINAL-01C` concluiu a ponte formal `SEND_TO_HOMOLOGATION` com o commit `a0e5b2d`.

## DX / infra

- [`DX-POSTCSS-01` — alerta de audit `postcss`/`next`](./tasks/DX-POSTCSS-01-audit-postcss-next.md): permanece como pendencia separada.
- [`DX-DB-SEED-01` — seed minimo local e checagem de banco](./tasks/DX-DB-SEED-01-local-seed-bootstrap.md): alerta operacional; `db:check` pode falhar quando o banco local existe sem seed minimo; usar `npm run backend:bootstrap` para preparar o ambiente local.
- [`NOM-AEP-COOKIE-01` — nomenclatura residual do cookie de refresh`](./tasks/NOM-AEP-COOKIE-01-refresh-cookie-name.md): o cookie default ainda usa `aep_pa_refresh`; tratar futuramente em task pequena propria, sem migracao ampla AEP -> SADEP.
- [`CI-GATES-01` — definir pipeline oficial de validacao](./tasks/CI-GATES-01-validation-pipeline.md): gates locais existem e passam, mas falta pipeline oficial evidente.

## Qualidade

- Ausencia de testes frontend de interacao permanece como risco ou candidata futura de quality gate quando formalizada.
- `FE-TEST-01` permanece aberta para expansoes futuras de telas autenticadas completas, hooks de sessao e integracao apos `CI-GATES-01`, sem acoplar a tasks que dependem de backend.
