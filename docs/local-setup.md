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

### 2. Executar o bootstrap determinístico do backend

```powershell
npm run backend:bootstrap
```

Esse é o fluxo oficial de preparo local do backend nesta etapa. Ele executa, em ordem:

- `prisma generate`
- preparação mínima de compatibilidade do SQLite local legado
- `prisma db push --schema prisma/schema.prisma --skip-generate`
- seed de desenvolvimento
- checagem mínima do banco

O projeto usa `db push` como solução operacional local compatível com o estado atual do repositório. `migrate dev` não é o caminho principal local nesta etapa, pois há limitação conhecida em migration histórica no shadow database SQLite.

No Windows, o passo `prisma generate` executa uma guarda operacional antes de gerar o Prisma Client. Se houver processos Node relacionados ao backend, testes ou Prisma em execução, o comando falha cedo e lista os PIDs/command lines relevantes para evitar `EPERM` ao atualizar o engine `query_engine-windows.dll.node`. Feche esses processos e rode o bootstrap novamente.

### 3. Validar o banco local sem repetir todo o bootstrap

Se quiser apenas checar se o banco local está pronto:

```powershell
npm run db:check --workspace @aep-pa/backend
```

## Credenciais locais padrão

Após o seed, os usuários abaixo ficam disponíveis:

- `admin@aep-pa.local` / `Admin123!`
- `supervisor@aep-pa.local` / `Supervisor123!`
- `cesad@aep-pa.local` / `Cesad123!`
- `assistant@aep-pa.local` / `Assistant123!`
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

### `prisma generate` falhando com `EPERM` no Windows

O Prisma pode falhar no Windows ao atualizar `node_modules/.prisma/client/query_engine-windows.dll.node` quando algum processo Node relacionado ao backend, testes ou Prisma ainda está usando o engine nativo.

Antes de executar `npm run backend:bootstrap` ou `npm run prisma:generate --workspace @aep-pa/backend`, feche terminais do backend, testes integrados/unitários e comandos Prisma concorrentes. O guard do projeto lista PIDs e command lines quando detecta risco provável, mas não encerra processos automaticamente.

Para inspecionar manualmente:

```powershell
Get-CimInstance Win32_Process -Filter "name = 'node.exe'" | Select-Object ProcessId,CommandLine
```

Se o erro persistir sem processos Node relacionados, verifique interferência de OneDrive, antivírus ou indexação no diretório do repositório.

### Login falhando com `Invalid credentials`

Isso normalmente indica que o banco local ainda não recebeu o seed, ou que o banco não foi preparado pelo fluxo oficial.

Execute novamente o bootstrap:

```powershell
npm run backend:bootstrap
```

Para validar apenas as precondições mínimas do banco:

```powershell
npm run db:check --workspace @aep-pa/backend
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
- `npm run backend:bootstrap` executado com sucesso
- Prisma Client gerado
- banco sincronizado com `db push`
- seed e `db:check` executados
- backend respondendo em `3000`
- frontend respondendo em `3001`
- login funcionando com `admin@aep-pa.local`

## Observação operacional

O arquivo `apps/frontend/next-env.d.ts` pode mudar automaticamente durante builds do Next.js. Em geral, ele não deve ser tratado como mudança funcional do projeto.
