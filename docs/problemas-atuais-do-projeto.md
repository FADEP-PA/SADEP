# Problemas atuais do projeto AEP-PA

**Atualizado em:** 28/04/2026
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
- registrar o panorama amplo dos problemas do projeto;
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
- `npm run backend:bootstrap` com `JWT_SECRET` e `DEV_SEED_PASSWORD` configurados → passou
- validação negativa sem `DEV_SEED_PASSWORD` no seed → falhou corretamente com mensagem clara
- validação negativa sem `JWT_SECRET` no start dev → falhou corretamente com mensagem clara
- validação negativa com `JWT_SECRET` curto → falhou corretamente por mínimo de 32 caracteres
- validação negativa do seed com `NODE_ENV=production` → falhou corretamente com mensagem clara
- `git grep` confirmou ausência das credenciais antigas versionadas do seed e dos segredos antigos de teste
- `node -e "require('@aep-pa/contracts')"` → passou
- `npm run backend:start:prod` → passou
- healthcheck no runtime compilado do backend → respondeu `200`
- `npx tsc --noEmit -p tsconfig.json` em `apps/frontend` → passou
- `npm run build --workspace @aep-pa/frontend` → passou
- `npm run typecheck --workspace @aep-pa/frontend` → passou
- `npm run frontend:build` → passou
- `npm run frontend:typecheck` → passou
- `npm run frontend:clean` → passou
- `npm run frontend:check` → passou
- configuração explícita de `outputFileTracingRoot` no Next.js → removeu o aviso de raiz inferida por lockfiles externos no build
- upgrade controlado do Next.js no frontend de `15.3.0` para `15.5.15` → build passou
- `npm audit` após upgrade do Next.js → removeu a vulnerabilidade crítica associada ao Next.js; permanecem vulnerabilidades altas e moderadas em outras dependências/transitivas
- `git diff --check` → passou

## Conclusão técnica desta rodada

- a `BE-IDENT-01` foi aprovada e removeu a dependência estrutural de identidade canônica antes da `BE-STR-01`;
- `User.name` foi introduzido e alinhado por auth, sessão e UI;
- a `BE-STR-01` foi aprovada e concluiu a modelagem de signatários esperados do parecer CESAD;
- o bloqueio estrutural do snapshot de signatários do parecer foi removido;
- o bootstrap determinístico local do backend foi aprovado e passou a ter fluxo oficial via `npm run backend:bootstrap`;
- a `BE-OPS-02` foi aprovada e mitigou a instabilidade do `prisma generate` em ambiente Windows com guarda operacional específica;
- a `BE-OPS-04` foi aprovada e consolidou o fluxo explícito de build/start de produção do backend;
- a `BE-OPS-01` foi aprovada e removeu credenciais previsíveis de desenvolvimento;
- o hardening mínimo de `JWT_SECRET` foi aplicado: segredo obrigatório, sem fallback fraco e com mínimo de 32 caracteres;
- o seed local passou a depender de `DEV_SEED_PASSWORD`, preservando usuários/e-mails/roles previsíveis para desenvolvimento;
- o seed de desenvolvimento passou a ser bloqueado em `NODE_ENV=production`;
- `.env.example` e documentação local foram atualizados para orientar o novo fluxo de bootstrap e login manual;
- o frontend compila e teve as FT-01 a FT-15 do roadmap operacional atualizadas como concluídas no código atual;
- o frontend passou a usar `next@15.5.15`, removendo a vulnerabilidade crítica anteriormente associada ao `next@15.3.0`;
- o frontend passou a ter script explícito de typecheck no workspace e atalhos raiz `frontend:build` e `frontend:typecheck`;
- o frontend passou a ter comando operacional `frontend:clean` para limpar artefatos locais do Next e comando `frontend:check` para validar typecheck + build;
- o build do frontend passou a ter raiz de tracing explícita no monorepo, evitando o aviso de inferência incorreta por lockfiles externos;
- a rota administrativa deixou de usar o placeholder genérico e passou a ter painel próprio de apoio, ainda sem backend administrativo dedicado;
- a rota de homologação deixou de usar o placeholder genérico e passou a ter painel próprio de conferência, ainda sem backend decisório dedicado;
- as próximas lacunas prioritárias do frontend são validação visual em navegador, investigação da instabilidade histórica do dev server, gates de qualidade e preparação das áreas ainda dependentes de API;
- a `ALIGN-05` foi aprovada e saneou a principal lacuna de API do workspace do servidor, criando um snapshot operacional role-scoped;
- ainda podem restar lacunas em outras frentes, especialmente administração e homologação;
- a próxima candidata recomendada no roadmap backend é a `BE-ARCH-01`, começando por diagnóstico/varredura arquitetural e não por implementação direta, sem reabrir bootstrap, produção, domínio CESAD ou Prisma config.

