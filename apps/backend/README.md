# Backend (NestJS)

Fundação técnica mínima do backend do AEP-PA para os próximos incrementos.

## Implementado neste incremento

- bootstrap funcional com NestJS
- configuração centralizada mínima via ambiente
- logger básico
- filtro global básico para erros inesperados
- endpoint de healthcheck operacional
- persistência mínima de usuários via Prisma
- autenticação mínima real com senha hasheada e JWT simples
- endpoints técnicos de autenticação e leitura do usuário autenticado

## Limitação de validação

No ambiente auditado anteriormente, a validação de instalação e compilação ficou prejudicada por bloqueio externo ao registry de dependências. A validação operacional final deste incremento deve ser confirmada localmente em ambiente com acesso adequado ao registry.

## Fluxo local de validação

1. instalar dependências:
   - `npm install`
2. preparar ambiente:
   - `cp apps/backend/.env.example apps/backend/.env`
3. preparar banco local e seed de desenvolvimento:
   - `npm run backend:bootstrap`
4. subir o backend:
   - `npm run backend:start:dev`

O bootstrap local executa `prisma generate`, preparação mínima de compatibilidade do SQLite local legado, `prisma db push --schema prisma/schema.prisma --skip-generate`, `prisma:seed` e `db:check`. Nesta etapa, `db push` é o fluxo local oficial por compatibilidade com o estado atual das migrations do repositório; `migrate dev` não deve ser tratado como caminho principal de desenvolvimento local até saneamento posterior da limitação histórica conhecida.

No Windows, o `prisma generate` passa por uma guarda antes de atualizar o Prisma Client. Se houver processos Node relacionados ao backend, testes ou Prisma em execução, o comando bloqueia a geração, lista PIDs/command lines relevantes e orienta fechar esses processos para evitar `EPERM` no `query_engine-windows.dll.node`. A guarda não encerra processos automaticamente e não remove arquivos temporários; se o erro persistir sem processos relacionados, verifique OneDrive, antivírus ou indexação.

Para validar apenas as precondições mínimas do banco local sem subir o Nest:

- `npm run db:check --workspace @aep-pa/backend`

> Observação: para integração local com o frontend em `http://localhost:3001`, o backend agora usa `FRONTEND_ORIGIN` para responder corretamente ao preflight CORS (`OPTIONS`) em endpoints como `/auth/login`.

## Estratégia de testes e typecheck

- `npm run test --workspace @aep-pa/backend` é o agregador oficial e executa a suíte integrada seguida da suíte unitária.
- `npm run test:integration --workspace @aep-pa/backend` executa o runner customizado de processos em `src/processes/tests/run.ts`, usado para cenários funcionais/integrados de workflow, CESAD e avaliações.
- `npm run test:unit --workspace @aep-pa/backend` executa o Jest, usado para specs unitárias e com mocks.
- `npm run typecheck --workspace @aep-pa/backend` valida o código de aplicação pelo `tsconfig.app.json`.
- `npm run typecheck:spec --workspace @aep-pa/backend` valida specs e helpers de teste pelo `tsconfig.spec.json`.

Os aliases `test:runner` e `test:jest` foram preservados por compatibilidade, apontando respectivamente para `test:integration` e `test:unit`.

## Endpoints técnicos para validação

- `GET /health`
- `POST /auth/login`
- `GET /auth/me`
- `GET /auth/admin-check`

## Deliberadamente fora do escopo

- workflow-engine
- domínio processual
- autenticação institucional, SSO ou GOV.BR
- RBAC contextual ou autorização por processo
- banco, Prisma de domínio e migrations de negócio além de identidade e acesso
- documentos, assinaturas, notificações e integrações externas
