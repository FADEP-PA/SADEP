# Problemas atuais do projeto AEP-PA

**Atualizado em:** 24/04/2026  
**Função deste documento:** painel transversal de problemas ativos do projeto  
**Escopo:** backend, frontend, infraestrutura, build, DX e lacunas estruturais gerais

---

# Finalidade deste documento

Este documento registra os **problemas atuais do projeto como um todo**, independentemente de estarem ou não na frente ativa do roadmap backend.

Ele deve ser usado para:

- consolidar problemas validados em backend, frontend, infraestrutura e DX;
- registrar riscos e lacunas relevantes do projeto;
- apoiar priorização técnica;
- servir como mapa de problemas transversais para equipe e agentes;
- complementar o roadmap operacional do backend.

---

# Relação com o roadmap backend

Este documento **não substitui** o tracker backend.

## Fonte de verdade do roadmap backend
- `docs/backend-implementation-tracker.md`

## Função deste documento
- registrar o panorama amplo de problemas do projeto;
- indicar itens que podem virar tasks específicas no tracker backend ou em futuros trackers de frontend/infra;
- preservar achados importantes sem obrigar execução imediata.

## Regra de convivência
- o **tracker backend** governa a **ordem de implementação do backend**;
- este documento governa a **visão ampla dos problemas atuais do projeto**;
- um problema listado aqui só entra no fluxo operacional do backend quando for convertido em task explícita no tracker.

---

# Estado atual validado

## Validações executadas nesta rodada

- `npm install` → dependências já instaladas
- `npm install` → `npm audit` reportou `10 vulnerabilities (9 high, 1 critical)`
- `npm run prisma:generate --workspace @aep-pa/backend` → falhou com `EPERM` ao renomear `query_engine-windows.dll.node`
- `npx prisma db push --schema prisma/schema.prisma` em `apps/backend` → banco sincronizado; a etapa de generate continuou falhando com `EPERM`
- `npm run prisma:seed --workspace @aep-pa/backend` → passou
- `npm run typecheck --workspace @aep-pa/backend` → passou
- `npm run test --workspace @aep-pa/backend` → passou
- `npm run test:unit --workspace @aep-pa/backend` → passou
- `npm run typecheck:spec --workspace @aep-pa/backend` → passou
- `npm run build --workspace @aep-pa/frontend` → passou

## Conclusão técnica desta rodada

- o backend está funcional depois de sincronização manual do banco e execução do seed;
- o principal problema operacional atual no backend está no fluxo de geração do Prisma no Windows;
- o frontend compila, mas continua com lacunas funcionais e áreas placeholder;
- o roadmap backend segue corretamente com a task ativa `BE-IDENT-01`, pois a modelagem futura de signatários do parecer depende de nome canônico no `User`, e esse campo ainda não existe.  

---

# Frentes ativas e dependências estruturais

## Frente ativa do backend
**BE-IDENT-01 — Introduzir nome canônico no User antes do snapshot de signatários**

### Motivo
A próxima frente de domínio do backend é `BE-STR-01`, que modelará os signatários esperados do parecer CESAD. Entretanto, isso depende de uma fonte canônica de nome em `User`, pois o snapshot do parecer não pode congelar:
- email;
- nem nome sintético derivado do email.

### Situação atual
Hoje o sistema:
- não possui campo explícito de nome em `User`;
- usa email como identificador humano visível;
- e em alguns pontos deriva “display name” a partir do email.

### Consequência
`BE-IDENT-01` foi corretamente posicionada antes da `BE-STR-01` no tracker backend.

---

# Problemas atuais de maior prioridade

## 1. Nome canônico ainda ausente no `User`

### Descrição
O sistema ainda não possui um campo explícito, confiável e canônico de nome em `User`. Isso afeta diretamente a futura modelagem de signatários esperados do parecer CESAD, porque o snapshot documental precisará congelar nome institucional de pessoas reais.