---

# Frentes ativas e dependências estruturais

## Próxima frente backend recomendada para diagnóstico
**BE-ARCH-01 — Revisar estratégia de autenticação web**

### Motivo
A frente operacional de remoção de credenciais previsíveis foi concluída pela `BE-OPS-01`. A próxima candidata do roadmap é arquitetural e sensível: revisar a estratégia de autenticação web.

### Situação atual
Hoje o sistema:
- já possui identidade canônica e snapshot de signatários esperados do parecer CESAD resolvidos;
- já possui bootstrap local oficial do backend via `npm run backend:bootstrap`;
- já possui preflight guiado de banco via `db:check`;
- já possui guarda operacional antes de `prisma generate` em ambiente Windows;
- já possui fluxo explícito de build e start de produção do backend via `npm run backend:build` e `npm run backend:start:prod`;
- já validou o runtime compilado com Node e healthcheck `200`;
- já removeu credenciais previsíveis de desenvolvimento pela `BE-OPS-01`;
- ainda mantém problemas técnicos de Prisma/migrations fora do escopo já aprovado da `BE-OPS-03`.

### Consequência
Antes de qualquer implementação da `BE-ARCH-01`, a próxima ação recomendada é uma varredura/diagnóstico arquitetural. A revisão ampla de autenticação web permanece aberta e não foi resolvida pela `BE-OPS-01`.

---

## Frente de alinhamento backend/frontend concluída
**ALIGN-05 — Expor snapshot operacional do servidor e flags de autoavaliação**

### Motivo
O frontend dependia de heurísticas locais para montar snapshot do processo, deduzir etapa atual, permissões, mensagens e estados documentais a partir de contratos públicos finos demais.

### Situação atual
Hoje o sistema:
- já possui snapshot maduro da leitura CESAD;
- já possui flags relevantes da avaliação da chefia no backend;
- já possui snapshot operacional role-scoped do servidor via `GET /processes/:id/intern-workspace`;
- já possui contrato compartilhado `InternServerWorkspaceSnapshotRef`;
- o workspace do servidor passou a consumir o snapshot backend e deixou de depender das heurísticas críticas mais relevantes.

### Consequência
Essa frente saneou parcialmente a lacuna de API no eixo do workspace do servidor, sem reabrir domínio CESAD, bootstrap, produção ou outras frentes já aprovadas. As lacunas de administração, homologação e outras jornadas ainda permanecem no painel transversal.

### Regra de negócio consolidada
Quanto à leitura do parecer CESAD pelo servidor:

- **etapas 1, 2 e 3**: o servidor poderá visualizar o parecer CESAD após sua **conclusão** e **assinatura integral**;
- **etapa 4**: o servidor somente poderá visualizar o parecer CESAD após sua **conclusão**, **assinatura integral** e **notificação formal**.

Essa regra foi implementada no backend no bloco `cesadOpinionAccess` do snapshot do servidor e depende da existência de `ProcessDocument` formal do tipo `CESAD_OPINION` assinado integralmente.

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

## Credenciais previsíveis de desenvolvimento foram resolvidas

### Descrição
A frente de credenciais previsíveis de desenvolvimento foi saneada pela `BE-OPS-01`, preservando a experiência local de desenvolvimento sem manter senhas fixas versionadas.

