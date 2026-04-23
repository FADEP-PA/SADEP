# Correções Antes de Continuar

Checklist priorizado das correções que precisam ser feitas antes de continuar com novas features.  
O objetivo é permitir execução segura, um item por vez, sem misturar escopo e sem construir novas funcionalidades sobre uma base insegura, instável ou desalinhada entre frontend e backend.

---

## Regras de execução

- [ ] Trabalhar em apenas um item por vez.
- [ ] Não misturar refatorações fora do item atual.
- [ ] Rodar as validações obrigatórias do item antes de marcar como concluído.
- [ ] Se surgir problema fora do escopo, registrar como observação e não corrigir no mesmo lote.
- [ ] Preservar o comportamento dos fluxos que hoje já passam em teste e build.
- [ ] Não iniciar novas features de domínio antes de concluir pelo menos os itens críticos de segurança, estabilidade e alinhamento operacional.
- [ ] Não marcar item como concluído sem implementação, validação e aprovação humana.

---

## Backend

### Crítico

- [x] Corrigir autorização por vínculo de processo no workflow e histórico
  - Observação: workflow, history e transition agora exigem autorização contextual por processo; `ADMIN` não possui bypass automático; `IMMEDIATE_SUPERVISOR` foi bloqueado nesses endpoints por ausência de fonte autoritativa segura no módulo de processos; a resolução completa do vínculo legítimo da chefia foi endereçada em task posterior.
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
  - Observação: o typecheck do backend não apresenta mais falha reproduzível na árvore atual; `npm run typecheck --workspace @aep-pa/backend` passou. A separação estrutural entre app, specs e helpers de teste foi tratada na task de estratégia de testes.
  - Problema: a falha descrita anteriormente no `typecheck` não é mais reproduzível; a pendência remanescente era estrutural, e foi deslocada para a estratégia de testes.
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
  - Observação: a falha histórica da suíte não é mais reproduzível na árvore atual; `npm run test --workspace @aep-pa/backend`, `npm run test:runner --workspace @aep-pa/backend` e `npm run test:jest --workspace @aep-pa/backend` passam. As pendências restantes eram de estratégia/organização de testes e foram tratadas em task específica.
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

- [x] Alinhar a estratégia de testes do backend
  - Observação: a estratégia híbrida agora está explícita; `test` agrega `test:integration` e `test:unit`; `typecheck` e `typecheck:spec` foram separados; os comandos passaram na validação manual.
  - Problema: a suíte customizada principal convivia com specs tradicionais e configuração parcial de Jest, gerando manutenção confusa e cobertura ambígua.
  - Arquivos principais:
    - `apps/backend/src/processes/tests/run.ts`
    - `apps/backend/src/**/*.spec.ts`
    - `apps/backend/package.json`
    - `apps/backend/tsconfig.json`
    - `apps/backend/jest.config.js`
  - Fazer:
    - padronizar a estratégia de testes;
    - remover ambiguidade entre runner e Jest;
    - ajustar scripts e documentação mínima;
    - separar typecheck de app e specs.
  - Validar:
    - `npm run typecheck --workspace @aep-pa/backend`
    - `npm run typecheck:spec --workspace @aep-pa/backend`
    - `npm run test --workspace @aep-pa/backend`
    - `npm run test:unit --workspace @aep-pa/backend`
    - `npm run test:integration --workspace @aep-pa/backend`

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

- [x] Separar histórico processual público de eventos documentais
  - Observação: o histórico público passou a exigir correspondência semântica entre `eventType` e `metadata.action`, e eventos com `metadata.origin === 'PROCESS_DOCUMENT'` deixaram de entrar na timeline pública.
  - Problema: o histórico público de workflow filtrava eventos de audit trail de forma ampla e incorporava eventos documentais que não representavam passos processuais públicos.
  - Arquivos principais:
    - `apps/backend/src/processes/processes.service.ts`
    - `apps/backend/src/processes/workflow-catalog.ts`
    - `apps/backend/src/application/documents/process-documents.service.ts`
  - Fazer:
    - separar eventos processuais públicos de eventos documentais internos na leitura pública;
    - refinar o critério semântico do histórico;
    - preservar o audit trail interno completo.
  - Validar:
    - `npm run typecheck --workspace @aep-pa/backend`
    - `npm run test --workspace @aep-pa/backend`
    - confirmar que `SIGNATURE_REQUESTED` documental não aparece mais no `/processes/:id/history`.

