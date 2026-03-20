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
3. gerar client Prisma:
   - `npm run prisma:generate --workspace @aep-pa/backend`
4. aplicar migration local:
   - `npm run prisma:migrate:dev --workspace @aep-pa/backend -- --name init_identity_auth`
5. executar seed de desenvolvimento:
   - `npm run prisma:seed --workspace @aep-pa/backend`
6. subir o backend:
   - `npm run backend:start:dev`

> Observação: para integração local com o frontend em `http://localhost:3001`, o backend agora usa `FRONTEND_ORIGIN` para responder corretamente ao preflight CORS (`OPTIONS`) em endpoints como `/auth/login`.

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