### Evidências
- senhas hardcoded dos usuários seed foram removidas;
- usuários, e-mails e roles seed foram preservados para testes locais;
- todos os usuários seed locais passaram a usar a senha definida em `DEV_SEED_PASSWORD`;
- o seed passou a exigir `DEV_SEED_PASSWORD`;
- o seed passou a bloquear execução em `NODE_ENV=production`;
- `JWT_SECRET` passou a ser obrigatório e com mínimo de 32 caracteres;
- o fallback fraco de `JWT_SECRET` foi removido;
- `.env.example` e documentação local foram atualizados com placeholders seguros e orientação de bootstrap;
- testes foram ajustados para segredos de 32+ caracteres;
- `git grep` confirmou ausência das credenciais antigas versionadas e dos segredos antigos de teste.

### Impacto
- remove práticas inseguras normalizadas no fluxo local;
- mantém usuários seed úteis para login manual com senha local definida pelo dev;
- conclui o hardening operacional de credenciais previsíveis sem resolver a estratégia ampla de autenticação web.

### Status no tracker
- corresponde à task **`BE-OPS-01 — Remover credenciais previsíveis de desenvolvimento`**, agora aprovada e concluída no `backend-implementation-tracker.md`

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
- após upgrade do frontend para `next@15.5.15`, a vulnerabilidade crítica do Next.js deixou de aparecer no `npm audit`; permanecem vulnerabilidades altas e moderadas, especialmente em NestJS, Prisma e dependências transitivas

### Impacto
- risco de segurança ainda não qualificado
- possibilidade de impacto direto em runtime ou cadeia de build

### Status no tracker
- permanece como problema transversal relevante
- ainda não foi convertido em task backend específica com ID próprio
- parcialmente mitigado no frontend pelo upgrade do Next.js, sem resolver o conjunto completo de dependências vulneráveis

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

## 7. Frontend ainda depende de lacunas de API em áreas específicas

### Descrição
Algumas áreas do frontend ainda usam mensagens de espera e comportamento de contorno porque a API não expõe todos os dados necessários para funcionalidade completa. A principal lacuna do workspace do servidor foi saneada pela `ALIGN-05`, e a leitura consolidada CESAD está madura. As lacunas restantes se concentram principalmente em administração, homologação e no futuro fluxo de parecer CESAD editável.

### Impacto
- uso de estados de apoio no cliente enquanto contratos dedicados não existem
- maior risco de inconsistências entre regra de negócio e interface
- bloqueio parcial para evolução de áreas ainda sem contrato suficiente, especialmente administração e homologação

### Status no tracker
- parcialmente saneado pela task **`ALIGN-05 — Expor snapshot operacional do servidor e flags de autoavaliação`**

### Observação importante
A dor principal do workspace do servidor foi resolvida com snapshot operacional backend, flags derivadas no servidor e regra de leitura do parecer CESAD por etapa. A leitura consolidada CESAD segue madura e não foi reaberta.

---

## 8. Rotas administrativas ainda não têm funcionalidade real completa

### Descrição
As áreas de administração e homologação já deixaram o placeholder genérico, mas ainda não possuem backend dedicado para entregar funcionalidade equivalente ao restante do fluxo.

### Impacto
- painéis de administração e homologação ainda limitados a apoio, atalhos e leitura da sessão
- ações reais de gestão administrativa e decisão homologatória seguem dependentes de contratos backend
- diferença parcial entre navegação exposta e funcionalidade real disponível

### Status no tracker
- hoje não está no roadmap backend como task específica
- permanece como backlog transversal do projeto
- parcialmente mitigado no frontend pela substituição dos placeholders genéricos das rotas `/admin` e `/homologacao-autoridade`
- no roadmap frontend, a preparação visual de homologação está registrada como FT-17

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
O workspace raiz ainda não tem scripts agregadores completos de `build`, `test`, `lint` e `typecheck`. O frontend passou a definir script de `typecheck`, mas ainda não define scripts de teste ou lint.

### Impacto
- CI/CD mais manual
- ausência de gate único completo de qualidade para o repositório
- build e checagem de tipos do frontend já podem ser executados de forma padronizada pela raiz

### Status no tracker
- ainda não foi convertido em task backend explícita
- permanece como problema transversal relevante, parcialmente mitigado no eixo de typecheck do frontend

---

## 11. Pacotes compartilhados ainda estão subestruturados

