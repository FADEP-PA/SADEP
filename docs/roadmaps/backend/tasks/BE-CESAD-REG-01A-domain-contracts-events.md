# BE-CESAD-REG-01A — Contratos de dominio, payloads e eventos

## Status

Pendente / especificada / pronta para varredura tecnica.

## Relacao com o epico

Task filha de `BE-CESAD-REG-01 — Cadastro e gerenciamento formal de comissoes CESAD`.

Implementa a fase preparatoria recomendada pela `ADR-006 — Administracao formal da Comissao CESAD e rollover de competencia`.

## Objetivo

Consolidar o desenho tecnico antes de implementar endpoints de mutacao da comissao CESAD.

Esta task deve mapear o estado atual do schema, contracts, controllers, services e auditoria, definindo os contratos publicos e eventos minimos para as proximas fatias.

## Escopo

- Revisar `CesadCommission`, `CesadCommissionAct`, `CesadCommissionMember` e enums relacionados.
- Revisar `CesadStageAssignment` e pontos de uso da comissao vigente.
- Mapear services/controllers read-only existentes.
- Definir DTOs e contracts de criacao, edicao, encerramento e consulta enriquecida.
- Definir eventos de auditoria necessarios para cadastro, alteracao, encerramento, supersessao, membros e atos.
- Definir erros padronizados para vigencia conflitante, composicao minima invalida e membro incompatível.
- Definir plano de testes obrigatorio para as fatias `01B` a `01E`.

## Fora do escopo

- Implementar endpoints.
- Alterar schema Prisma.
- Criar migrations.
- Alterar frontend.
- Criar seed.
- Implementar rollover.
- Alterar assinatura CESAD ou homologacao.

## Regras de negocio a preservar

- Resolver comissao vigente por data de referencia.
- Permitir comissao futura/agendada sem job de ativacao.
- Bloquear vigencia sobreposta.
- Permitir encerramento automatico D-1 de comissao anterior sem data fim quando nova comissao posterior for cadastrada.
- Exigir 3 titulares e 2 suplentes.
- Impedir `COMMISSION_ASSISTANT` como membro formal.
- Preservar atos consolidados.
- Tratar atos preparatorios por rollover explicito e auditavel em task propria.

## Entregaveis esperados

- Lista de contratos existentes a reutilizar.
- Lista de contratos novos ou campos adicionais necessarios.
- Proposta de DTOs para `create`, `update`, `close/supersede` e leitura enriquecida.
- Proposta de eventos de auditoria.
- Plano de implementacao para `01B`, `01C`, `01D` e `01E`.
- Confirmacao se a `ADR-006` e suficiente ou se precisa de complemento.

## Pontos tecnicos obrigatorios da varredura

- Como `CesadCurrentCommissionService` resolve a comissao vigente hoje.
- Como `SEND_TO_CESAD` cria ou reutiliza `CesadStageAssignment`.
- Como expected signers sao derivados da composicao titular vigente.
- Quais enums de auditoria ja existem.
- Como o projeto trata documentos `READY_FOR_SIGNATURE`, `SIGNED` e `INVALIDATED_OR_SUPERSEDED`.
- Se existe risco de colisao com `BE-CESAD-ASSIGN-REPLACE-01`.

## Testes que deverao ser planejados

- Resolucao temporal de comissao futura, vigente e encerrada.
- Bloqueio de vigencia sobreposta.
- Composicao minima invalida.
- Bloqueio de assistente como membro.
- Bloqueio de edicao estrutural de comissao usada.
- Auditoria de criacao/alteracao.
- Rollover com documento pendente, em task propria.

## Criterios de aceite

- Nenhum codigo funcional alterado sem necessidade explicita.
- Contracts e eventos definidos antes da `01B`.
- Riscos de schema e workflow mapeados.
- Proximas fatias podem ser executadas por pessoas diferentes sem ambiguidade.

## Dependencias

- `BE-CESAD-REG-01`.
- `ADR-006`.
- Controllers/services read-only da comissao CESAD.

## Paralelizacao

Deve ser executada antes das fatias de implementacao backend. Apos concluida, libera `01B`, `01C`, `01D`, `01F` e a especificacao frontend.
