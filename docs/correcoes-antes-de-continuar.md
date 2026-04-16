# Correcoes Antes de Continuar

Checklist priorizado das correcoes que precisam ser feitas antes de continuar com novas features. O objetivo e permitir execucao segura, um item por vez, sem misturar escopo.

## Regras de execucao

- [ ] Trabalhar em apenas um item por vez.
- [ ] Nao misturar refatoracoes fora do item atual.
- [ ] Rodar as validacoes obrigatorias do item antes de marcar como concluido.
- [ ] Se surgir problema fora do escopo, registrar como observacao e nao corrigir no mesmo lote.
- [ ] Preservar o comportamento dos fluxos que hoje ja passam em teste e build.

---

## Backend

### Critico

- [ ] Corrigir o `typecheck` do backend
  - Problema: `npm run typecheck --workspace @aep-pa/backend` falha porque os arquivos de teste estao incluidos na compilacao, faltam dependencias de teste e varias specs estao defasadas.
  - Arquivos principais:
    - `apps/backend/tsconfig.json`
    - `apps/backend/package.json`
    - `apps/backend/src/**/*.spec.ts`
  - Fazer:
    - Definir se as specs ficam no `typecheck` principal ou em `tsconfig` separado.
    - Instalar/configurar dependencias de teste faltantes, se necessario.
    - Corrigir specs com assinaturas antigas e objetos incompletos.
  - Validar:
    - `npm run typecheck --workspace @aep-pa/backend`

- [ ] Alinhar a estrategia de testes do backend
  - Problema: a suite customizada principal passa, mas varias specs tradicionais quebram a manutencao e deixam a cobertura confusa.
  - Arquivos principais:
    - `apps/backend/src/processes/tests/run.ts`
    - `apps/backend/src/**/*.spec.ts`
    - `apps/backend/package.json`
  - Fazer:
    - Padronizar a estrategia de testes.
    - Remover duplicidade ou deixar a convivência explicitamente documentada.
    - Ajustar scripts de teste para refletir a estrategia real do projeto.
  - Validar:
    - Rodar o script oficial de teste do backend.
    - Confirmar cobertura dos fluxos principais: workflow, CESAD, supervisor evaluation e self evaluation.

- [ ] Corrigir o fluxo de geracao de documentos e o uso de `artifactPath`
  - Problema: documentos estao sendo criados com `artifactPath` vazio, embora o schema trate o campo como obrigatorio.
  - Arquivos principais:
    - `apps/backend/src/application/documents/process-documents.service.ts`
    - `apps/backend/prisma/schema.prisma`
    - `docs/process-document.md`
  - Fazer:
    - Definir se documento pode existir sem artefato real.
    - Ajustar schema, servicos e contratos para refletir a regra correta.
    - Garantir que o read model nao trate documento sem artefato como documento valido.
  - Validar:
    - Rodar testes de backend do fluxo documental.
    - Testar manualmente a criacao de documento no fluxo real.

- [ ] Proteger a integridade de assinaturas no banco e na aplicacao
  - Problema: `SignatureRecord` nao tem restricao unica suficiente e a aplicacao depende de leitura seguida de `create`, o que pode gerar duplicidade.
  - Arquivos principais:
    - `apps/backend/prisma/schema.prisma`
    - `apps/backend/src/application/documents/process-documents.service.ts`
  - Fazer:
    - Definir a chave unica correta por documento e signatario.
    - Criar migracao de banco.
    - Ajustar a logica da aplicacao para concorrencia segura.
  - Validar:
    - Rodar testes de assinatura e fluxo documental.
    - Confirmar que a mesma assinatura nao pode ser criada duas vezes.

### Medio

- [ ] Corrigir a regra de retificacao ligada ao estado das assinaturas
  - Problema: a regra atual pode ficar inconsistente porque usa uma leitura fragil do estado de assinatura do servidor.
  - Arquivos principais:
    - `apps/backend/src/application/documents/process-documents.service.ts`
    - `apps/backend/src/processes/supervisor-evaluations/supervisor-evaluations.service.ts`
  - Fazer:
    - Reescrever a regra de `canRectifySupervisorEvaluation` com criterio deterministico.
    - Garantir compatibilidade com a integridade definida para assinaturas.
    - Cobrir os cenarios em teste automatizado.
  - Validar:
    - Rodar testes de supervisor evaluation.
    - Cobrir cenarios de assinatura pendente, concluida e ausente.

### Baixo

- [ ] Migrar a configuracao depreciada do Prisma
  - Problema: o projeto ainda usa `package.json#prisma`, que ja emite warning e sera removido no Prisma 7.
  - Arquivos principais:
    - `apps/backend/package.json`
    - novo `prisma.config.ts`, se adotado
  - Fazer:
    - Migrar a configuracao de seed para o formato recomendado.
    - Atualizar documentacao local se necessario.
  - Validar:
    - `npm run prisma:generate --workspace @aep-pa/backend`
    - `npm run prisma:seed --workspace @aep-pa/backend`

---

## Frontend

### Critico

