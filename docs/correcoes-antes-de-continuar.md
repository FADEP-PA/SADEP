# Correções Antes de Continuar

Checklist priorizado das correções e frentes estruturais que precisam ser tratadas antes de avançar para as próximas grandes funcionalidades do sistema.  
O objetivo é permitir execução segura, um item por vez, sem misturar escopo e sem construir novas funcionalidades sobre uma base insegura, instável, desalinhada ou conceitualmente frágil.

---

## Regras de execução

- [ ] Trabalhar em apenas um item por vez.
- [ ] Não misturar refatorações fora do item atual.
- [ ] Rodar as validações obrigatórias do item antes de marcar como concluído.
- [ ] Se surgir problema fora do escopo, registrar como observação e não corrigir no mesmo lote.
- [ ] Preservar o comportamento dos fluxos que hoje já passam em teste e build.
- [ ] Não iniciar novas features de formalização documental ou assinatura colegiada antes de consolidar a base institucional da Comissão CESAD.
- [ ] Não marcar item como concluído sem implementação, validação e aprovação humana.

---

## Backend

### Crítico

- [x] Corrigir autorização por vínculo de processo no workflow e histórico
  - Observação: workflow, history e transition agora exigem autorização contextual por processo; `ADMIN` não possui bypass automático; `IMMEDIATE_SUPERVISOR` foi bloqueado nesses endpoints por ausência de fonte autoritativa segura no módulo de processos; a resolução completa do vínculo legítimo da chefia foi endereçada em task posterior.

- [x] Corrigir autorização por vínculo na avaliação da chefia
  - Observação: a autorização da avaliação da chefia agora usa `ProcessStage.responsibleSupervisorUserId` como fonte estrutural; `ADMIN` não possui bypass automático; leitura, draft, submit e retificação passaram a exigir chefia responsável vinculada estruturalmente à etapa; etapas legadas sem `responsibleSupervisorUserId` ficam bloqueadas por segurança até preenchimento adequado.

- [x] Corrigir o `typecheck` do backend
  - Observação: o typecheck do backend não apresenta mais falha reproduzível na árvore atual.

- [x] Restabelecer a execução da suíte de testes do backend
  - Observação: a falha histórica da suíte não é mais reproduzível na árvore atual; `test`, `test:runner` e `test:jest` passam.

- [x] Alinhar a estratégia de testes do backend
  - Observação: a estratégia híbrida agora está explícita; `test` agrega `test:integration` e `test:unit`; `typecheck` e `typecheck:spec` foram separados.

- [x] Separar histórico processual público de eventos documentais
  - Observação: o histórico público passou a exigir correspondência semântica entre `eventType` e `metadata.action`, e eventos com `metadata.origin === 'PROCESS_DOCUMENT'` deixaram de entrar na timeline pública.

---

## Alinhamento Frontend/Backend

### Crítico

- [x] Alinhar fluxo de assinatura do servidor estagiário entre frontend e backend
  - Observação: a assinatura do servidor deixou de depender de `availableActions` e de `SIGN_EVALUATION`; a UI passou a usar `documentContext.internSignaturePending` como fonte principal; a ação passou a chamar `POST /processes/:id/supervisor-evaluation/sign`; o fluxo foi alinhado ao contrato documental real do backend.

- [x] Alinhar snapshot/tela da chefia com a política real de acesso do backend
  - Observação: a tela da chefia deixou de usar `/workflow` e `/history`; passou a usar `GET /processes/:id/supervisor-evaluation/workspace`; o backend passou a devolver snapshot seguro com `process.status`, `supervisorEvaluation`, `documentContext` e flags operacionais; supervisor continua bloqueado nos endpoints públicos.

- [x] Alinhar matriz de permissões entre menu, guards e backend
  - Observação: menu e guards do frontend passaram a refletir a matriz real do backend; `ADMIN` deixou de ver áreas operacionais sem suporte backend real; workspaces do servidor e da chefia foram restringidas aos perfis efetivamente suportados; `/processos` foi removida dos perfis que a tela atual ainda não suporta com segurança.

### Alta

- [x] Alinhar fluxo de autoavaliação do servidor e assinatura da autoavaliação pela chefia no frontend
  - Observação: o servidor passou a preencher, salvar rascunho e submeter a autoavaliação pela interface; a chefia passou a visualizar e assinar a autoavaliação pela interface; o frontend passou a usar os endpoints reais já existentes no backend; o fluxo deixou de travar antes da CESAD por ausência de UI.

- [x] Alinhar leitura consolidada da CESAD aos eventos realmente persistidos
  - Observação: a leitura consolidada da CESAD passou a refletir os eventos reais do fluxo funcional de parecer por etapa; o snapshot passou a expor `cesadStageOpinion`; a UI CESAD passou a exibir o parecer funcional em leitura; a solução não formalizou `ProcessDocument.CESAD_OPINION`, mantendo essa etapa para evolução futura.

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

