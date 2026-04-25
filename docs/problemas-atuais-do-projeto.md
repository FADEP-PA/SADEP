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

- `npx prisma validate --schema prisma/schema.prisma` → passou
- `npm run prisma:generate --workspace @aep-pa/backend` → passou
- `npm run backend:bootstrap` → passou
- validação negativa do guard do `prisma generate` no Windows com processo Node relacionado ao backend → bloqueou com exit code 1 e mensagem guiada
- validação controlada da migration nova sobre esquema legado mínimo do `User` → passou
- `npm run typecheck --workspace @aep-pa/backend` → passou
- `npm run test --workspace @aep-pa/backend` → passou
- `npm run test:unit --workspace @aep-pa/backend` → passou
- `npm run typecheck:spec --workspace @aep-pa/backend` → passou
- validação dos contracts compartilhados → passou
- `npm run backend:build` → passou
- `node -e "require('@aep-pa/contracts')"` → passou
- `npm run backend:start:prod` → passou
- healthcheck no runtime compilado do backend → respondeu `200`
- `npx tsc --noEmit -p tsconfig.json` em `apps/frontend` → passou
- `npm run build --workspace @aep-pa/frontend` → passou
- `git diff --check` → passou

## Conclusão técnica desta rodada

- a `BE-IDENT-01` foi aprovada e removeu a dependência estrutural de identidade canônica antes da `BE-STR-01`;
- `User.name` foi introduzido e alinhado por auth, sessão e UI;
- a `BE-STR-01` foi aprovada e concluiu a modelagem de signatários esperados do parecer CESAD;
- o bloqueio estrutural do snapshot de signatários do parecer foi removido;
- o bootstrap determinístico local do backend foi aprovado e passou a ter fluxo oficial via `npm run backend:bootstrap`;
- a `BE-OPS-02` foi aprovada e mitigou a instabilidade do `prisma generate` em ambiente Windows com guarda operacional específica;
- a `BE-OPS-04` foi aprovada e consolidou o fluxo explícito de build/start de produção do backend;
- o principal problema operacional atual no backend passa a se concentrar na remoção de credenciais previsíveis de desenvolvimento e nas demais frentes técnicas ainda abertas;
- o frontend compila, mas continua com lacunas funcionais e áreas placeholder;
- o roadmap backend segue corretamente com a task ativa `BE-OPS-01`, agora com foco em remover credenciais previsíveis de desenvolvimento.  

---

# Frentes ativas e dependências estruturais

## Frente ativa do backend
**BE-OPS-01 — Remover credenciais previsíveis de desenvolvimento**

### Motivo
A próxima frente do backend permanece operacional: remover credenciais previsíveis de desenvolvimento depois da consolidação do bootstrap local, da guarda do `prisma generate` no Windows e do fluxo explícito de build/start de produção.

### Situação atual
Hoje o sistema:
- já possui identidade canônica e snapshot de signatários esperados do parecer CESAD resolvidos;
- já possui bootstrap local oficial do backend via `npm run backend:bootstrap`;
- já possui preflight guiado de banco via `db:check`;
- já possui guarda operacional antes de `prisma generate` em ambiente Windows;
- já possui fluxo explícito de build e start de produção do backend via `npm run backend:build` e `npm run backend:start:prod`;
- já validou o runtime compilado com Node e healthcheck `200`;
- ainda possui credenciais previsíveis de desenvolvimento a revisar;
- ainda mantém problemas técnicos de Prisma/migrations fora do escopo já aprovado da `BE-OPS-03`.

### Consequência
O próximo foco backend deve ser a `BE-OPS-01`, sem reabrir o bootstrap já aprovado, a mitigação operacional do `prisma generate` no Windows ou o fluxo de build/start de produção já aprovado.

---

# Problemas recentemente resolvidos

## Nome canônico no `User` foi resolvido e retirado da frente crítica

### Descrição
O problema estrutural de identidade canônica foi resolvido nesta rodada. `User.name` foi introduzido como campo obrigatório e passou a sustentar a exibição institucional do nome da pessoa.

### Evidências
- `User.name` foi introduzido e propagado por persistência, seed, auth, JWT, `/auth/me`, sessão e frontend;
- os principais pontos que derivavam nome do email passaram a usar a fonte canônica do `User`;
- `CesadCommissionMember` continuou sem duplicação de nome e a leitura da comissão vigente passou a expor `user.name`.

### Impacto
- a dependência estrutural para a `BE-STR-01` foi removida;
- o snapshot futuro do parecer já poderá congelar `nameSnapshot` com base canônica;
- a revisão mais ampla do fluxo de migrations/Prisma continua fora do escopo desta task e permanece nas frentes técnicas já mapeadas.

### Status no tracker
- corresponde à task **`BE-IDENT-01`**, agora aprovada e concluída no `backend-implementation-tracker.md`

---