---

## Alinhamento Frontend/Backend

### Crítico

- [x] Alinhar fluxo de assinatura do servidor estagiário entre frontend e backend
  - Observação: a assinatura do servidor deixou de depender de `availableActions` e de `SIGN_EVALUATION`; a UI passou a usar `documentContext.internSignaturePending` como fonte principal; a ação passou a chamar `POST /processes/:id/supervisor-evaluation/sign`; o fluxo foi alinhado ao contrato documental real do backend.
  - Problema: o frontend do servidor só liberava a ação se `availableActions` contivesse `SIGN_EVALUATION`, mas essa transição não existe no catálogo público; além disso, a UI enviava `POST /processes/:id/workflow/transition`, enquanto a assinatura real estava em endpoint documental dedicado.
  - Impacto:
    - botão tendia a nunca habilitar;
    - se forçado, usava a rota errada;
    - jornada do servidor estagiário ficava quebrada.
  - Arquivos principais:
    - `apps/frontend/src/features/process/components/intern-server-workspace.tsx`
    - `apps/frontend/src/shared/api/services/processes-service.ts`
    - `apps/backend/src/processes/processes.service.ts`
    - `apps/backend/src/processes/workflow-catalog.ts`
    - `apps/backend/src/api/documents/process-documents.controller.ts`
  - Fazer:
    - alinhar a UI à rota real de assinatura documental;
    - basear a liberação da ação no contexto documental correto, não em transição pública inexistente;
    - preservar a política de autorização já implementada.
  - Validar:
    - a assinatura do servidor é habilitada quando de fato disponível;
    - a rota correta é utilizada;
    - o fluxo funciona com o backend real.

- [x] Alinhar snapshot/tela da chefia com a política real de acesso do backend
  - Observação: a tela da chefia deixou de usar `/workflow` e `/history`; passou a usar `GET /processes/:id/supervisor-evaluation/workspace`; o backend passou a devolver snapshot seguro com `process.status`, `supervisorEvaluation`, `documentContext` e flags operacionais; supervisor continua bloqueado nos endpoints públicos; os cards dependentes de histórico público e de `availableActions` foram removidos/desativados nessa workspace.
  - Problema: a workspace da chefia consultava `/processes/:id/workflow` e `/processes/:id/history`, mas o backend bloqueia supervisor nesses endpoints públicos desde a BE-SEC-01.
  - Impacto:
    - a tela da chefia podia falhar antes de abrir a avaliação;
    - a UI dependia de endpoints que a política real do backend não permite.
  - Arquivos principais:
    - `apps/frontend/src/features/process/components/supervisor-evaluation-workspace.tsx`
    - `apps/frontend/src/shared/api/services/processes-service.ts`
    - `apps/backend/src/processes/processes.service.ts`
  - Fazer:
    - separar o snapshot da chefia dos endpoints públicos bloqueados;
    - ou criar/adaptar um caminho compatível com a política real do backend;
    - preservar as decisões de BE-SEC-01 e BE-SEC-02.
  - Validar:
    - a tela da chefia abre e opera sem depender de endpoints públicos bloqueados;
    - não há regressão das garantias de autorização.

### Alta

- [x] Alinhar matriz de permissões entre menu, guards e backend
  - Observação: menu e guards do frontend passaram a refletir a matriz real do backend; `ADMIN` deixou de ver áreas operacionais sem suporte backend real; workspaces do servidor e da chefia foram restringidas aos perfis efetivamente suportados; `/processos` foi removida dos perfis que a tela atual ainda não suporta com segurança.
  - Problema: menu, guards locais e backend contavam histórias diferentes sobre o que `ADMIN` e outros perfis podem realmente acessar.
  - Impacto:
    - navegação enganosa;
    - rotas que prometiam suporte e devolviam 403;
    - experiência contraditória entre frontend e backend.
  - Arquivos principais:
    - `apps/frontend/src/shared/rbac/menu.ts`
    - `apps/frontend/src/features/process/components/supervisor-evaluation-workspace.tsx`
    - `apps/frontend/src/features/process/components/intern-server-workspace.tsx`
    - `apps/frontend/src/features/cesad/components/cesad-stage-read-workspace.tsx`
    - `apps/backend/src/processes/processes.service.ts`
    - `apps/backend/src/processes/supervisor-evaluations/supervisor-evaluations.service.ts`
  - Fazer:
    - definir explicitamente a política de acesso por perfil nas áreas críticas;
    - alinhar menu, guards e API à mesma matriz;
    - evitar rotas visíveis mas inviáveis.
  - Validar:
    - o frontend não oferece navegação que a API rejeita sistematicamente;
    - a política de acesso fica coerente entre UI e backend.

