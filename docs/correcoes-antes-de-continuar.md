# Correções Antes de Continuar

Checklist priorizado das correções que precisam ser feitas antes de continuar com novas features.  
O objetivo é permitir execução segura, um item por vez, sem misturar escopo e sem construir novas funcionalidades sobre uma base insegura ou instável.

---

## Regras de execução

- [ ] Trabalhar em apenas um item por vez.
- [ ] Não misturar refatorações fora do item atual.
- [ ] Rodar as validações obrigatórias do item antes de marcar como concluído.
- [ ] Se surgir problema fora do escopo, registrar como observação e não corrigir no mesmo lote.
- [ ] Preservar o comportamento dos fluxos que hoje já passam em teste e build.
- [ ] Não iniciar novas features de domínio antes de concluir pelo menos os itens críticos de segurança e estabilidade do backend.
- [ ] Não marcar item como concluído sem implementação, validação e aprovação humana.

---

## Backend

### Crítico

- [x] Corrigir autorização por vínculo de processo no workflow e histórico
  - Observação: workflow, history e transition agora exigem autorização contextual por processo; `ADMIN` não possui bypass automático; `IMMEDIATE_SUPERVISOR` foi bloqueado nesses endpoints por ausência de fonte autoritativa segura no módulo de processos; a resolução completa do vínculo legítimo da chefia segue pendente para a continuidade do roadmap.
  - Problema: as rotas e services de processos/workflow ainda aceitam decisão baseada principalmente em role, sem validar de forma consistente se o usuário pertence ao processo consultado ou movimentado.
  - Impacto:
    - acesso indevido ao histórico de processos;
    - tentativa de movimentação de processos de terceiros;
    - exposição de dados processuais a usuários não vinculados.
  - Arquivos principais:
    - `apps/backend/src/processes/processes.controller.ts`
    - `apps/backend/src/processes/processes.service.ts`
    - `apps/backend/src/processes/workflow-catalog.ts`
  - Fazer:
    - validar vínculo do usuário com o processo antes de leitura, histórico e transições;
    - alinhar controller e service para não depender apenas de role;
    - definir explicitamente o comportamento de `ADMIN`, se houver exceção legítima.
  - Validar:
    - usuário vinculado acessa;
    - usuário não vinculado é bloqueado;
    - histórico respeita vínculo;
    - transições de workflow respeitam vínculo.

- [x] Corrigir autorização por vínculo na avaliação da chefia
  - Observação: a autorização da avaliação da chefia agora usa `ProcessStage.responsibleSupervisorUserId` como fonte estrutural; `ADMIN` não possui bypass automático; leitura, draft, submit e retificação passaram a exigir chefia responsável vinculada estruturalmente à etapa; etapas legadas sem `responsibleSupervisorUserId` ficam bloqueadas por segurança até preenchimento adequado.
  - Problema: qualquer `ADMIN` ou `IMMEDIATE_SUPERVISOR` pode ler, criar rascunho, submeter e retificar avaliação de chefia de processo alheio, porque a validação atual não confirma a chefia responsável esperada para a etapa.
  - Arquivos principais:
    - `apps/backend/src/processes/supervisor-evaluations/supervisor-evaluations.service.ts`
  - Referência segura:
    - `apps/backend/src/processes/self-evaluations/self-evaluations.service.ts`
  - Fazer:
    - validar se o supervisor é a chefia responsável pelo processo/etapa;
    - bloquear leitura, rascunho, submissão e retificação por terceiros;
    - alinhar o padrão com a autoavaliação, que já possui checagem mais segura.
  - Validar:
    - chefia legítima acessa;
    - chefia não vinculada é bloqueada;
    - `ADMIN` só acessa se a regra permitir explicitamente.