### Evidências
- o diagnóstico confirmou ausência estrutural de nome no `User`;
- o backend e o frontend ainda recorrem a email ou display name derivado de email;
- a task `BE-IDENT-01` já foi aberta no tracker backend como pré-requisito para `BE-STR-01`.

### Impacto
- bloqueio estrutural para modelagem correta do `nameSnapshot`;
- risco de congelar identificadores inadequados em parecer institucional;
- propagação de nomes sintéticos pelo sistema.

### Status no tracker
- corresponde à task **`BE-IDENT-01`** no `backend-implementation-tracker.md`

---

## 2. Geração do Prisma instável no ambiente Windows

### Descrição
O comando de geração do client Prisma falha com erro de sistema operacional ao renomear o engine nativo em `node_modules/.prisma/client`. O erro é compatível com lock de arquivo por processo em execução.

### Evidências
- `npm run prisma:generate --workspace @aep-pa/backend` falhou com `EPERM`
- `npx prisma db push --schema prisma/schema.prisma` sincronizou o banco, mas a etapa automatizada de generate falhou pelo mesmo motivo
- havia processos `node` ativos executando backend/frontend no momento da tentativa

### Impacto
- setup local não determinístico
- risco de client Prisma desatualizado em relação ao schema
- aumento de falso positivo de “backend quebrado” em ambiente de desenvolvimento

### Status no tracker
- corresponde à task **`BE-OPS-02 — Estabilizar prisma generate no ambiente Windows`**

---

## 3. Bootstrap do backend depende de preparo manual do banco

### Descrição
O backend passou em `typecheck` e testes somente após execução manual de `db push` e `seed`. Os logs existentes mostram falha anterior em runtime por ausência de tabelas.

### Evidências
- mensagem registrada: `The table main.User does not exist in the current database`
- a sequência mínima funcional nesta rodada foi: `db push` → `seed` → validações

### Impacto
- onboarding local frágil
- risco de erro 500 em runtime quando a base não foi preparada
- ausência de bootstrap reproduzível para equipe e CI

### Status no tracker
- corresponde à task **`BE-OPS-03 — Criar bootstrap determinístico do backend`**

---

## 4. Configuração Prisma depreciada

### Descrição
O projeto ainda utiliza configuração em `package.json#prisma`. O Prisma atual já emite aviso de depreciação e indica migração para `prisma.config.ts`.

### Evidências
- os testes exibiram aviso deprecado do Prisma para `package.json#prisma`

### Impacto
- débito técnico de configuração
- risco de quebra em upgrade futuro para Prisma 7
- ruído recorrente na esteira local

### Status no tracker
- corresponde à task **`BE-TECH-01 — Migrar a configuração depreciada do Prisma`**

---

## 5. Vulnerabilidades abertas em dependências

### Descrição
O `npm install` reportou vulnerabilidades em dependências do workspace. Ainda não foi feita classificação formal entre dependência de runtime, dev-only e transitiva.

### Evidências
- `npm install` reportou `10 vulnerabilities (9 high, 1 critical)`

### Impacto
- risco de segurança ainda não qualificado
- possibilidade de impacto direto em runtime ou cadeia de build

### Status no tracker
- permanece como problema transversal relevante
- ainda não foi convertido em task backend específica com ID próprio

---

# Riscos altos

## 6. Mecanismo de autenticação ainda não está endurecido para produção

### Descrição
A autenticação usa token bearer próprio, sem refresh token, sem revogação e com persistência de sessão no navegador.

### Impacto
- maior exposição a problemas de sessão e roubo de token
- baixo controle operacional sobre expiração e revogação
- desenho insuficiente para ambiente institucional real

### Status no tracker
- corresponde à task **`BE-ARCH-01 — Revisar estratégia de autenticação web`**

---

## 7. Frontend ainda depende de lacunas de API

### Descrição
Algumas jornadas do frontend usam mensagens e comportamento de contorno porque a API ainda não expõe todos os dados necessários para leitura completa da etapa.