- [ ] Alinhar fluxo de autoavaliação do servidor e assinatura da autoavaliação pela chefia no frontend
  - Problema: o backend já possui fluxo de autoavaliação e assinatura da autoavaliação pela chefia, inclusive com regras que podem levar o processo à CESAD, mas o frontend ainda não expõe esse caminho de forma operacional.
  - Impacto:
    - o processo pode travar antes da CESAD;
    - o fluxo ponta a ponta não fica fechado na interface;
    - as estabilizações anteriores não se convertem em uso operacional completo.
  - Arquivos principais:
    - `apps/backend/src/processes/self-evaluations.service.ts`
    - `apps/backend/src/processes/self-evaluations.controller.ts`
    - `apps/backend/src/application/documents/process-documents.service.ts`
    - `apps/frontend/src/shared/api/services/processes-service.ts`
    - `apps/frontend/src/features/process/components/intern-server-workspace.tsx`
    - `apps/frontend/src/features/process/components/supervisor-evaluation-workspace.tsx`
  - Fazer:
    - expor no frontend o fluxo real de autoavaliação do servidor;
    - expor no frontend a assinatura da autoavaliação pela chefia;
    - alinhar a UI aos endpoints e regras reais já existentes no backend;
    - garantir continuidade operacional até a CESAD.
  - Validar:
    - o servidor consegue operar sua autoavaliação pela interface;
    - a chefia consegue operar a assinatura da autoavaliação pela interface;
    - o fluxo deixa de travar antes da CESAD por ausência de UI.

- [ ] Alinhar leitura consolidada da CESAD aos eventos realmente persistidos
  - Problema: o read model consolidado da CESAD espera uma família de eventos, mas o serviço de parecer de etapa grava outra família, causando consolidado incompleto e warnings incorretos.
  - Impacto:
    - leitura consolidada parcial;
    - rastreabilidade incompleta da etapa;
    - inconsistência entre persistência e leitura.
  - Arquivos principais:
    - `apps/backend/src/processes/cesad-stage-read.service.ts`
    - `apps/backend/src/processes/cesad-stage-opinions.service.ts`
    - enums/eventos relacionados
  - Fazer:
    - alinhar o read model aos eventos realmente persistidos;
    - ou alinhar a persistência ao conjunto esperado, conforme a solução mínima mais segura.
  - Validar:
    - a leitura consolidada da CESAD reflete corretamente os eventos realmente emitidos pelo backend.

### Média

- [ ] Ajustar atalho global para `/processos` na home autenticada
  - Problema: a home autenticada ainda promete o atalho “Abrir processos” para perfis que não deveriam acessar a tela atual com segurança.
  - Impacto:
    - UX contraditória com a matriz já corrigida no menu/guards;
    - possibilidade de cair em rota que o fluxo atual não suporta de forma consistente.
  - Arquivos principais:
    - `apps/frontend/src/app/(authenticated)/inicio/page.tsx`
    - `apps/frontend/src/features/process/components/process-workspace.tsx`
    - `apps/frontend/src/shared/rbac/menu.ts`
  - Fazer:
    - alinhar o atalho global da home à mesma matriz real do frontend/backend;
    - evitar promessa residual de `/processos` fora dos perfis hoje compatíveis.
  - Validar:
    - checar visualmente os atalhos por perfil;
    - confirmar coerência com menu e guards atuais.

---