- [x] Corrigir o `typecheck` do backend
  - Observação: o typecheck do backend não apresenta mais falha reproduzível na árvore atual; `npm run typecheck --workspace @aep-pa/backend` passou. A separação estrutural entre app, specs e helpers de teste permanece como melhoria residual a ser tratada na estratégia de testes.
  - Problema: a falha descrita anteriormente no `typecheck` não é mais reproduzível; a pendência residual é estrutural, pois o `tsconfig` principal ainda mistura app, specs e helpers de teste, e foi deslocada para a discussão de estratégia de testes.
  - Arquivos principais:
    - `apps/backend/tsconfig.json`
    - `apps/backend/package.json`
    - `apps/backend/src/**/*.spec.ts`
  - Fazer:
    - definir se as specs ficam no `typecheck` principal ou em `tsconfig` separado;
    - instalar/configurar dependências de teste faltantes, se necessário;
    - corrigir specs com assinaturas antigas e objetos incompletos.
  - Validar:
    - `npm run typecheck --workspace @aep-pa/backend`

- [x] Restabelecer a execução da suíte de testes do backend
  - Observação: a falha histórica da suíte não é mais reproduzível na árvore atual; `npm run test --workspace @aep-pa/backend`, `npm run test:runner --workspace @aep-pa/backend` e `npm run test:jest --workspace @aep-pa/backend` passam. As pendências restantes são de estratégia/organização de testes e devem ser tratadas em task específica.
  - Problema: a falha histórica de `npm run test --workspace @aep-pa/backend` por incompatibilidade entre fixtures/testes e o schema Prisma atual não é mais reproduzível nesta árvore.
  - Arquivos principais:
    - `apps/backend/src/processes/tests/cesad-stage-read.service.spec.ts`
    - `apps/backend/prisma/schema.prisma`
    - helpers/fixtures relacionados
  - Fazer:
    - alinhar fixtures e dados de teste ao schema atual;
    - corrigir relacionamentos obrigatórios faltantes;
    - restabelecer a execução do runner principal de testes.
  - Validar:
    - `npm run test --workspace @aep-pa/backend`
    - confirmar execução dos fluxos principais de workflow, CESAD, supervisor evaluation e self evaluation.

- [ ] Alinhar a estratégia de testes do backend
  - Problema: a suíte customizada principal convive com specs tradicionais e configuração parcial de Jest, gerando manutenção confusa e cobertura ambígua.
  - Arquivos principais:
    - `apps/backend/src/processes/tests/run.ts`
    - `apps/backend/src/**/*.spec.ts`
    - `apps/backend/package.json`
  - Fazer:
    - padronizar a estratégia de testes;
    - remover duplicidade ou deixar a convivência explicitamente documentada;
    - ajustar scripts de teste para refletir a estratégia oficial do projeto.
  - Validar:
    - rodar o script oficial de teste do backend;
    - confirmar cobertura mínima dos fluxos principais.

- [x] Corrigir o fluxo de geração de documentos e o uso de `artifactPath`
  - Observação: `ProcessDocument` pode existir como documento lógico antes do artefato físico; `artifactPath` representa apenas o artefato físico materializado; ausência de artefato deve ser `null`, nunca string vazia.
  - Problema: documentos estavam sendo criados com `artifactPath` vazio, embora o schema tratasse o campo como obrigatório.
  - Arquivos principais:
    - `apps/backend/src/application/documents/process-documents.service.ts`
    - `apps/backend/prisma/schema.prisma`
    - `docs/process-document.md`
  - Fazer:
    - definir se documento pode existir sem artefato real;
    - ajustar schema, serviços e contratos para refletir a regra correta;
    - garantir que o read model não trate documento sem artefato como documento válido.
  - Validar:
    - rodar testes de backend do fluxo documental;
    - testar manualmente a criação de documento no fluxo real.

- [x] Proteger a integridade de assinaturas no banco e na aplicação
  - Observação: foi definida unicidade por `processDocumentId + signatoryRole`; a criação de assinatura no backend passou a ser idempotente; conflito semântico com mesmo documento + papel e usuário diferente agora falha explicitamente.
  - Problema: `SignatureRecord` não tinha restrição única suficiente e a aplicação dependia de leitura seguida de `create`, o que podia gerar duplicidade.
  - Arquivos principais:
    - `apps/backend/prisma/schema.prisma`
    - `apps/backend/src/application/documents/process-documents.service.ts`
  - Fazer:
    - definir a chave única correta por documento e signatário;
    - criar migração de banco;
    - ajustar a lógica da aplicação para concorrência segura.
  - Validar:
    - rodar testes de assinatura e fluxo documental;
    - confirmar que a mesma assinatura não pode ser criada duas vezes.