## Macrobloco — Institucionalização da Comissão CESAD

A institucionalização mínima da Comissão CESAD foi concluída com:

- [x] `CESAD-DOM-01A` — entidade da comissão
- [x] `CESAD-DOM-01B` — ato normativo da comissão
- [x] `CESAD-DOM-01C` — composição formal da comissão
- [x] `CESAD-DOM-01D` — perfil Assistente da Comissão
- [x] `CESAD-DOM-01E` — leitura da comissão vigente e da composição vigente

### Observações do bloco concluído
- a comissão passou a existir como entidade institucional explícita
- a composição passou a ser formal e temporalmente controlada
- o ato normativo passou a existir como contexto institucional próprio
- o assistente foi introduzido como role global de leitura operacional, sem virar membro formal
- a leitura da comissão vigente passou a existir em endpoint consolidado próprio
- `relatedActs` entrou apenas como contexto documental
- o assistente permaneceu fora da composição formal

---

## Próxima Frente Estrutural Prioritária

### Ponte entre identidade, comissão e parecer

A próxima necessidade estrutural do projeto não é ainda a assinatura colegiada em si, mas sim garantir que o sistema tenha uma **fonte canônica de nome da pessoa** antes de congelar signatários esperados do parecer.

Sem isso, a modelagem de signatários correria o risco de congelar:
- email
- ou nomes derivados sinteticamente do email

o que seria inadequado para o parecer CESAD.

### Alta

- [ ] BE-IDENT-01 — Introduzir nome canônico no User antes do snapshot de signatários
  - Objetivo: criar fonte explícita, confiável e canônica de nome no `User`, apta para uso institucional e para congelamento em `nameSnapshot`.
  - Problema atual:
    - o modelo `User` não possui campo de nome explícito;
    - backend e frontend ainda usam email ou display name derivado do email em vários pontos;
    - isso inviabiliza a modelagem correta dos signatários esperados do parecer.
  - Fazer:
    - adicionar campo de nome ao `User`;
    - ajustar schema e migration;
    - ajustar seed;
    - propagar o nome por login/auth/me/sessão;
    - substituir, quando fizer sentido, exibições derivadas de email;
    - manter `User` como fonte canônica do nome.
  - Não fazer:
    - criar segunda fonte de nome em `CesadCommissionMember`;
    - iniciar ainda a modelagem dos signatários esperados;
    - mexer em assinatura colegiada ou documento formal.
  - Observação:
    - a comissão/composição deve apenas referenciar a pessoa; o nome oficial deve vir do `User`.

- [ ] BE-STR-01 — Modelar signatários esperados do parecer CESAD
  - Objetivo: separar quem integra a comissão de quem deve assinar um parecer específico.
  - Regras de negócio já definidas:
    - todos os titulares vigentes assinam todos os pareceres;
    - suplente só assina por substituição explícita;
    - assistente não assina;
    - o snapshot deve ser congelado quando o parecer for colocado para assinatura.
  - Fazer:
    - modelar signatários esperados do parecer CESAD;
    - derivar inicialmente signatários ordinários da composição vigente;
    - congelar snapshot de signatários no momento operacional correto;
    - preservar nome canônico vindo do `User`.
  - Não entra agora:
    - assinatura efetiva;
    - PDF;
    - documento formal completo;
    - reformulação ampla de `SignatureRecord`;
    - modelagem completa de afastamento/substituição.

---

## Evolução Documental do Parecer CESAD

### Média

- [ ] BE-FLOW-10A — Formalizar documento do parecer CESAD
- [ ] BE-FLOW-10B — Implementar assinatura do parecer CESAD
- [ ] BE-FLOW-10C — Implementar substituição explícita por suplente

Observação:
- essas tasks só devem avançar depois que a base de identidade canônica e os signatários esperados estiverem estabilizados.

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
    - cobrir cenários em teste automatizado.

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
    - ajustar documentação para configuração local segura;
    - impedir fallback fraco de JWT;
    - exigir senha local de seed via ambiente.

- [ ] Revisar a estratégia de autenticação web
  - Problema: o backend usa JWT manual e o frontend persiste token em storage do navegador, aumentando o risco arquitetural em cenários de XSS.
  - Fazer:
    - consolidar análise arquitetural;
    - comparar estratégia atual com alternativas mais seguras;
    - documentar direção futura.

### Baixo

- [ ] Migrar a configuração depreciada do Prisma
  - Problema: o projeto ainda usa `package.json#prisma`, que já emite warning e será removido no Prisma 7.

- [ ] Revisar estratégia para constraints temporais fora do Prisma schema
  - Problema: algumas regras críticas de integridade temporal já dependem de SQL manual/trigger, pois não são expressáveis de forma suficiente no datamodel Prisma.
  - Observação:
    - isso não bloqueia o roadmap atual;
    - mas deve permanecer visível como dívida técnica futura.

