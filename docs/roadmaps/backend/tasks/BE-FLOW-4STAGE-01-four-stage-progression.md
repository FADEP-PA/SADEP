# BE-FLOW-4STAGE-01 — Estruturar progressao formal das quatro etapas avaliativas

## Status

Pendente alta.

## Area

Backend, workflow, dominio processual e auditoria.

## Contexto

O MVP cobre o Caso 2, com um processo administrativo composto por quatro etapas internas obrigatorias. A varredura global confirmou que o backend ja implementa partes do ciclo de uma etapa, mas ainda nao representa a progressao formal completa das quatro etapas ate a consolidacao.

Esta task existe para evitar que o fluxo reduzido atual seja tratado como o fluxo completo do Caso 2.

## Escopo previsto

- representar a progressao entre as quatro etapas avaliativas;
- explicitar pre-condicoes para iniciar, concluir ou avancar etapa;
- preservar ciclo documental por etapa;
- manter transicoes dentro da workflow-engine;
- registrar auditoria de avancos, bloqueios e ajustes;
- documentar estados intermediarios sem inflar indevidamente o estado macro do processo;
- preservar compatibilidade com status e modelos ja existentes quando possivel.

## Fora do escopo

- implementar homologacao final;
- implementar recurso administrativo;
- implementar publicacao de portaria;
- implementar parecer conclusivo final, salvo integracao minima de pre-condicao futura;
- alterar frontend demonstrativo;
- criar decisao juridica no frontend.

## Criterios de aceite

- o backend diferencia claramente etapa atual, etapas concluidas e etapas pendentes;
- a proxima etapa so fica disponivel apos conclusao documental e workflow da etapa anterior;
- a quarta etapa concluida habilita o caminho para parecer conclusivo final, mas nao homologa automaticamente;
- transicoes relevantes passam pela workflow-engine;
- auditoria registra usuario, perfil, data/hora, acao, processo e etapa afetada.

## Validacoes esperadas

- `npm run typecheck --workspace @sadep/backend`;
- `npm run typecheck:spec --workspace @sadep/backend`;
- testes backend de workflow/processos;
- `npm run test --workspace @sadep/backend`;
- `git diff --check`.

## Dependencias

- `docs/skills/workflow-engine-skill.md`;
- `docs/workflow/four-stage-flow-and-appeals.md`;
- ciclo documental de avaliacao da chefia, autoavaliacao e parecer CESAD por etapa.

## Proxima acao

Mapear o estado real do `ProcessStage` e definir quais guards devem bloquear avancos prematuros sem criar novos estados macro desnecessarios.
