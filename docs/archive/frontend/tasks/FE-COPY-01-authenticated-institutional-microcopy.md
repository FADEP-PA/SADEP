# FE-COPY-01 - Microcopy institucional autenticada

## Status

Concluida no recorte frontend.

## Recorte executado

Revisao de microcopy visivel nas areas autenticadas principais, limitada a estados institucionais, mensagens de loading, modo demonstrativo, alertas de integracao pendente e acoes bloqueadas.

## Arquivos e telas afetados

- `apps/frontend/src/shared/ui/operational-states.tsx`
- `apps/frontend/src/features/process/components/appeal-status-panel.tsx`
- `apps/frontend/src/features/process/components/process-actions-card.tsx`
- `apps/frontend/src/features/process/components/process-status-card.tsx`
- `apps/frontend/src/features/process/components/process-workspace.tsx`
- `apps/frontend/src/features/process/components/intern-server-workspace.tsx`
- `apps/frontend/src/features/process/components/supervisor-evaluation-workspace.tsx`
- `apps/frontend/src/features/homologacao-autoridade/components/homologation-authority-workspace.tsx`
- `apps/frontend/src/features/homologacao-autoridade/services/homologation-workspace-service.ts`
- Telas impactadas: `/processos`, `/servidor-estagiario`, `/chefia-imediata` e `/homologacao-autoridade`.

## Decisoes de microcopy

- Substituir termos de prototipo ou engenharia, como `fakes`, `backend`, `cliente` e `snapshot juridico`, por linguagem institucional voltada ao usuario.
- Trocar referencias a `processo real` por `processo informado` ou `consulta autenticada`, evitando promessa de integracao plena.
- Manter o modo demonstrativo claro, discreto e associado a dados ficticios e seguros.
- Ajustar acoes homologatorias bloqueadas para rotulos de indisponibilidade quando nao houver permissao/capacidade liberada.
- Evitar prometer assinatura, homologacao, emissao, parecer final, persistencia ou protocolo quando o suporte backend ainda nao existe.

## Dados demonstrativos

Dados demonstrativos, fakes seguros, placeholders e fallbacks visuais foram preservados. Nenhum CPF, matricula real, e-mail real, documento real ou dado sensivel foi criado.

## Limitacoes conhecidas

- O recorte nao revisa todos os textos da aplicacao.
- CESAD foi mantida fora da revisao ampla porque a maior parte da microcopy atual ja deixa claro o recorte demonstrativo/leitura sem emissao real.
- Uma auditoria textual completa por tela pode ser feita em recorte futuro.

## Dependencias futuras

- `FE-PROCESS-LIST-01`, `FE-CHEFIA-02` e `FE-CESAD-01` seguem dependentes de backend/contracts seguros para evolucao funcional.
- Fluxos reais de homologacao, assinatura, parecer final, notificacao e recurso dependem de contratos e autorizacoes backend.

## Proxima task recomendada

`FE-RESP-01` para revisar responsividade das telas autenticadas principais sem alterar integracoes.
