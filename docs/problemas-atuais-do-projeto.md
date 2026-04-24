# Problemas atuais do projeto AEP-PA

Atualizado em: 24/04/2026

## Estado atual validado

Validacoes executadas nesta rodada:

- `npm install` -> dependencias ja instaladas
- `npm install` -> `npm audit` reportou `10 vulnerabilities (9 high, 1 critical)`
- `npm run prisma:generate --workspace @aep-pa/backend` -> falhou com `EPERM` ao renomear `query_engine-windows.dll.node`
- `npx prisma db push --schema prisma/schema.prisma` em `apps/backend` -> banco sincronizado; a etapa de generate continuou falhando com `EPERM`
- `npm run prisma:seed --workspace @aep-pa/backend` -> passou
- `npm run typecheck --workspace @aep-pa/backend` -> passou
- `npm run test --workspace @aep-pa/backend` -> passou
- `npm run test:unit --workspace @aep-pa/backend` -> passou
- `npm run typecheck:spec --workspace @aep-pa/backend` -> passou
- `npm run build --workspace @aep-pa/frontend` -> passou

Conclusao tecnica desta rodada:

- o backend esta funcional depois de sincronizacao manual do banco e execucao do seed
- o principal problema operacional atual no backend esta no fluxo de geracao do Prisma no Windows
- o frontend compila, mas continua com lacunas funcionais e areas placeholder

## Problemas atuais de maior prioridade

### 1. Geração do Prisma instável no ambiente Windows

Descricao:

O comando de geracao do client Prisma falha com erro de sistema operacional ao renomear o engine nativo em `node_modules/.prisma/client`. O erro e compativel com lock de arquivo por processo em execucao.

Evidencias:

- `npm run prisma:generate --workspace @aep-pa/backend` falhou com `EPERM`
- `npx prisma db push --schema prisma/schema.prisma` sincronizou o banco, mas a etapa automatica de generate falhou pelo mesmo motivo
- Havia processos `node` ativos executando backend/frontend no momento da tentativa

Impacto:

- setup local nao deterministico
- risco de client Prisma desatualizado em relacao ao schema
- aumento de falso positivo de "backend quebrado" em ambiente de desenvolvimento

### 2. Bootstrap do backend depende de preparo manual do banco

Descricao:

O backend passou em `typecheck` e testes somente apos execucao manual de `db push` e `seed`. Os logs existentes mostram falha anterior em runtime por ausencia de tabelas.

Evidencias:

- [apps/backend/backend-dev-3000.err.log](C:/Users/SEDUC/Documents/GitHub/AEP-PA/apps/backend/backend-dev-3000.err.log)
- mensagem registrada: `The table main.User does not exist in the current database`
- a sequencia minima funcional nesta rodada foi: `db push` -> `seed` -> validacoes

Impacto:

- onboarding local fragil
- risco de erro 500 em runtime quando a base nao foi preparada
- ausencia de bootstrap reproduzivel para equipe e CI

### 3. Configuracao Prisma deprecada

Descricao:

O projeto ainda utiliza configuracao em `package.json#prisma`. O Prisma atual ja emite aviso de deprecacao e indica migracao para `prisma.config.ts`.

Evidencias:

- os testes exibiram aviso deprecado do Prisma para `package.json#prisma`
- [apps/backend/package.json](C:/Users/SEDUC/Documents/GitHub/AEP-PA/apps/backend/package.json)

Impacto:

- debito tecnico de configuracao
- risco de quebra em upgrade futuro para Prisma 7
- ruido recorrente na esteira local

### 4. Vulnerabilidades abertas em dependencias

Descricao:

O `npm install` reportou vulnerabilidades em dependencias do workspace. Nao foi feita ainda a classificacao entre dependencia de runtime, dev-only e transitiva.

Evidencias:

- `npm install` reportou `10 vulnerabilities (9 high, 1 critical)`

Impacto:

- risco de seguranca ainda nao qualificado
- possibilidade de impacto direto em runtime ou cadeia de build

## Riscos altos

### 5. Mecanismo de autenticacao ainda nao esta endurecido para producao

Descricao:

A autenticacao usa token bearer proprio, sem refresh token, sem revogacao e com persistencia de sessao no navegador.

Evidencias:

