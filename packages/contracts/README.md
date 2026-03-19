# Contracts

Pacote de vocabulário compartilhado do domínio AEP-PA.

## Implementado neste incremento

- enums centrais do domínio para perfis, processo, documentos, assinatura e auditoria
- tipos base leves para referência de entidades, processo, documento, assinatura e auditoria
- barrel exports centralizados em `src/index.ts`

## Deliberadamente fora deste incremento

- workflow-engine e regras de transição executáveis
- máquina de estados completa ou mapeamento entre estados macro e marcos granulares
- DTOs de API, schemas de validação e contratos de endpoint
- integração com Prisma, NestJS, Next.js ou autenticação
- geração de documentos, assinatura eletrônica real e integração GOV.BR
- modelagem completa de entidades ou persistência

## Limites atuais de `ProcessStatus`

- `ProcessStatus` representa apenas estados processuais primários do fluxo administrativo do MVP
- este enum não deve ser lido como a workflow-engine completa
- nem todo marco operacional, documental ou de assinatura deve virar estado processual primário
- a separação fina entre estado processual, estado documental e evento auditável será consolidada em incrementos posteriores, especialmente no núcleo de workflow e documentos

## Convenção temporal

- campos temporais modelados como `string` devem seguir o padrão **ISO 8601 UTC**
- essa escolha é apenas de neutralidade de transporte e não acopla o pacote a bibliotecas específicas

## Relação com os documentos do projeto

Este pacote prepara o vocabulário compartilhado necessário para os próximos incrementos, mantendo compatibilidade com os princípios de `docs/AGENTS.md`, com os estados obrigatórios descritos em `docs/workflow-engine.md` e com o ciclo documental descrito em `docs/process-document.md`, sem implementar essas capacidades nesta etapa.