### Impacto
- uso de heurística no cliente
- maior risco de inconsistências entre regra de negócio e interface

### Status no tracker
- permanece como problema transversal
- se necessário, deve ser convertido em nova task de alinhamento backend/frontend

---

## 8. Rotas importantes do frontend ainda estão em placeholder

### Descrição
As áreas de administração e homologação ainda usam estrutura visual de placeholder, sem entrega funcional equivalente ao restante do fluxo.

### Impacto
- cobertura funcional incompleta por perfil
- diferença entre navegação exposta e funcionalidade real disponível

### Status no tracker
- hoje não está no roadmap backend como task específica
- permanece como backlog transversal do projeto

---

# Lacunas estruturais relevantes

## 9. Apps `cron` e `worker` estão somente na estrutura

### Descrição
Os apps existem no monorepo, mas não possuem implementação funcional, script de execução ou primeira entrega real.

### Impacto
- não há processamento assíncrono real
- não há rotina agendada real

### Status no tracker
- corresponde à task **`BE-TECH-02 — Revisar estrutura de workspaces (worker / cron)`**

---

## 10. Esteira de qualidade ainda não está consolidada na raiz

### Descrição
O workspace raiz não tem scripts agregadores de `build`, `test`, `lint` e `typecheck`. O frontend também não define scripts de teste ou lint.

### Impacto
- CI/CD mais manual
- ausência de gate único de qualidade para o repositório

### Status no tracker
- ainda não foi convertido em task backend explícita
- permanece como problema transversal relevante

---

## 11. Pacotes compartilhados ainda estão subestruturados

### Descrição
`packages/config` ainda não entrega configuração compartilhada real, e `packages/contracts` expõe arquivos de `src` diretamente, sem build próprio.

### Impacto
- baixo nível de maturidade da camada compartilhada
- maior acoplamento entre apps e estrutura interna dos pacotes

### Status no tracker
- corresponde à task **`BE-ARCH-02 — Fortalecer pacotes compartilhados do monorepo`**

---

## 12. Backend ainda não possui fluxo explícito de build de produção

### Descrição
Os scripts atuais do backend usam `ts-node` e não existe fluxo consolidado de compilação e start de produção.

### Impacto
- processo de deploy indefinido
- baixa previsibilidade para runtime fora do ambiente dev

### Status no tracker
- corresponde à task **`BE-OPS-04 — Definir build e start de produção do backend`**

---

# Dev experience

## 13. Instabilidade observada no frontend em modo dev

### Descrição
O `build` do frontend passou, mas o log de desenvolvimento registra falhas de hot reload, carga de chunks e respostas `500`/`404` em assets do Next.

### Impacto
- perda de produtividade em desenvolvimento
- maior ocorrência de falso positivo de regressão visual ou de runtime

### Status no tracker
- permanece como problema transversal
- ainda não convertido em task backend

---

# Checklist de correção recomendado

## Ordem recomendada transversal

1. Introduzir nome canônico no `User`
2. Modelar signatários esperados do parecer CESAD
3. Preparar bootstrap determinístico do backend
4. Remover fragilidade operacional do Prisma no Windows
5. Definir build/start de produção do backend
6. Limpar passivos de segurança e configuração
7. Reduzir lacunas entre API e frontend
8. Fechar áreas placeholder
9. Consolidar arquitetura de monorepo e produção

---

# Tarefas mapeadas

## Backend / Domínio

- [ ] `{BACK}` **BE-IDENT-01** — Introduzir nome canônico no `User`
  - Como corrigir:
    - adicionar campo `name` ao `User`;
    - ajustar schema, migration, seed e helpers de teste;
    - propagar `name` por login, token, `/auth/me`, sessão e frontend;
    - trocar, quando possível, exibições derivadas de email pela fonte canônica do `User`.

