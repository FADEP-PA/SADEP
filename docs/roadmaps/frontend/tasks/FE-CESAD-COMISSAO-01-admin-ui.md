# FE-CESAD-COMISSAO-01 — Interface administrativa da Comissao CESAD

## Status

Pendente / especificada / aguardando contracts backend.

## Relacao com o epico

Frente frontend vinculada a `BE-CESAD-REG-01`.

## Objetivo

Implementar interface administrativa para cadastro, consulta e manutencao da Comissao CESAD, apos estabilizacao dos contratos backend.

## Escopo previsto

- Listar comissoes cadastradas.
- Exibir situacao temporal: futura/agendada, vigente, encerrada, inativa ou supersedida.
- Consultar detalhes da comissao.
- Exibir ato/portaria relacionado.
- Exibir titulares e suplentes.
- Permitir cadastro de nova comissao, se backend disponivel.
- Exibir alertas de vigencia conflitante retornados pelo backend.
- Impedir assistente como membro formal na interface.
- Exibir warnings de composicao minima.

## Fora do escopo

- Implementar backend.
- Criar regras client-side como fonte de verdade.
- Implementar rollover.
- Alterar assinatura CESAD, parecer final, homologacao ou notificacao.
- Usar dados reais de portarias.

## Dependencias backend

- `BE-CESAD-REG-01A` para contracts.
- `BE-CESAD-REG-01B` para criacao.
- `BE-CESAD-REG-01C` para edicao.
- `BE-CESAD-REG-01D` para encerramento/supersessao.

A tela pode iniciar em modo read-only depois que a consulta enriquecida estiver disponivel.

## Telas/componentes previstos

- Lista de comissoes.
- Card de comissao atual.
- Formulario de cadastro.
- Formulario de ato/portaria.
- Tabela de titulares.
- Tabela de suplentes.
- Alertas de vigencia e composicao.
- Painel de auditoria/resumo de ultima alteracao, se backend expuser.

## Regras de UX

- Diferenciar status cadastral de situacao temporal.
- Mostrar claramente quando a comissao e futura/agendada.
- Mostrar vigencia e data fim calculada.
- Bloquear envio quando composicao minima nao estiver preenchida.
- Exibir erro de vigencia conflitante em linguagem institucional.
- Evitar prometer rollover automatico na interface inicial.

## Autorizacao visual

Apenas perfis autorizados pelo backend devem ver acoes de cadastro/manutencao:

- `ADMIN`;
- `HOMOLOGATION_AUTHORITY`.

Outros perfis podem ter leitura somente se backend permitir.

## Testes esperados

- Renderizacao de lista vazia.
- Renderizacao de comissao vigente.
- Renderizacao de comissao futura/agendada.
- Validacao visual de 3 titulares e 2 suplentes.
- Bloqueio visual de assistente como membro.
- Tratamento de erro de vigencia conflitante.
- Permissoes visuais por perfil.

## Criterios de aceite

- Frontend consome contracts reais.
- Nao duplica regra de negocio como fonte de verdade.
- Acoes sensiveis dependem do backend.
- Interface deixa claro que rollover e frente propria.

## Paralelizacao

Pode iniciar design/wireframe em paralelo com `BE-CESAD-REG-01B`, mas a implementacao funcional deve aguardar contracts da `01A` e endpoints minimos da `01B`.
