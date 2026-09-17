# Backend (NestJS)

## Stack

- NestJS 11, TypeScript 5.8, Prisma 6.8
- Banco: **PostgreSQL 17** (dev via Docker, produção via instância dedicada)
- Auth: JWT HS256 + refresh token HMAC-SHA256 com rotação e revogação de família

## Fluxo local de desenvolvimento

### Pré-requisitos

- Node.js 22+
- Docker (para subir o PostgreSQL local)

### 1. Iniciar o banco local

```bash
# Na raiz do monorepo
docker-compose up -d
```

Isso sobe um PostgreSQL 17 em `localhost:5432` com credenciais de desenvolvimento:
- usuário: `sadep`
- senha: `sadep_local_dev`
- banco: `sadep`

### 2. Configurar o ambiente

```bash
cp apps/backend/.env.example apps/backend/.env
```

Preencha os valores obrigatórios em `apps/backend/.env`:

```env
JWT_SECRET=sadep-local-jwt-secret-com-mais-de-32-caracteres-2026
REFRESH_TOKEN_HMAC_SECRET=sadep-local-refresh-secret-com-mais-de-32-caracteres-2026
DEV_SEED_PASSWORD=AepLocalDev@2026#Teste
```

`JWT_SECRET` e `REFRESH_TOKEN_HMAC_SECRET` exigem mínimo de 32 caracteres.
`DEV_SEED_PASSWORD` é a senha usada para todos os usuários do seed de desenvolvimento.

### 3. Bootstrap

```bash
npm run backend:bootstrap
```

Executa em sequência: build de `@sadep/contracts`, `prisma generate`, `prisma migrate deploy` (aplica as migrations no banco), seed e verificação mínima do banco.

### 4. Subir o backend

```bash
npm run backend:start:dev
```

## Banco de dados

### Desenvolvimento local

A `DATABASE_URL` padrão no `.env.example` aponta para o PostgreSQL do docker-compose:

```
DATABASE_URL="postgresql://sadep:sadep_local_dev@localhost:5432/sadep"
```

### Produção

Use uma connection string com usuário dedicado e SSL habilitado:

```
DATABASE_URL="postgresql://sadep_prod:SENHA@host:5432/sadep?sslmode=require"
```

Em produção o Prisma Client é gerado no build e as migrations são aplicadas antes do primeiro start:

```bash
npx prisma migrate deploy --schema apps/backend/prisma/schema.prisma
```

Nunca use `migrate dev` em produção. `migrate deploy` aplica apenas migrations já aprovadas no repositório, sem gerar novas.

### Migrations

As migrations ficam em `apps/backend/prisma/migrations/`. Cada alteração de schema gera uma nova migration via:

```bash
npm run prisma:migrate:dev --workspace @sadep/backend
```

O arquivo gerado deve ser revisado, testado localmente e commitado junto com a alteração do `schema.prisma`.

### Validação do schema

```bash
npx prisma validate --schema apps/backend/prisma/schema.prisma
```

## Estratégia de testes e typecheck

- `npm run test --workspace @sadep/backend` — agregador oficial (integration + unit)
- `npm run test:integration --workspace @sadep/backend` — runner customizado de processos em `src/processes/tests/run.ts`
- `npm run test:unit --workspace @sadep/backend` — Jest (specs unitárias com mocks)
- `npm run typecheck --workspace @sadep/backend` — valida código de aplicação via `tsconfig.app.json`
- `npm run typecheck:spec --workspace @sadep/backend` — valida specs via `tsconfig.spec.json`

Os testes de integração precisam de um banco PostgreSQL rodando com o schema aplicado. O banco do docker-compose serve para isso.

## Build e start de produção

```bash
npm run backend:build
npm run backend:start:prod
```

O build executa o build de `@sadep/contracts`, `prisma generate` e `tsc -p tsconfig.app.json`. O entrypoint compilado fica em `apps/backend/dist/apps/backend/src/main.js`.

`start:prod` não executa bootstrap, seed nem migrate. O banco deve estar preparado antes do start.

## Endpoints técnicos

- `GET /health`
- `POST /auth/login`
- `GET /auth/me`
- `GET /auth/admin-check`

## Windows — geração do Prisma Client

No Windows, o `prisma generate` passa por uma guarda antes de atualizar o Prisma Client. Se houver processos Node relacionados ao backend, testes ou Prisma em execução, o comando lista os PIDs e orienta encerrar esses processos para evitar `EPERM` no `query_engine-windows.dll.node`. Se o erro persistir sem processos relacionados, verifique OneDrive, antivírus ou indexação de arquivos.