## Modelagem de signatários esperados do parecer CESAD foi resolvida

### Descrição
A modelagem de signatários esperados foi concluída. O parecer CESAD da etapa passou a ter um snapshot persistido próprio, vinculado a `CesadStageOpinion`, separado da composição formal da comissão e da assinatura efetiva.

### Evidências
- os signatários esperados passaram a existir em `CesadStageOpinionExpectedSigner`;
- o freeze ocorre no fluxo operacional de `ISSUE_CESAD_OPINION`;
- a derivação usa a comissão vigente e inclui apenas titulares vigentes por padrão;
- `SUPLENTE` permanece fora por padrão e `COMMISSION_ASSISTANT` não entra como signatário;
- `User.name` é congelado em `nameSnapshot` e `User.email` em `emailSnapshot`;
- o snapshot passou a ser exposto no `consolidated-read` da etapa.

### Impacto
- o bloqueio estrutural de snapshot do parecer CESAD foi removido;
- o documento formal futuro poderá consumir o snapshot sem recalcular signatários;
- a substituição explícita por suplente ficou apenas preparada no modelo, sem fluxo operacional completo nesta task.

### Status no tracker
- corresponde à task **`BE-STR-01`**, agora aprovada e concluída no `backend-implementation-tracker.md`

---

## Bootstrap determinístico local do backend foi resolvido

### Descrição
O backend deixou de depender de preparo manual implícito do banco para o fluxo local padrão. Foi formalizado o comando oficial `npm run backend:bootstrap`.

### Evidências
- o fluxo local oficial passou a encadear `prisma generate`, `db:prepare:local`, `prisma db push --schema prisma/schema.prisma --skip-generate`, `prisma:seed` e `db:check`;
- o preflight `db:check` valida acesso à tabela `User` e presença mínima do seed;
- a documentação local passou a substituir o fluxo manual anterior pelo bootstrap oficial;
- `migrate dev` deixou de ser tratado como fluxo principal local nesta etapa.

### Impacto
- onboarding local menos frágil;
- redução de erro 500 causado por banco não preparado;
- preparação local do backend ficou reproduzível por comando único;
- `db:prepare:local` ficou restrito à compatibilidade cirúrgica de SQLite local legado, sem substituir a correção futura das migrations históricas.

### Status no tracker
- corresponde à task **`BE-OPS-03`**, agora aprovada e concluída no `backend-implementation-tracker.md`

---

## Geração do Prisma no Windows foi mitigada

### Descrição
A instabilidade do `prisma generate` no Windows foi mitigada com uma guarda operacional antes da geração do Prisma Client. O problema era compatível com lock do engine nativo `query_engine-windows.dll.node` por processos Node relacionados ao backend, testes ou Prisma.

### Evidências
- o fluxo `npm run prisma:generate --workspace @aep-pa/backend` passou a executar guard operacional específico para Windows antes do Prisma;
- quando detecta processos `node.exe` com forte indício de backend, testes ou Prisma, o guard bloqueia cedo e informa PID, command line e orientação para fechar os processos relacionados;
- o guard não encerra processos automaticamente e não remove arquivos temporários `.tmp`;
- `backend:bootstrap` continuou chamando `prisma generate` dentro do fluxo oficial;
- a documentação local passou a explicar o erro `EPERM` e o procedimento seguro no Windows.

### Impacto
- redução de falso positivo de ambiente quebrado por `EPERM` cru;
- orientação operacional mais clara antes da tentativa de overwrite do engine nativo;
- preservação do bootstrap local oficial sem misturar escopo com schema, migrations ou configuração Prisma.

### Status no tracker
- corresponde à task **`BE-OPS-02 — Estabilizar prisma generate no ambiente Windows`**, agora aprovada e concluída no `backend-implementation-tracker.md`

### Observação de validação
- o typecheck padrão do backend não cobre automaticamente scripts operacionais; a validação desta mitigação ficou apoiada no fluxo real de `prisma:generate`, no `backend:bootstrap` e em validação negativa guiada com processo Node relacionado ao backend.

---

## Build e start de produção do backend foram resolvidos

### Descrição
O backend passou a ter fluxo explícito de build compilado e start de produção, separando desenvolvimento, testes e produção.

### Evidências
- `npm run backend:build` compila `@aep-pa/contracts`, executa `prisma generate` e compila o backend com `tsc -p tsconfig.app.json`;
- `npm run backend:start:prod` executa o artefato compilado com Node;
- `start` e `start:prod` passaram a apontar para o runtime compilado, enquanto `start:dev` permaneceu em `ts-node`;
- o runtime compilado foi validado com Node e healthcheck `200`;
- houve ajuste mínimo em `@aep-pa/contracts` para runtime compilado, com build CommonJS em `dist/` e `exports.require` apontando para `dist/index.js`.

