# Contracts

Pacote de vocabulário compartilhado do domínio SADEP e contratos compartilhados entre apps.

## Implementado neste incremento

- enums centrais do domínio para perfis, processo, documentos, assinatura e auditoria
- tipos base leves para referência de entidades, processo, documento, assinatura e auditoria
- barrel exports centralizados em `src/index.ts`

## Papel do pacote no monorepo

Este pacote concentra contratos compartilhados entre os apps, especialmente:
- vocabulário comum do domínio
- tipos de workflow, documentos e auditoria
- base para futuros contratos de API e eventos de domínio

## Compatibilidade de runtime

Para permitir que backend e frontend consumam o pacote pelo entrypoint versionado, este pacote expõe um build CommonJS mínimo em `dist/` para chamadas `require()` e para resolução de tipos:

```powershell
npm run build --workspace @sadep/contracts
```

Esse build compila apenas os contratos existentes e mantém o pacote pequeno. O `package.json` aponta `main`, `types` e `exports` para `dist/`, e os scripts dos consumidores constroem `@sadep/contracts` antes de typecheck, build ou teste quando necessário. Isso evita consumo direto de `src` em runtime sem alterar a modelagem dos contratos.

## Deliberadamente fora deste incremento

- workflow-engine e regras de transição executáveis
- máquina de estados completa ou mapeamento entre estados macro e marcos granulares
- DTOs de API, schemas de validação e contratos de endpoint
- integração com Prisma, NestJS, Next.js ou autenticação
- geração de documentos, assinatura eletrônica real e integração GOV.BR
- modelagem completa de entidades ou persistência
- implementação funcional entre apps nesta fase

## Limites atuais de `ProcessStatus`

- `ProcessStatus` representa apenas estados processuais primários do fluxo administrativo do MVP
- este enum não deve ser lido como a workflow-engine completa
- nem todo marco operacional, documental ou de assinatura deve virar estado processual primário
- a separação fina entre estado processual, estado documental e evento auditável será consolidada em incrementos posteriores, especialmente no núcleo de workflow e documentos

## Convenção temporal

- campos temporais modelados como `string` devem seguir o padrão **ISO 8601 UTC**
- essa escolha é apenas de neutralidade de transporte e não acopla o pacote a bibliotecas específicas

## Relação com os documentos do projeto

Este pacote prepara o vocabulário compartilhado necessário para os próximos incrementos, mantendo compatibilidade com:
- `docs/AGENTS.md`
- `docs/workflow-engine.md`
- `docs/process-document.md`

Sem implementar essas capacidades nesta etapa.