- [apps/backend/src/auth/auth.service.ts](C:/Users/SEDUC/Documents/GitHub/AEP-PA/apps/backend/src/auth/auth.service.ts)
- [apps/frontend/src/shared/auth/session-storage.ts](C:/Users/SEDUC/Documents/GitHub/AEP-PA/apps/frontend/src/shared/auth/session-storage.ts)

Impacto:

- maior exposicao a problemas de sessao e roubo de token
- baixo controle operacional sobre expiracao e revogacao
- desenho insuficiente para ambiente institucional real

### 6. Frontend ainda depende de lacunas de API

Descricao:

Algumas jornadas do frontend usam mensagens e comportamento de contorno porque a API nao expoe todos os dados necessarios para leitura completa da etapa.

Evidencias:

- [apps/frontend/src/features/process/components/intern-server-workspace.tsx](C:/Users/SEDUC/Documents/GitHub/AEP-PA/apps/frontend/src/features/process/components/intern-server-workspace.tsx)

Impacto:

- uso de heuristica no cliente
- maior risco de inconsistencias entre regra de negocio e interface

### 7. Rotas importantes do frontend ainda estao em placeholder

Descricao:

As areas de administracao e homologacao ainda usam estrutura visual de placeholder, sem entrega funcional equivalente ao restante do fluxo.

Evidencias:

- [apps/frontend/src/features/home/components/role-placeholder-page.tsx](C:/Users/SEDUC/Documents/GitHub/AEP-PA/apps/frontend/src/features/home/components/role-placeholder-page.tsx)
- [apps/frontend/src/app/(authenticated)/admin/page.tsx](C:/Users/SEDUC/Documents/GitHub/AEP-PA/apps/frontend/src/app/(authenticated)/admin/page.tsx)
- [apps/frontend/src/app/(authenticated)/homologacao-autoridade/page.tsx](C:/Users/SEDUC/Documents/GitHub/AEP-PA/apps/frontend/src/app/(authenticated)/homologacao-autoridade/page.tsx)

Impacto:

- cobertura funcional incompleta por perfil
- diferenca entre navegacao exposta e funcionalidade real disponivel

## Lacunas estruturais relevantes

### 8. Apps `cron` e `worker` estao somente na estrutura

Descricao:

Os apps existem no monorepo, mas nao possuem implementacao funcional, script de execucao ou primeira entrega real.

Evidencias:

- [apps/cron/README.md](C:/Users/SEDUC/Documents/GitHub/AEP-PA/apps/cron/README.md)
- [apps/worker/README.md](C:/Users/SEDUC/Documents/GitHub/AEP-PA/apps/worker/README.md)

Impacto:

- nao ha processamento assincrono real
- nao ha rotina agendada real

### 9. Esteira de qualidade ainda nao esta consolidada na raiz

Descricao:

O workspace raiz nao tem scripts agregadores de `build`, `test`, `lint` e `typecheck`. O frontend tambem nao define scripts de teste ou lint.

Evidencias:

- [package.json](C:/Users/SEDUC/Documents/GitHub/AEP-PA/package.json)
- [apps/frontend/package.json](C:/Users/SEDUC/Documents/GitHub/AEP-PA/apps/frontend/package.json)

Impacto:

- CI/CD mais manual
- ausencia de gate unico de qualidade para o repositório

### 10. Pacotes compartilhados ainda estao subestruturados

Descricao:

`packages/config` ainda nao entrega configuracao compartilhada real, e `packages/contracts` expõe arquivos de `src` diretamente, sem build proprio.

Evidencias:

- [packages/config/README.md](C:/Users/SEDUC/Documents/GitHub/AEP-PA/packages/config/README.md)
- [packages/contracts/package.json](C:/Users/SEDUC/Documents/GitHub/AEP-PA/packages/contracts/package.json)

Impacto:

- baixo nivel de maturidade da camada compartilhada
- maior acoplamento entre apps e estrutura interna dos pacotes

### 11. Backend ainda nao possui fluxo explicito de build de producao

Descricao:

Os scripts atuais do backend usam `ts-node` e nao existe fluxo consolidado de compilacao e start de producao.

Evidencias:

- [apps/backend/package.json](C:/Users/SEDUC/Documents/GitHub/AEP-PA/apps/backend/package.json)