- [ ] `{BACK}` **BE-STR-01** — Modelar signatários esperados do parecer CESAD
  - Como corrigir:
    - criar snapshot de signatários esperados ligado ao parecer CESAD específico;
    - congelar snapshot quando o parecer for colocado para assinatura;
    - derivar signatários da composição vigente;
    - usar nome canônico vindo do `User`.

## Backend / Operacional

- [ ] `{BACK}` **BE-OPS-03** — Criar bootstrap determinístico do backend
  - Como corrigir:
    - adicionar fluxo único para preparo local do backend;
    - encadear generate, sync/migrate, seed e validação básica;
    - documentar a ordem de execução;
    - evitar boot “cego” com banco ausente.

- [ ] `{BACK}` **BE-OPS-02** — Estabilizar `prisma generate` no Windows
  - Como corrigir:
    - impedir generate com processo usando o engine ativo;
    - revisar lock do `query_engine-windows.dll.node`;
    - validar comportamento com backend/frontend parados;
    - documentar procedimento local seguro.

- [ ] `{BACK}` **BE-OPS-04** — Definir build e start de produção do backend
  - Como corrigir:
    - separar scripts de dev/test/prod;
    - introduzir build compilada;
    - validar boot do artefato compilado.

## Backend / Arquitetura e técnica

- [ ] `{BACK}` **BE-TECH-01** — Migrar a configuração Prisma deprecada
  - Como corrigir:
    - remover uso de `package.json#prisma`;
    - criar `prisma.config.ts`;
    - ajustar scripts e documentação.

- [ ] `{BACK}` **BE-ARCH-01** — Revisar estratégia de autenticação web
  - Como corrigir:
    - revisar estratégia de sessão;
    - avaliar refresh token, revogação e expiração controlada;
    - alinhar armazenamento e invalidadores entre backend e frontend.

- [ ] `{BACK}` **BE-ARCH-02** — Fortalecer pacotes compartilhados do monorepo
  - Como corrigir:
    - estruturar melhor `contracts` e `config`;
    - revisar build e forma de consumo;
    - reduzir acoplamento direto em `src`.

- [ ] `{BACK}` **BE-TECH-02** — Revisar `worker` e `cron`
  - Como corrigir:
    - escolher entre implementar escopo mínimo real
    - ou retirar essas promessas da arquitetura imediata.

## Backend / Segurança e configuração

- [ ] `{BACK}` Classificar e corrigir vulnerabilidades de dependências
  - Como corrigir:
    - executar classificação entre runtime/dev/transitivas;
    - atualizar dependências com validação posterior.

- [ ] `{BACK}` Remover credenciais previsíveis de desenvolvimento
  - Como corrigir:
    - revisar seed, `.env.example` e docs;
    - substituir segredos previsíveis por placeholders seguros.

## Backend | Frontend

- [ ] `{BACK|FRONT}` Expor na API os dados faltantes usados hoje por heurística no frontend
  - Como corrigir:
    - mapear endpoints ou campos ausentes;
    - alinhar contrato com frontend;
    - reduzir macroinferências no cliente.

- [ ] `{BACK|FRONT}` Consolidar scripts de qualidade na raiz do monorepo
  - Como corrigir:
    - adicionar scripts agregadores de `build`, `test`, `typecheck` e `lint`;
    - preparar execução padronizada em CI.

## Frontend

- [ ] `{FRONT}` Remover dependências de heurística no cliente onde a API já puder atender
- [ ] `{FRONT}` Implementar as rotas placeholder de administração e homologação

---

# Observações finais

- o documento transversal não altera automaticamente a task ativa do backend;
- a task ativa continua sendo `BE-IDENT-01`, conforme o tracker backend;
- a `BE-STR-01` continua dependente da identidade canônica do `User`;
- o nome oficial das pessoas deve ter `User` como fonte canônica;
- comissão e composição não devem manter segunda fonte independente de nome para a mesma pessoa;
- os problemas operacionais do Prisma em Windows e do bootstrap do backend ganharam visibilidade maior, mas não substituem a prioridade estrutural da frente de domínio já em andamento.