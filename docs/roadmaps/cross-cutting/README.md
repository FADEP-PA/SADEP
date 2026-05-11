# Roadmap Transversal Modular

Esta pasta concentra problemas e frentes transversais do SADEP.

O documento legado [`../problemas-atuais-do-projeto.md`](../problemas-atuais-do-projeto.md) continua existindo como indice de compatibilidade. A leitura operacional deve comecar por este diretorio modular.

## Arquivos

- [`active-problems.md`](./active-problems.md): painel vivo de problemas ativos ou alertas relevantes.
- [`resolved-problems.md`](./resolved-problems.md): resumo de problemas transversais resolvidos ou mitigados.
- [`archive-candidates.md`](./archive-candidates.md): lista preparatoria de candidatos a arquivamento futuro.
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
- `NOM-AEP-COOKIE-01` — nomenclatura residual do cookie de refresh.
- `SEC-HARD-01` — hardening adicional de seguranca HTTP, rate limit e CSRF.
- `BE-AUDIT-AUTH-01` — task backend relacionada a auditoria persistida de eventos de autenticacao.
- `FE-CHEFIA-02`, `FE-PROCESS-LIST-01`, `FE-CESAD-01` e `FE-ENV-01` — tasks frontend relacionadas a integracao real e DX.

## Regras de transicao

- Esta fase nao marca problemas como resolvidos.
- `active-problems.md` e o painel vivo de problemas ativos.
- `resolved-problems.md` registra problemas ja resolvidos ou mitigados.
- `archive-candidates.md` prepara a fase futura de arquivamento sem mover arquivos.
- Arquivos detalhados das frentes transversais principais comecam a ser criados na DOC-R2, sem alterar status.