Impacto:

- processo de deploy indefinido
- baixa previsibilidade para runtime fora do ambiente dev

## Dev experience

### 12. Instabilidade observada no frontend em modo dev

Descricao:

O `build` do frontend passou, mas o log de desenvolvimento registra falhas de hot reload, carga de chunks e respostas `500`/`404` em assets do Next.

Evidencias:

- [frontend-dev.log](C:/Users/SEDUC/Documents/GitHub/AEP-PA/frontend-dev.log)

Impacto:

- perda de produtividade em desenvolvimento
- maior ocorrencia de falso positivo de regressao visual ou de runtime

## Checklist de correção recomendado

### Ordem recomendada

1. Preparar bootstrap deterministico do backend
2. Remover fragilidade operacional do Prisma
3. Limpar passivos de seguranca e configuracao
4. Reduzir lacunas entre API e frontend
5. Fechar areas placeholder
6. Consolidar arquitetura de monorepo e producao

### Tarefas

- [ ] `{BACK}` Criar um fluxo unico de bootstrap do backend.
Como corrigir: adicionar script unico para `prisma generate`, `db push` ou `migrate`, `seed` e validacao basica de health; documentar a ordem de execucao no README e no setup local.

- [ ] `{BACK}` Fazer o backend falhar de forma guiada quando o banco nao estiver pronto.
Como corrigir: validar schema/tabelas na inicializacao, emitir erro explicito de bootstrap e evitar 500 generico em login e rotas basicas quando a base estiver ausente.

- [ ] `{BACK}` Estabilizar `prisma generate` no Windows.
Como corrigir: impedir generate com processo que esteja usando o engine ativo, revisar lock do `query_engine-windows.dll.node`, testar generate com backend/frontend parados e, se necessario, separar generate de runtime dev.

- [ ] `{BACK}` Migrar a configuracao Prisma deprecada.
Como corrigir: remover uso de `package.json#prisma`, criar `prisma.config.ts` e ajustar scripts e documentacao para o formato atual suportado.

- [ ] `{BACK}` Classificar e corrigir vulnerabilidades de dependencias.
Como corrigir: executar `npm audit`, separar vulnerabilidades de runtime e dev-only, atualizar dependencias diretas e transitivas com validacao posterior de backend e frontend.

- [ ] `{BACK|FRONT}` Endurecer o desenho de autenticacao.
Como corrigir: revisar estrategia de sessao, avaliar refresh token, revogacao, expiracao controlada, armazenamento mais seguro e regras de invalidacao entre backend e frontend.

- [ ] `{BACK}` Expor na API os dados faltantes usados hoje por heuristica no frontend.
Como corrigir: mapear endpoints ou campos ausentes para etapa, parecer e leitura processual; versionar contrato com o frontend e remover contornos locais baseados apenas em macrostatus.

- [ ] `{FRONT}` Remover dependencias de heuristica no cliente onde a API ja puder atender.
Como corrigir: trocar mensagens e estados inferidos por dados retornados pelo backend, reduzir fallback semantico e alinhar a UI ao contrato final da API.

- [ ] `{FRONT}` Implementar as rotas placeholder de administracao e homologacao.
Como corrigir: definir backlog funcional minimo por perfil, criar componentes e integrações reais e remover textos de consolidacao dessas rotas.

- [ ] `{BACK|FRONT}` Consolidar scripts de qualidade na raiz do monorepo.
Como corrigir: adicionar scripts agregadores de `build`, `test`, `typecheck` e `lint` no `package.json` raiz e preparar execucao padronizada em CI.

- [ ] `{BACK}` Definir build e start de producao do backend.
Como corrigir: substituir fluxo principal em `ts-node` por build compilada, separar scripts de dev/test/prod e validar boot do artefato compilado.

- [ ] `{BACK}` Estruturar de fato `worker` e `cron` ou retirar do escopo imediato.
Como corrigir: escolher entre implementar um escopo minimo funcional real ou remover essas promessas da arquitetura e da documentacao ate haver entrega concreta.

- [ ] `{BACK}` Fortalecer os pacotes compartilhados do monorepo.
Como corrigir: dar corpo ao pacote `config`, revisar build do `contracts`, definir forma de consumo entre apps e reduzir acoplamento direto em `src`.