### Descrição
`packages/config` ainda não entrega configuração compartilhada real, e `packages/contracts` expõe arquivos de `src` diretamente, sem build plenamente amadurecido.

### Impacto
- baixo nível de maturidade da camada compartilhada
- maior acoplamento entre apps e estrutura interna dos pacotes
- o ajuste mínimo de runtime em `contracts` resolveu produção do backend, mas não elimina a necessidade de amadurecimento do pacote

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

## 13. Instabilidade observada no frontend em modo dev foi mitigada operacionalmente

### Descrição
O `build` do frontend passou, mas o log de desenvolvimento registra falhas de hot reload, carga de chunks e respostas `500`/`404` em assets do Next.
O aviso de build sobre raiz inferida incorretamente por lockfiles externos foi mitigado com `outputFileTracingRoot` explícito.
Também foi adicionado um comando seguro de limpeza dos artefatos locais do frontend para reduzir falso positivo causado por cache ou chunks corrompidos.

### Impacto
- perda de produtividade em desenvolvimento
- maior ocorrência de falso positivo de regressão visual ou de runtime

### Status no tracker
- mitigado operacionalmente no frontend
- ainda não convertido em task backend
- parcialmente mitigado no eixo de build do frontend e no procedimento de limpeza local
- no roadmap frontend, a investigação operacional foi registrada como FT-22 e concluída no escopo frontend

---

# Checklist de correção recomendado

## Ordem recomendada transversal

1. Introduzir nome canônico no `User`
2. Modelar signatários esperados do parecer CESAD
3. Remover fragilidade operacional do Prisma no Windows
4. Definir build/start de produção do backend
5. Remover credenciais previsíveis de desenvolvimento
6. Expor snapshot operacional do servidor e flags de autoavaliação
7. Limpar passivos de segurança e configuração
8. Reduzir lacunas entre API e frontend
9. Validar visualmente fluxos principais do frontend
10. Consolidar arquitetura de monorepo e produção

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

- [x] `{BACK}` **BE-OPS-01** — Remover credenciais previsíveis de desenvolvimento
  - Como foi corrigido:
    - senhas hardcoded foram removidas do seed;
    - `DEV_SEED_PASSWORD` passou a ser obrigatório para seed local;
    - usuários seed foram preservados com e-mails previsíveis;
    - seed foi bloqueado em produção;
    - `JWT_SECRET` passou a ser obrigatório e com mínimo de 32 caracteres;
    - fallback fraco de `JWT_SECRET` foi removido;
    - documentação e `.env.example` foram atualizados;
    - testes foram ajustados para segredos de 32+ caracteres.

## Backend | Frontend

- [x] `{BACK|FRONT}` **ALIGN-05** — Expor snapshot operacional do servidor e flags de autoavaliação
  - Como corrigir:
    - endpoint `GET /processes/:id/intern-workspace` criado;
    - contrato compartilhado `InternServerWorkspaceSnapshotRef` criado;
    - etapa atual, autoavaliação, contexto documental e flags operacionais passaram a vir do backend;
    - frontend do servidor passou a consumir o snapshot backend;
    - regra de leitura do parecer CESAD pelo servidor aplicada:
      - etapas 1, 2 e 3 após conclusão + assinatura integral
      - etapa 4 após conclusão + assinatura integral + notificação formal

- [ ] `{BACK|FRONT}` Consolidar scripts de qualidade na raiz do monorepo
  - Como corrigir:
    - adicionar scripts agregadores de `build`, `test`, `typecheck` e `lint`;
    - preparar execução padronizada em CI.
  - Progresso parcial:
    - `apps/frontend` passou a expor `npm run typecheck --workspace @aep-pa/frontend`;
    - a raiz passou a expor `npm run frontend:build`;
    - a raiz passou a expor `npm run frontend:typecheck`;
    - a raiz passou a expor `npm run frontend:check`, validando typecheck + build do frontend;
    - ainda faltam agregadores completos de `build`, `test`, `lint` e `typecheck` para todo o monorepo.

## Frontend