---

## Frontend

### Alta

- [ ] Adicionar trilha mínima de qualidade no frontend
  - Problema: o frontend ainda não possui `typecheck`, `lint` ou `test` expostos oficialmente no pacote, apesar de o typecheck manual já passar.
  - Fazer:
    - adicionar pelo menos `typecheck`;
    - adicionar `lint`, se adotado;
    - criar cobertura mínima para autenticação e consumo de API.

### Média

- [ ] Revisar dependências de UX/autenticação do frontend após os ajustes de sessão
  - Problema: embora a sessão stale tenha perdido urgência crítica, ainda pode ser necessário revisar mensagens, redirecionamentos e estados visuais.
  - Fazer:
    - revisar estados de erro e loading;
    - garantir que não existam loops ou mensagens contraditórias;
    - avaliar se a home e os atalhos respeitam o estado real da sessão.

---

## Infraestrutura

### Crítico

- [ ] Atualizar dependências com vulnerabilidades altas
  - Problema: `npm audit --audit-level=high` apontou vulnerabilidades relevantes, incluindo 1 crítica em `next` e 9 altas em dependências importantes.
  - Fazer:
    - atualizar dependências diretas e transitivas onde for seguro;
    - confirmar compatibilidade com build, testes e typecheck;
    - registrar o que não puder ser corrigido agora.

### Médio

- [ ] Revisar a estrutura declarada do monorepo
  - Problema: existem diretórios em `apps/` e `packages/` sem `package.json`, o que deixa a topologia do monorepo confusa.

### Baixo

- [ ] Revisar documentação técnica após as correções principais
  - Problema: várias decisões de arquitetura e operação podem ficar desatualizadas depois dos ajustes acima.

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
- [x] Alinhamento / Alta / Alinhar fluxo de autoavaliação do servidor e assinatura da autoavaliação pela chefia no frontend
- [x] Alinhamento / Alta / Alinhar leitura consolidada da CESAD aos eventos realmente persistidos

- [x] Macrobloco / Alta / CESAD-DOM-01A — Modelar entidade Comissão CESAD
- [x] Macrobloco / Alta / CESAD-DOM-01B — Modelar ato normativo / portaria da comissão
- [x] Macrobloco / Alta / CESAD-DOM-01C — Modelar composição formal da comissão
- [x] Macrobloco / Média / CESAD-DOM-01D — Introduzir perfil Assistente da Comissão
- [x] Macrobloco / Alta / CESAD-DOM-01E — Expor leitura da comissão vigente e da composição vigente

- [ ] Ponte / Alta / BE-IDENT-01 — Introduzir nome canônico no User
- [ ] Ponte / Alta / BE-STR-01 — Modelar signatários esperados do parecer CESAD

- [ ] Evolução documental / Média / BE-FLOW-10A — Formalizar documento do parecer CESAD
- [ ] Evolução documental / Média / BE-FLOW-10B — Implementar assinatura do parecer CESAD
- [ ] Evolução documental / Média / BE-FLOW-10C — Implementar substituição explícita por suplente

- [ ] Backend / Médio / Corrigir regra de retificação
- [ ] Backend / Médio / Remover credenciais previsíveis de desenvolvimento
- [ ] Backend / Médio / Revisar estratégia de autenticação web

- [ ] Frontend / Média / Ajustar atalho global para `/processos` na home autenticada
- [ ] Frontend / Alta / Adicionar trilha mínima de qualidade
- [ ] Frontend / Média / Revisar UX/autenticação após ajustes de sessão

- [ ] Infraestrutura / Crítico / Atualizar dependências vulneráveis
- [ ] Backend / Baixo / Migrar configuração do Prisma
- [ ] Backend / Baixo / Revisar estratégia para constraints temporais fora do Prisma schema
- [ ] Infraestrutura / Médio / Revisar estrutura do monorepo
- [ ] Infraestrutura / Baixo / Atualizar documentação técnica

---

## Observações finais

- [ ] Não iniciar formalização documental do parecer CESAD nem assinatura colegiada antes de consolidar a base institucional da comissão, a identidade canônica dos membros e os signatários esperados.
- [ ] O item de retificação deve vir depois da integridade de assinaturas.
- [ ] O item de vulnerabilidades deve ser feito com os testes e validações já estabilizados.
- [ ] A regra “3 titulares e 2 suplentes” deve ser tratada como padrão institucional documentado, não como hardcode rígido.
- [ ] O item de sessão stale deixou de ser bloqueio crítico imediato, mas sua revisão de UX/autenticação ainda permanece útil em fase posterior.
- [ ] O nome oficial das pessoas deve ter `User` como fonte canônica, e não ser duplicado no cadastro da comissão.