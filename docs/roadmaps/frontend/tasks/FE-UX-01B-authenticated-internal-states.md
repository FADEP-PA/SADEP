# FE-UX-01B - Estados internos autenticados

## Status

Concluida no recorte frontend.

## Recorte executado

Padronizacao dos estados internos menores de listas, blocos e modal nas areas autenticadas de processos e chefia imediata.

## Arquivos e telas afetados

- `apps/frontend/src/shared/ui/operational-states.tsx`
- `apps/frontend/src/shared/styles/globals.css`
- `apps/frontend/src/features/process/components/process-list-card.tsx`
- `apps/frontend/src/features/process/components/process-actions-card.tsx`
- `apps/frontend/src/features/process/components/process-blockers-card.tsx`
- `apps/frontend/src/features/process/components/supervisor-evaluation-workspace.tsx`
- Telas impactadas: `/processos` e `/chefia-imediata`.

## Decisoes tomadas

- Reutilizar `EmptyState` e `TemporaryUnavailableState` para estados internos de lista e indisponibilidade operacional.
- Criar `ClearState` como complemento pequeno para estados positivos de ausencia de pendencias ou bloqueios.
- Manter mensagens curtas, institucionais e sem detalhes internos de erro ou regras backend.
- Nao alterar regras de filtro, workflow, autorizacao, persistencia, assinatura, parecer ou homologacao.

## Dados demonstrativos

Dados demonstrativos, fakes seguros, placeholders e fallbacks visuais foram preservados. Nenhum CPF, matricula real, e-mail real ou documento sensivel foi criado.

## Limitacoes conhecidas

- O recorte nao cobre todos os modais e listas do sistema.
- A listagem real por perfil e a remocao de fallbacks demonstrativos continuam dependentes de backend/contracts seguros.
- Estados internos de CESAD e homologacao podem receber recortes proprios quando houver contratos estaveis ou necessidade visual especifica.

## Dependencias futuras

- `FE-PROCESS-LIST-01` depende de listagem backend segura por perfil.
- `FE-CHEFIA-02` depende de contrato backend para listar processos da chefia autenticada.
- `FE-CESAD-01` depende de contratos reais para pareceres, documentos, assinaturas e capabilities.

## Proxima task recomendada

`FE-COPY-01` para revisar microcopy institucional de mensagens, alertas e estados vazios nas areas autenticadas sem alterar integracoes.