- [ ] Corrigir sessao stale no frontend
  - Problema: quando a revalidacao falha com erro diferente de `401`, a aplicacao pode continuar tratando a sessao como autenticada.
  - Arquivos principais:
    - `apps/frontend/src/shared/auth/auth-context.tsx`
    - `apps/frontend/src/shared/api/http-client.ts`
    - `apps/frontend/src/shared/auth/auth-guard.tsx`
  - Fazer:
    - Definir comportamento correto para erro de rede, timeout e erro 5xx.
    - Nao manter autenticacao local sem validacao real.
    - Exibir feedback coerente quando o backend estiver indisponivel.
  - Validar:
    - Testar manualmente com backend desligado.
    - Testar manualmente com token invalido.
    - `npm run build --workspace @aep-pa/frontend`

### Medio

- [ ] Adicionar trilha minima de qualidade no frontend
  - Problema: o frontend so tem `dev`, `build` e `start`, sem `test`, `lint` ou `typecheck` explicito.
  - Arquivos principais:
    - `apps/frontend/package.json`
    - `apps/frontend/tsconfig.json`
    - configuracoes que forem adicionadas
  - Fazer:
    - Adicionar pelo menos `typecheck`.
    - Adicionar `lint`, se o projeto adotar ESLint.
    - Criar cobertura minima para autenticacao e consumo de API.
  - Validar:
    - Rodar os novos scripts.
    - `npm run build --workspace @aep-pa/frontend`

### Baixo

- [ ] Revisar dependencias de UX/autenticacao do frontend apos a correcao de sessao
  - Problema: depois de corrigir o bootstrap da sessao, pode ser necessario ajustar mensagens, redirecionamentos e estados visuais.
  - Arquivos principais:
    - `apps/frontend/src/shared/auth/auth-context.tsx`
    - `apps/frontend/src/shared/ui/*`
    - `apps/frontend/src/features/auth/components/login-page.tsx`
  - Fazer:
    - Revisar estados de erro e loading.
    - Garantir que nao existam loops ou mensagens contraditorias.
  - Validar:
    - Teste manual completo do login, logout, expiracao e indisponibilidade do backend.

---

## Infraestrutura

### Critico

- [ ] Atualizar dependencias com vulnerabilidades altas
  - Problema: `npm audit` apontou vulnerabilidades `high` em dependencias importantes, incluindo NestJS e dependencias transitivas.
  - Arquivos principais:
    - `package.json`
    - `package-lock.json`
    - `apps/backend/package.json`
    - `apps/frontend/package.json`
  - Fazer:
    - Atualizar dependencias diretas e transitivas onde for seguro.
    - Confirmar compatibilidade com build, testes e typecheck.
    - Registrar o que nao puder ser corrigido agora.
  - Validar:
    - `npm audit`
    - build frontend
    - typecheck backend
    - testes backend

### Medio

- [ ] Revisar a estrutura declarada do monorepo
  - Problema: existem diretorios em `apps/` e `packages/` sem `package.json`, o que deixa a topologia do monorepo confusa.
  - Arquivos principais:
    - `package.json`
    - `apps/cron/`
    - `apps/worker/`
    - `packages/config/`
    - docs de arquitetura
  - Fazer:
    - Decidir quais diretorios vao virar workspaces reais.
    - Remover ou documentar placeholders estruturais.
    - Ajustar documentacao para refletir a topologia real.
  - Validar:
    - `npm ls --depth=0`
    - Revisao do README e docs de arquitetura

### Baixo

- [ ] Revisar documentacao tecnica apos as correcoes principais
  - Problema: varias decisoes de arquitetura e operacao podem ficar desatualizadas depois dos ajustes acima.
  - Arquivos principais:
    - `README.md`
    - `docs/local-setup.md`
    - `docs/process-document.md`
    - `docs/workflow-engine.md`
    - `docs/architecture/*`
  - Fazer:
    - Atualizar setup, testes, fluxo documental e arquitetura real.
    - Garantir que novos contribuidores encontrem o fluxo correto sem adivinhacao.
  - Validar:
    - Revisao manual da documentacao.

---

## Ordem recomendada de execucao

- [ ] Backend / Critico / Corrigir o `typecheck`
- [ ] Backend / Critico / Alinhar a estrategia de testes
- [ ] Frontend / Critico / Corrigir sessao stale
- [ ] Backend / Critico / Corrigir `artifactPath` e fluxo documental
- [ ] Backend / Critico / Proteger integridade de assinaturas
- [ ] Backend / Medio / Corrigir regra de retificacao
- [ ] Frontend / Medio / Adicionar trilha minima de qualidade
- [ ] Infraestrutura / Critico / Atualizar dependencias vulneraveis
- [ ] Backend / Baixo / Migrar configuracao do Prisma
- [ ] Infraestrutura / Medio / Revisar estrutura do monorepo
- [ ] Infraestrutura / Baixo / Atualizar documentacao tecnica

## Observacoes finais

- [ ] Nao iniciar novas features antes de concluir pelo menos os itens criticos de backend e frontend.
- [ ] O item de retificacao deve vir depois da integridade de assinaturas.
- [ ] O item de vulnerabilidades deve ser feito com os testes e validacoes ja estabilizados.
