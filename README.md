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
npm run backend:bootstrap
```

O bootstrap local executa, nesta ordem: `prisma generate`, preparação mínima de compatibilidade do SQLite local, `prisma db push --schema prisma/schema.prisma --skip-generate`, seed de desenvolvimento e checagem mínima do banco. O fluxo local atual usa `db push` de forma explícita por compatibilidade com o estado atual das migrations do repositório.

No Windows, o `prisma generate` possui uma guarda operacional que bloqueia a execução quando detecta processos Node relacionados ao backend, testes ou Prisma que possam estar segurando `query_engine-windows.dll.node`. Feche esses processos antes de rodar o bootstrap; se o erro `EPERM` persistir sem processos relacionados, verifique OneDrive, antivírus ou indexação.

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