## Backend

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
    - `README.md`
    - `apps/backend/src/config/env.validation.ts`
  - Fazer:
    - remover segredos previsíveis;
    - usar placeholders seguros;
    - ajustar documentação para geração/configuração segura em ambiente local;
    - impedir fallback fraco de JWT;
    - exigir senha local de seed via ambiente.
  - Validar:
    - revisar `.env.example`;
    - revisar seed;
    - revisar documentação local;
    - validar novo fluxo local de configuração.

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

### Alta

- [ ] Adicionar trilha mínima de qualidade no frontend
  - Problema: o frontend ainda não possui `typecheck`, `lint` ou `test` expostos oficialmente no pacote, apesar de o typecheck manual já passar.
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

### Média

- [ ] Revisar dependências de UX/autenticação do frontend após os ajustes de sessão
  - Problema: embora a sessão stale tenha perdido urgência crítica, ainda pode ser necessário revisar mensagens, redirecionamentos e estados visuais.
  - Arquivos principais:
    - `apps/frontend/src/shared/auth/auth-context.tsx`
    - `apps/frontend/src/shared/ui/*`
    - `apps/frontend/src/features/auth/components/login-page.tsx`
  - Fazer:
    - revisar estados de erro e loading;
    - garantir que não existam loops ou mensagens contraditórias;
    - avaliar se a home e os atalhos respeitam o estado real da sessão.
  - Validar:
    - teste manual completo do login, logout, expiração e indisponibilidade do backend.

---

## Infraestrutura

### Crítico

- [ ] Atualizar dependências com vulnerabilidades altas
  - Problema: `npm audit --audit-level=high` apontou vulnerabilidades relevantes, incluindo 1 crítica em `next` e 9 altas em dependências importantes.
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

- [x] Backend / Crítico / Corrigir autorização por vínculo de processo no workflow e histórico
- [x] Backend / Crítico / Corrigir autorização por vínculo na avaliação da chefia
- [x] Backend / Crítico / Corrigir o `typecheck`
- [x] Backend / Crítico / Restabelecer a execução da suíte de testes
- [x] Backend / Crítico / Alinhar a estratégia de testes do backend
- [x] Backend / Crítico / Separar histórico processual público de eventos documentais

- [x] Alinhamento / Crítico / Alinhar fluxo de assinatura do servidor estagiário entre frontend e backend
- [x] Alinhamento / Crítico / Alinhar snapshot/tela da chefia com a política real de acesso do backend
- [x] Alinhamento / Alta / Alinhar matriz de permissões entre menu, guards e backend

- [ ] Alinhamento / Alta / Alinhar fluxo de autoavaliação do servidor e assinatura da autoavaliação pela chefia no frontend
- [ ] Alinhamento / Alta / Alinhar leitura consolidada da CESAD aos eventos realmente persistidos
- [ ] Alinhamento / Médio / Ajustar atalho global para `/processos` na home autenticada

- [ ] Backend / Médio / Corrigir regra de retificação
- [ ] Backend / Médio / Remover credenciais previsíveis de desenvolvimento
- [ ] Backend / Médio / Revisar estratégia de autenticação web

- [ ] Frontend / Alta / Adicionar trilha mínima de qualidade
- [ ] Frontend / Média / Revisar dependências de UX/autenticação após os ajustes de sessão

- [ ] Infraestrutura / Crítico / Atualizar dependências vulneráveis
- [ ] Backend / Baixo / Migrar configuração do Prisma
- [ ] Infraestrutura / Médio / Revisar estrutura do monorepo
- [ ] Infraestrutura / Baixo / Atualizar documentação técnica

---

## Observações finais

- [ ] Não iniciar novas features de domínio antes de concluir pelo menos os itens críticos de backend, frontend e alinhamento operacional.
- [ ] O item de retificação deve vir depois da integridade de assinaturas.
- [ ] O item de vulnerabilidades deve ser feito com os testes e validações já estabilizados.
- [ ] A modelagem institucional da CESAD e a evolução de assinatura colegiada devem entrar apenas após a estabilização mínima de segurança, qualidade e fluxo operacional ponta a ponta.
- [ ] O item de sessão stale deixou de ser bloqueio crítico imediato, mas sua revisão de UX/autenticação ainda permanece útil em fase posterior.