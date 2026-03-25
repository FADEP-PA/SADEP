# Instalação e Execução Local

Este documento descreve o fluxo padrão para instalar, preparar e executar o AEP-PA localmente na branch `develop`.

## Pré-requisitos

- Node.js instalado
- npm disponível no terminal
- Windows PowerShell ou terminal equivalente

## Branch de trabalho

Confirme que o repositório está na branch `develop`:

```powershell
git status
```

## Instalação de dependências

Na raiz do monorepo:

```powershell
npm install
```

## Preparação do backend

### 1. Criar o arquivo de ambiente

```powershell
Copy-Item apps\backend\.env.example apps\backend\.env
```

### 2. Gerar o Prisma Client

```powershell
npm run prisma:generate --workspace @aep-pa/backend
```

### 3. Sincronizar o banco SQLite local

Execute a partir da pasta do backend:

```powershell
cd apps\backend
npx prisma db push --schema prisma/schema.prisma
cd ..\..
```

### 4. Popular usuários de desenvolvimento

```powershell
npm run prisma:seed --workspace @aep-pa/backend
```

## Credenciais locais padrão

Após o seed, os usuários abaixo ficam disponíveis:

- `admin@aep-pa.local` / `Admin123!`
- `supervisor@aep-pa.local` / `Supervisor123!`
- `cesad@aep-pa.local` / `Cesad123!`
- `authority@aep-pa.local` / `Authority123!`
- `server@aep-pa.local` / `Server123!`

## Execução do backend

```powershell
npm run backend:start:dev
```

Backend esperado:

- URL: `http://localhost:3000`
- Healthcheck: `http://localhost:3000/health`

## Execução do frontend

Em outro terminal:

```powershell
npm run frontend:start:dev
```

Frontend esperado:

- URL: `http://localhost:3001`

## Ordem recomendada

1. Subir o backend
2. Confirmar `http://localhost:3000/health`
3. Subir o frontend
4. Acessar `http://localhost:3001`

## Problemas comuns

### Porta 3000 ou 3001 já em uso

Se aparecer `EADDRINUSE`, identifique o processo:

```powershell
netstat -ano | findstr :3000
netstat -ano | findstr :3001
```

Depois encerre o PID correspondente:

```powershell
Stop-Process -Id <PID> -Force
```

### Login falhando com `Invalid credentials`

Isso normalmente indica que o banco local ainda não recebeu o seed.

Execute novamente:

```powershell
npm run prisma:seed --workspace @aep-pa/backend
```

### Frontend com erro relacionado a `.next`

Se houver erro de build inconsistente, limpe os artefatos do frontend:

```powershell
Remove-Item apps\frontend\.next -Recurse -Force
```

Depois suba o frontend novamente:

```powershell
npm run frontend:start:dev
```

## Verificação rápida

Checklist mínimo para validar o ambiente:

- `npm install` executado com sucesso
- `apps/backend/.env` criado
- Prisma Client gerado
- banco sincronizado com `db push`
- seed executado
- backend respondendo em `3000`
- frontend respondendo em `3001`
- login funcionando com `admin@aep-pa.local`

## Observação operacional

O arquivo `apps/frontend/next-env.d.ts` pode mudar automaticamente durante builds do Next.js. Em geral, ele não deve ser tratado como mudança funcional do projeto.