### Médio

- [ ] Corrigir a regra de retificação ligada ao estado das assinaturas
  - Problema: a regra atual pode ficar inconsistente porque usa uma leitura frágil do estado de assinatura do servidor.
  - Arquivos principais:
    - `apps/backend/src/application/documents/process-documents.service.ts`
    - `apps/backend/src/processes/supervisor-evaluations/supervisor-evaluations.service.ts`
  - Fazer:
    - reescrever a regra de `canRectifySupervisorEvaluation` com critério determinístico;
    - garantir compatibilidade com a integridade definida para assinaturas;
    - cobrir os cenários em teste automatizado.
  - Validar:
    - rodar testes de supervisor evaluation;
    - cobrir cenários de assinatura pendente, concluída e ausente.

- [ ] Remover credenciais previsíveis de desenvolvimento
  - Problema: existem senhas e segredos de desenvolvimento previsíveis no repositório e na documentação local.
  - Arquivos principais:
    - `apps/backend/prisma/seed.ts`
    - `apps/backend/.env.example`
    - `docs/local-setup.md`
  - Fazer:
    - remover segredos previsíveis;
    - usar placeholders seguros;
    - ajustar documentação para geração/configuração segura em ambiente local.
  - Validar:
    - revisar `.env.example`;
    - revisar seed;
    - revisar documentação local.

- [ ] Revisar a estratégia de autenticação web
  - Problema: o backend usa JWT manual e o frontend persiste token em storage do navegador, aumentando o risco arquitetural em cenários de XSS.
  - Arquivos principais:
    - `apps/backend/src/auth/*`
    - `apps/frontend/src/shared/auth/session-storage.ts`
    - `apps/frontend/src/shared/api/http-client.ts`
  - Fazer:
    - consolidar uma análise arquitetural sobre sessão web;
    - comparar a estratégia atual com alternativas mais seguras;
    - documentar direção futura.
  - Validar:
    - decisão arquitetural registrada;
    - impacto mapeado para backend e frontend.

### Baixo

- [ ] Migrar a configuração depreciada do Prisma
  - Problema: o projeto ainda usa `package.json#prisma`, que já emite warning e será removido no Prisma 7.
  - Arquivos principais:
    - `apps/backend/package.json`
    - novo `prisma.config.ts`, se adotado
  - Fazer:
    - migrar a configuração de seed para o formato recomendado;
    - atualizar documentação local, se necessário.
  - Validar:
    - `npm run prisma:generate --workspace @aep-pa/backend`
    - `npm run prisma:seed --workspace @aep-pa/backend`

---

## Frontend

### Crítico

- [ ] Corrigir sessão stale no frontend
  - Problema: quando a revalidação falha com erro diferente de `401`, a aplicação pode continuar tratando a sessão como autenticada.
  - Arquivos principais:
    - `apps/frontend/src/shared/auth/auth-context.tsx`
    - `apps/frontend/src/shared/api/http-client.ts`
    - `apps/frontend/src/shared/auth/auth-guard.tsx`
  - Fazer:
    - definir comportamento correto para erro de rede, timeout e erro 5xx;
    - não manter autenticação local sem validação real;
    - exibir feedback coerente quando o backend estiver indisponível.
  - Validar:
    - testar manualmente com backend desligado;
    - testar manualmente com token inválido;
    - `npm run build --workspace @aep-pa/frontend`

### Médio

- [ ] Adicionar trilha mínima de qualidade no frontend
  - Problema: o frontend só tem `dev`, `build` e `start`, sem `test`, `lint` ou `typecheck` explícito no pacote.
  - Arquivos principais:
    - `apps/frontend/package.json`
    - `apps/frontend/tsconfig.json`
    - configurações que forem adicionadas
  - Fazer:
    - adicionar pelo menos `typecheck`;
    - adicionar `lint`, se o projeto adotar ESLint;
    - criar cobertura mínima para autenticação e consumo de API.
  - Validar:
    - rodar os novos scripts;
    - `npm run build --workspace @aep-pa/frontend`

