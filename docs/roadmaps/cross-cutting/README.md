# Roadmap Transversal Modular

Esta pasta concentra problemas e frentes transversais do SADEP.

O documento legado foi arquivado em [`docs/archive/roadmaps-legados/problemas-atuais-do-projeto.md`](../../../archive/roadmaps-legados/problemas-atuais-do-projeto.md) (DOC-R8). A leitura operacional deve comecar por este diretorio modular.

## Arquivos

- [`active-problems.md`](./active-problems.md): painel vivo de problemas ativos ou alertas relevantes.
- [`resolved-problems.md`](./resolved-problems.md): resumo de problemas transversais resolvidos ou mitigados.
- `archive-candidates.md`: arquivo preparatorio movido para `docs/archive/roadmaps-legados/` na DOC-R8; o arquivamento real foi executado nessa fase.
- [`tasks/`](./tasks/): area que comeca a receber arquivos proprios de problemas ou tasks transversais principais.

## Categorias sugeridas

- seguranca;
- integracao backend/frontend;
- DX/infra;
- qualidade/testes;
- documentacao;
- decisoes arquiteturais.

## Itens ativos estruturados

- `DX-POSTCSS-01` — alerta de audit `postcss`/`next`, sem `npm audit fix --force`.
- `DX-DB-SEED-01` — seed minimo local e checagem de banco.
- `DX-FE-ENV-EXAMPLE-01` — criar `.env.example` do frontend e documentar envs de setup/deploy.
- `NOM-AEP-COOKIE-01` — nomenclatura residual do cookie de refresh.
- `SEC-HARD-01` — hardening adicional de seguranca HTTP, rate limit e CSRF.
- `SEC-LOG-PII-01` — reduzir PII e ruido em logs.
- `CI-GATES-01` — definir pipeline oficial de validacao.
- `BE-AUDIT-AUTH-01` — task backend relacionada a auditoria persistida de eventos de autenticacao.
- `FE-CHEFIA-02`, `FE-PROCESS-LIST-01`, `FE-CESAD-01`, `FE-ENV-01` e `FE-TEST-01` — tasks frontend relacionadas a integracao real, DX e qualidade.

## Regras de transicao

- Esta fase nao marca problemas como resolvidos.
- `active-problems.md` e o painel vivo de problemas ativos.
- `resolved-problems.md` registra problemas ja resolvidos ou mitigados.
- O arquivamento real foi executado na DOC-R8; `archive-candidates.md` foi movido para o archive junto com os outros legados.
- Arquivos detalhados das frentes transversais ativas permanecem em [`tasks/`](./tasks/).
