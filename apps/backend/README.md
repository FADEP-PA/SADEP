# Backend (NestJS)

Fundação técnica mínima do backend do AEP-PA para os próximos incrementos.

## Implementado neste incremento

- bootstrap funcional com NestJS
- configuração centralizada mínima via ambiente
- logger básico
- filtro global básico para erros inesperados
- endpoint de healthcheck operacional

## Limitação de validação

No ambiente auditado anteriormente, a validação de instalação e compilação ficou prejudicada por bloqueio externo ao registry de dependências. A executabilidade do backend deve ser confirmada em ambiente com acesso adequado ao registry.

## Deliberadamente fora do escopo

- workflow-engine
- domínio processual
- autenticação, RBAC e usuários
- banco, Prisma de domínio e migrations de negócio
- documentos, assinaturas, notificações e integrações externas
