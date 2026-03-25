# AEP-PA

Sistema de Avaliação de Estágio Probatório do Estado do Pará.

## Branch de referência

Este repositório deve ser utilizado na branch `develop`.

## Instalação e execução local

O guia completo de instalação, preparação do banco local, credenciais de desenvolvimento e execução de backend e frontend está disponível em:

- [docs/local-setup.md](C:\Users\SEDUC\Documents\GitHub\AEP-PA\docs\local-setup.md)
- [Guia de instalação e execução local](docs/local-setup.md)

## Resumo rápido

### 1. Instalar dependências

```powershell
npm install
```

### 2. Preparar o backend

```powershell
Copy-Item apps\backend\.env.example apps\backend\.env
npm run prisma:generate --workspace @aep-pa/backend
cd apps\backend
npx prisma db push --schema prisma/schema.prisma
cd ..\..
npm run prisma:seed --workspace @aep-pa/backend
```

### 3. Subir os serviços

Backend:

```powershell
npm run backend:start:dev
```

Frontend:

```powershell
npm run frontend:start:dev
```

### 4. Acessos locais

- Frontend: `http://localhost:3001`
- Backend healthcheck: `http://localhost:3000/health`

### 5. Credencial administrativa de desenvolvimento

- `admin@aep-pa.local`
- `Admin123!`