- [x] `{FRONT}` Atualizar Next.js para versão corrigida
  - Como foi corrigido:
    - `next` foi atualizado de `15.3.0` para `15.5.15`;
    - `package-lock.json` foi atualizado;
    - `next-env.d.ts` recebeu a referência gerada pelo Next 15.5 para tipos de rotas;
    - `outputFileTracingRoot` foi configurado para a raiz do monorepo em `next.config.ts`;
    - `npm run build --workspace @aep-pa/frontend` passou;
    - a vulnerabilidade crítica associada ao Next.js deixou de aparecer no `npm audit`.

- [ ] `{FRONT}` Remover dependências de heurística no cliente onde a API já puder atender
- [ ] `{FRONT}` Preparar administração e homologação para funcionalidade completa
  - Progresso parcial:
    - rota `/admin` deixou de usar `RolePlaceholderPage` e passou a ter painel administrativo próprio;
    - rota `/homologacao-autoridade` deixou de usar `RolePlaceholderPage` e passou a ter painel próprio de conferência;
    - funcionalidades reais de gestão administrativa e homologação ainda dependem de APIs dedicadas.

- [ ] `{FRONT}` Validar visualmente os fluxos principais com backend local
  - Como corrigir:
    - abrir as principais rotas autenticadas em navegador;
    - validar login, navegação, carregamento de dados e mensagens de erro;
    - registrar quebras visuais, erros de console e falhas de rede;
    - usar dados locais de seed ou processo técnico configurado.
  - Referência no roadmap frontend:
    - FT-21.

- [x] `{FRONT}` Investigar instabilidade do frontend em modo dev
  - Como foi corrigido:
    - criado comando `npm run frontend:clean` para limpar `.next` e `tsconfig.tsbuildinfo`;
    - documentado procedimento de limpeza em `docs/local-setup.md`;
    - validado fluxo `frontend:clean` seguido de `frontend:check`.
  - Referência no roadmap frontend:
    - FT-22.

- [x] `{FRONT}` Consolidar gates de qualidade do frontend
  - Como foi corrigido:
    - criado script `check` no workspace do frontend;
    - criado atalho raiz `npm run frontend:check`;
    - documentado comando mínimo de validação do frontend.
  - Referência no roadmap frontend:
    - FT-23.

- [ ] `{FRONT}` Triar vulnerabilidades e dependências que afetam o frontend
  - Como corrigir:
    - classificar achados de `npm audit` entre frontend, backend, dev-only e transitivos;
    - evitar downgrade ou `audit fix --force` sem análise;
    - registrar recomendação objetiva de upgrade ou aceite temporário de risco.
  - Referência no roadmap frontend:
    - FT-25.

- [ ] `{FRONT}` Limpar scaffolds e placeholders legados do frontend
  - Como corrigir:
    - verificar se componentes antigos de placeholder ainda são usados;
    - remover apenas código morto confirmado;
    - manter documentação clara quando algum scaffold permanecer intencional.
  - Referência no roadmap frontend:
    - FT-26.

---

# Observações finais

- o documento transversal não altera automaticamente a task ativa do backend;
- após a conclusão da `BE-OPS-01`, não há task ativa formal sem confirmação humana no tracker backend;
- a dependência estrutural de identidade canônica do `User` já foi removida pela conclusão da `BE-IDENT-01`;
- a modelagem de signatários esperados do parecer CESAD já foi resolvida pela conclusão da `BE-STR-01`;
- o nome oficial das pessoas deve ter `User` como fonte canônica;
- comissão e composição não devem manter segunda fonte independente de nome para a mesma pessoa;
- o bootstrap determinístico local do backend foi resolvido pela `BE-OPS-03`;
- o problema operacional do `prisma generate` em Windows foi mitigado pela `BE-OPS-02`;
- o fluxo explícito de build/start de produção do backend foi resolvido pela `BE-OPS-04`;
- a `BE-OPS-01` resolveu o hardening operacional de credenciais previsíveis de desenvolvimento;
- a próxima candidata recomendada é a `BE-ARCH-01`, começando por diagnóstico/varredura arquitetural e dependendo de confirmação humana antes de implementação;
- a `ALIGN-05` saneou a principal heurística do workspace do servidor sem reabrir blocos já aprovados;
- permanecem abertas lacunas em frentes como administração, homologação, dependências, Prisma config, autenticação web ampla e arquitetura/segurança mapeadas.