### Impacto
- o backend deixou de depender de `ts-node` no caminho principal de produção;
- o fluxo oficial de produção ficou definido por `npm run backend:build` e `npm run backend:start:prod`;
- o ajuste em `@aep-pa/contracts` foi restrito à compatibilidade de runtime; `main` e `types` permanecem apontando para `src/index.ts`, e refinamento mais amplo pode permanecer próximo de `BE-ARCH-02`.

### Status no tracker
- corresponde à task **`BE-OPS-04 — Definir build e start de produção do backend`**, agora aprovada e concluída no `backend-implementation-tracker.md`

---

# Problemas atuais de maior prioridade

## 1. Configuração Prisma depreciada

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

## 2. Vulnerabilidades abertas em dependências

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

## 12. Fluxo explícito de build de produção do backend foi resolvido

### Descrição
O backend agora possui build compilado e start de produção explícitos.

### Evidências
- fluxo oficial definido por `npm run backend:build` e `npm run backend:start:prod`
- runtime compilado validado com Node e healthcheck `200`

### Impacto
- maior previsibilidade para runtime fora do ambiente dev
- separação clara entre `start:dev` com `ts-node` e produção com Node sobre artefato compilado

### Status no tracker
- corresponde à task **`BE-OPS-04 — Definir build e start de produção do backend`**, resolvida

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
3. Remover fragilidade operacional do Prisma no Windows
4. Definir build/start de produção do backend
5. Remover credenciais previsíveis de desenvolvimento
6. Limpar passivos de segurança e configuração
7. Reduzir lacunas entre API e frontend
8. Fechar áreas placeholder
9. Consolidar arquitetura de monorepo e produção

---

# Tarefas mapeadas

## Backend / Domínio

- [x] `{BACK}` **BE-IDENT-01** — Introduzir nome canônico no `User`
  - Como corrigir:
    - adicionar campo `name` ao `User`;
    - ajustar schema, migration, seed e helpers de teste;
    - propagar `name` por login, token, `/auth/me`, sessão e frontend;
    - trocar, quando possível, exibições derivadas de email pela fonte canônica do `User`.

- [x] `{BACK}` **BE-STR-01** — Modelar signatários esperados do parecer CESAD
  - Como corrigir:
    - criar snapshot de signatários esperados ligado ao parecer CESAD específico;
    - congelar snapshot quando o parecer for colocado para assinatura;
    - derivar signatários da composição vigente;
    - usar nome canônico vindo do `User`.

## Backend / Operacional

- [x] `{BACK}` **BE-OPS-03** — Criar bootstrap determinístico do backend
  - Como foi corrigido:
    - adicionou fluxo único para preparo local do backend via `npm run backend:bootstrap`;
    - encadeou `prisma generate`, `db:prepare:local`, `db push --skip-generate`, seed e `db:check`;
    - documentou a ordem de execução;
    - adicionou preflight guiado para evitar boot “cego” com banco ausente ou seed mínimo incompleto.

- [x] `{BACK}` **BE-OPS-02** — Estabilizar `prisma generate` no Windows
  - Como foi corrigido:
    - adicionou guard operacional específico para Windows antes de `prisma generate`;
    - bloqueia cedo quando detecta processos `node.exe` relacionados ao backend, testes ou Prisma;
    - exibe PID, command line e orientação para fechar processos relacionados;
    - preservou `backend:bootstrap` como fluxo oficial com `prisma generate`;
    - documentou o procedimento local seguro sem alterar schema, migrations ou configuração Prisma.

- [x] `{BACK}` **BE-OPS-04** — Definir build e start de produção do backend
  - Como foi corrigido:
    - adicionou fluxo oficial `npm run backend:build` e `npm run backend:start:prod`;
    - separou produção com Node sobre artefato compilado de `start:dev` com `ts-node`;
    - ajustou minimamente `@aep-pa/contracts` para runtime compilado sem redesenhar o pacote compartilhado.

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

- [ ] `{BACK}` **BE-OPS-01** — Remover credenciais previsíveis de desenvolvimento
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
- a task ativa agora é `BE-OPS-01`, conforme o tracker backend;
- a dependência estrutural de identidade canônica do `User` já foi removida pela conclusão da `BE-IDENT-01`;
- a modelagem de signatários esperados do parecer CESAD já foi resolvida pela conclusão da `BE-STR-01`;
- o nome oficial das pessoas deve ter `User` como fonte canônica;
- comissão e composição não devem manter segunda fonte independente de nome para a mesma pessoa;
- o bootstrap determinístico local do backend foi resolvido pela `BE-OPS-03`;
- o problema operacional do `prisma generate` em Windows foi mitigado pela `BE-OPS-02`;
- o fluxo explícito de build/start de produção do backend foi resolvido pela `BE-OPS-04`;
- o próximo foco operacional do backend passa a ser remover credenciais previsíveis de desenvolvimento pela `BE-OPS-01`.