### Baixo

- [ ] Revisar dependências de UX/autenticação do frontend após a correção de sessão
  - Problema: depois de corrigir o bootstrap da sessão, pode ser necessário ajustar mensagens, redirecionamentos e estados visuais.
  - Arquivos principais:
    - `apps/frontend/src/shared/auth/auth-context.tsx`
    - `apps/frontend/src/shared/ui/*`
    - `apps/frontend/src/features/auth/components/login-page.tsx`
  - Fazer:
    - revisar estados de erro e loading;
    - garantir que não existam loops ou mensagens contraditórias.
  - Validar:
    - teste manual completo do login, logout, expiração e indisponibilidade do backend.

---

## Infraestrutura

### Crítico

- [ ] Atualizar dependências com vulnerabilidades altas
  - Problema: `npm audit` apontou vulnerabilidades `high` em dependências importantes, incluindo NestJS e dependências transitivas.
  - Arquivos principais:
    - `package.json`
    - `package-lock.json`
    - `apps/backend/package.json`
    - `apps/frontend/package.json`
  - Fazer:
    - atualizar dependências diretas e transitivas onde for seguro;
    - confirmar compatibilidade com build, testes e typecheck;
    - registrar o que não puder ser corrigido agora.
  - Validar:
    - `npm audit`
    - build frontend
    - typecheck backend
    - testes backend

### Médio

- [ ] Revisar a estrutura declarada do monorepo
  - Problema: existem diretórios em `apps/` e `packages/` sem `package.json`, o que deixa a topologia do monorepo confusa.
  - Arquivos principais:
    - `package.json`
    - `apps/cron/`
    - `apps/worker/`
    - `packages/config/`
    - docs de arquitetura
  - Fazer:
    - decidir quais diretórios vão virar workspaces reais;
    - remover ou documentar placeholders estruturais;
    - ajustar documentação para refletir a topologia real.
  - Validar:
    - `npm ls --depth=0`
    - revisão do README e docs de arquitetura

### Baixo

- [ ] Revisar documentação técnica após as correções principais
  - Problema: várias decisões de arquitetura e operação podem ficar desatualizadas depois dos ajustes acima.
  - Arquivos principais:
    - `README.md`
    - `docs/local-setup.md`
    - `docs/process-document.md`
    - `docs/workflow-engine.md`
    - `docs/architecture/*`
  - Fazer:
    - atualizar setup, testes, fluxo documental e arquitetura real;
    - garantir que novos contribuidores encontrem o fluxo correto sem adivinhação.
  - Validar:
    - revisão manual da documentação.

---

## Ordem recomendada de execução

- [ ] Backend / Crítico / Corrigir autorização por vínculo de processo no workflow e histórico
- [ ] Backend / Crítico / Corrigir autorização por vínculo na avaliação da chefia
- [ ] Backend / Crítico / Corrigir o `typecheck`
- [ ] Backend / Crítico / Restabelecer a execução da suíte de testes
- [ ] Backend / Crítico / Alinhar a estratégia de testes
- [ ] Frontend / Crítico / Corrigir sessão stale
- [ ] Backend / Médio / Corrigir regra de retificação
- [ ] Backend / Médio / Remover credenciais previsíveis de desenvolvimento
- [ ] Backend / Médio / Revisar estratégia de autenticação web
- [ ] Frontend / Médio / Adicionar trilha mínima de qualidade
- [ ] Infraestrutura / Crítico / Atualizar dependências vulneráveis
- [ ] Backend / Baixo / Migrar configuração do Prisma
- [ ] Infraestrutura / Médio / Revisar estrutura do monorepo
- [ ] Infraestrutura / Baixo / Atualizar documentação técnica

---

## Observações finais

- [ ] Não iniciar novas features de domínio antes de concluir pelo menos os itens críticos de backend e frontend.
- [ ] O item de retificação deve vir depois da integridade de assinaturas.
- [ ] O item de vulnerabilidades deve ser feito com os testes e validações já estabilizados.
- [ ] A modelagem institucional da CESAD e a evolução de assinatura colegiada devem entrar apenas após a estabilização mínima de segurança e qualidade do backend.
