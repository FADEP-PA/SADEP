# SADEP

Sistema de Avaliação de Desempenho de Estágio Probatório do Estado do Pará.

## Branch de referência

Este repositório deve ser utilizado na branch `develop`.

## Instalação e execução local

O guia completo de instalação, preparação do banco local, credenciais de desenvolvimento e execução de backend e frontend está disponível em:

- [docs/setup/local-setup.md](docs/setup/local-setup.md)
- [Guia de instalação e execução local](docs/setup/local-setup.md)

## Resumo rápido

### 1. Instalar dependências

```powershell
npm install
```

### 2. Preparar o backend

```powershell
Copy-Item apps\backend\.env.example apps\backend\.env
npm run backend:bootstrap
```

Antes de executar o bootstrap, edite `apps\backend\.env` e defina os valores locais obrigatorios:

```env
JWT_SECRET=sadep-local-jwt-secret-com-mais-de-32-caracteres-2026
DEV_SEED_PASSWORD=AepLocalDev@2026#Teste
```

`JWT_SECRET` deve ser explicito e ter pelo menos 32 caracteres. `DEV_SEED_PASSWORD` e a senha local usada pelo seed de desenvolvimento.

O bootstrap local executa, nesta ordem: `prisma generate`, preparação mínima de compatibilidade do SQLite local, `prisma db push --schema prisma/schema.prisma --skip-generate`, seed de desenvolvimento e checagem mínima do banco. O fluxo local atual usa `db push` de forma explícita por compatibilidade com o estado atual das migrations do repositório.

A configuração Prisma do backend agora fica em `apps/backend/prisma.config.ts`. O seed configurado no Prisma aponta para `prisma/seed.ts`, enquanto `DATABASE_URL` continua no `schema.prisma` nesta etapa.

No Windows, o `prisma generate` possui uma guarda operacional que bloqueia a execução quando detecta processos Node relacionados ao backend, testes ou Prisma que possam estar segurando `query_engine-windows.dll.node`. Feche esses processos antes de rodar o bootstrap; se o erro `EPERM` persistir sem processos relacionados, verifique OneDrive, antivírus ou indexação.

### 3. Subir os serviços

Backend em desenvolvimento:

```powershell
npm run backend:start:dev
```

Frontend:

```powershell
npm run frontend:start:dev
```

### 4. Acessos locais

- Frontend: `http://localhost:5000`
- Backend healthcheck: `http://localhost:3000/health`

### 5. Credenciais de desenvolvimento

Os usuarios seed continuam disponiveis com e-mails previsiveis para testes locais. A senha de todos eles e o valor configurado em `DEV_SEED_PASSWORD`; nao ha mais senha fixa versionada.

| Perfil | E-mail | Senha |
| --- | --- | --- |
| Admin | `admin@sadep.local` | valor de `DEV_SEED_PASSWORD` |
| Chefia | `supervisor@sadep.local` | valor de `DEV_SEED_PASSWORD` |
| CESAD | `cesad@sadep.local` | valor de `DEV_SEED_PASSWORD` |
| Assistente da Comissao | `assistant@sadep.local` | valor de `DEV_SEED_PASSWORD` |
| Autoridade Homologadora | `authority@sadep.local` | valor de `DEV_SEED_PASSWORD` |
| Servidor | `server@sadep.local` | valor de `DEV_SEED_PASSWORD` |

## Build e start de produção do backend

O fluxo oficial de produção do backend usa JavaScript compilado e Node, sem `ts-node` no caminho de runtime:

```powershell
npm run backend:build
npm run backend:start:prod
```

O comando de build compila os contratos compartilhados mínimos necessários ao runtime, executa `prisma generate` e compila o backend com `tsc -p tsconfig.app.json`. O start de produção executa apenas o artefato compilado; ele não roda bootstrap local, seed, `db push`, `db:check` ou `prisma generate`.

O bootstrap local permanece exclusivo do fluxo de desenvolvimento.
