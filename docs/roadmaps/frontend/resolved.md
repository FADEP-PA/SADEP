# Frontend — Itens Resolvidos

Este arquivo resume itens frontend ja concluidos ou resolvidos. O antigo roadmap frontend foi arquivado em [`docs/archive/roadmaps-legados/frontend-tasks-roadmap.md`](../../../archive/roadmaps-legados/frontend-tasks-roadmap.md). Os arquivos de task detalhados resolvidos foram movidos para [`docs/archive/frontend/tasks/`](../../../archive/frontend/tasks/).

Esta separacao nao altera status de tasks, nao move documentos legados e nao arquiva historico. Ela apenas prepara a futura reducao dos roadmaps legados.

> Ultima atualizacao: 2026-08-26 — sincronizacao da administracao CESAD apos CRUD funcional, Presidente/snapshots e alinhamento da API.

---

## FE-CESAD-COMISSAO-01 — Interface administrativa da Comissao CESAD

- **Status documental:** concluida no recorte inicial de leitura real; evoluida posteriormente pelo CRUD funcional.
- **Issues relacionadas:** `#64` e `#66`.
- **PRs relacionados:** `#67`, `#75`, `#76` e `#78`.
- **Task file de referencia:** [`FE-CESAD-COMISSAO-01-admin-ui.md`](./tasks/FE-CESAD-COMISSAO-01-admin-ui.md).
- A rota `/cesad-comissao/admin` foi criada como area administrativa para `ADMIN` e `HOMOLOGATION_AUTHORITY`.
- A primeira fatia passou a consumir leitura real de comissoes CESAD e estabeleceu lista, card de comissao atual, ato e composicao.
- Este item permanece como registro historico da primeira fatia; as acoes administrativas que eram futuras aqui foram entregues posteriormente em `FE-CESAD-COMISSAO-CRUD-02`.

## CONTRACT-CESAD-COMMISSION-WRITE-01 — Payloads compartilhados de escrita

- **Status documental:** concluida no recorte planejado.
- **Issue relacionada:** `#83`.
- **PR relacionado:** `#87`.
- Exportou pelo `@sadep/contracts` os payloads de create/update/close/supersede e refs de ato/membro.
- Removeu a necessidade de manter tipos locais equivalentes no service frontend.
- **Ressalva posterior:** a evolucao do backend tornou `publishedAt` a fonte de verdade obrigatoria e `year` derivado; o write contract ainda precisa de alinhamento de tipagem porque hoje declara `year` obrigatorio e `publishedAt` opcional. Isso nao reabre a #83 como feature ausente; e uma divida de contrato posterior.

## FE-CESAD-COMISSAO-CRUD-02 — CRUD administrativo funcional

- **Status documental:** concluida / integrada / alinhada ao dominio atual.
- **Issue principal:** `#85`.
- **PRs relacionados:** `#88` e ajuste posterior `#98`.
- Conectou criacao, edicao, encerramento e supersessao a API real.
- Preservou as restricoes e bloqueios definidos no backend em vez de recriar regra juridica no cliente.
- Encerramento e supersessao consomem payload formal com motivo administrativo.
- A composicao visual corresponde a exatamente `1 PRESIDENTE` e, no minimo, `2 TITULARES + 2 SUPLENTES`.
- Exibe `registrationSnapshot`, `bondSnapshot` e `positionSnapshot` quando retornados pela API.
- O nome da comissao e retornado/gerado pelo backend e tratado como somente leitura.
- O formulario usa data de publicacao como referencia temporal e evita deslocamento de datas civis.
- Removeu IDs e dados demonstrativos do fluxo administrativo funcional.
- Incluiu tratamento institucional de falhas e testes de regressao no recorte frontend.
- **Estado correto:** o CRUD administrativo esta funcional. O produto CESAD permanece parcialmente integrado porque parecer de etapa, parecer final e outras jornadas processuais ainda possuem fatias frontend proprias.

## Politica temporal registrada para o frontend

- `publishedAt` e a entrada temporal de negocio para o ato CESAD.
- O backend deriva `year` a partir de `publishedAt` e persiste o valor materializado.
- O frontend nao deve apresentar `year` nem `commission.name` como entradas independentes editaveis.
- Enquanto o `@sadep/contracts` continuar com a assinatura antiga, o frontend pode enviar `year` apenas por compatibilidade de tipo; esse valor nao deve ser tratado como fonte de verdade.
- A correcao definitiva do write contract deve ocorrer em task de contracts propria.

## FE-DOC-AUTH-README-01 — Atualizar documentacao de autenticacao frontend

- **Status documental:** concluida nesta atualizacao documental controlada.
- Atualizou `apps/frontend/README.md` para remover a orientacao antiga de persistir sessao completa em storage local.
- Registrou que o access token fica apenas em memoria, que o bootstrap usa refresh de sessao e que o refresh token e transportado em cookie `HttpOnly`.
- Registrou retry silencioso de `401`, redirecionamento para sessao expirada quando refresh falha e preservacao de `403` como falta de permissao.
- Atualizou `docs/frontend/README.md` com a mesma regra operacional.
- Nao alterou codigo, package files, configs, backend, schema, migrations ou contracts.

## FE-QUAL-02 — Reforco do quality gate visual/textual frontend

- **Status documental:** concluida no recorte frontend.
- Reforcou o `scripts/check-frontend-copy.mjs` para bloquear termos tecnicos ou de prototipo em codigo de interface.
- Preservou documentacao tecnica de manutencao fora da superficie de interface.
- Limitacao conhecida: o gate e textual e nao substitui validacao visual em navegador, testes de interacao ou auditoria completa de conteudo dinamico.

## FE-UI-01 — Consistencia visual autenticada

- **Status documental:** concluida no recorte frontend.
- Padronizou cards, badges, secoes e blocos informativos nas areas autenticadas principais.
- Telas afetadas: `/processos`, `/servidor-estagiario`, `/chefia-imediata`, `/cesad-comissao` e `/homologacao-autoridade`.

## FE-RESP-01 — Responsividade das telas autenticadas principais

- **Status documental:** concluida no recorte frontend.
- Ajustou containers, grids, cards, modais e botoes das areas autenticadas principais para telas menores.
- Preservou dados demonstrativos e fallbacks visuais existentes.

## FE-COPY-01 — Microcopy institucional autenticada

- **Status documental:** concluida no recorte frontend.
- Revisou estados institucionais, mensagens de carregamento, modos demonstrativos, alertas de integracao pendente e acoes bloqueadas nas areas autenticadas principais.
- Telas afetadas: `/processos`, `/servidor-estagiario`, `/chefia-imediata` e `/homologacao-autoridade`.

## FE-UX-01A / FE-UX-01B — Estados institucionais e internos autenticados

- **Status documental:** concluidas no recorte frontend.
- Criaram e aplicaram estados compartilhados para ausencia de dados, indisponibilidade temporaria, modo demonstrativo e listas internas sem pendencias.
- Telas afetadas: `/processos`, `/servidor-estagiario`, `/chefia-imediata`, `/cesad-comissao` e `/homologacao-autoridade`.

## FE-ROADMAP-01 — Reconciliar painel ativo frontend

- **Status documental:** concluida no recorte frontend.
- O painel ativo frontend passou a separar pendencias reais de itens ja resolvidos.
- `FE-CHEFIA-01` deixou de aparecer como item ativo; a continuidade correta permanece em `FE-CHEFIA-02`.
- A sincronizacao da #96 removeu do backlog CESAD os itens administrativos que ja foram entregues e passou a apontar #101/#103 como fatias funcionais atuais.

## FE-A11Y-01 — Acessibilidade basica do shell autenticado

- **Status documental:** concluida no recorte frontend.
- O shell autenticado recebeu link de pular para o conteudo principal, alvo explicito em `main#conteudo-principal` e rotulos acessiveis no menu lateral.
- Links de navegacao e botao de saida passaram a ter nomes acessiveis estaveis mesmo quando a sidebar esta recolhida.

## FT-27 / DX-01 — Reconciliar dependencias locais do frontend

- **Status documental:** resolvida operacionalmente.
- `npm install` reconciliou o ambiente local.
- `npm ls next`, typecheck e build do frontend passaram no ciclo registrado.
- A pendencia `postcss`/audit permanece separada em task propria.

## FT-22 / FT-23 — DX e gates frontend

- **Status documental:** concluidas no roadmap legado.
- `FT-22` investigou a instabilidade do frontend em modo dev.
- `FT-23` consolidou gates minimos de qualidade do frontend.

## FT-20 — Consistencia visual do shell autenticado

- **Status documental:** concluida no recorte frontend.
- O shell autenticado passou a exibir contexto automatico da rota ativa no header.
- A sidebar passou a exibir o perfil ativo com rotulo institucional curto.

## FT-19 — Responsividade das telas principais

- **Status documental:** concluida no recorte frontend.
- A tabela da chefia imediata passou a virar cards rotulados em tablet/mobile.
- O header autenticado e a lista de processos receberam ajustes para telas estreitas.

## FT-18 — Consistencia textual e institucional por perfil

- **Status documental:** concluida no recorte frontend.
- Textos de perfis, menus, paginas de apoio e jornadas principais foram revisados para linguagem institucional mais consistente.

## FT-21 — Validacao dos fluxos principais no recorte servidor/chefia

- **Status documental:** concluida no recorte frontend focado em `/servidor-estagiario` e `/chefia-imediata`.
- As jornadas de chefia e servidor foram revalidadas quanto a consulta manual de processo, modo demonstrativo e acoes condicionadas pelas capacidades disponiveis.

## FE-SERVIDOR-01 — Refinar jornada demonstrativa do servidor estagiario

- **Status documental:** concluida no recorte frontend.
- A tela `/servidor-estagiario` passou a diferenciar visualmente modo demonstrativo e processo carregado.
- A etapa atual ganhou destaque visual nos cards da jornada.

## FE-CHEFIA-01 — Integracao inicial da chefia imediata

- **Status documental:** parcialmente resolvida / integracao inicial entregue no recorte frontend seguro.
- `/chefia-imediata` consome workspace por processo informado manualmente na tela.
- A continuidade fica registrada em [`FE-CHEFIA-02`](./tasks/FE-CHEFIA-02-supervisor-process-list-and-demo-removal.md).
- A ausencia de listagem segura de processos por perfil nao reabre `FT-24`.

## FE-MOBILE-01 — Polimento mobile servidor e chefia

- **Status documental:** concluida no recorte frontend.
- `/servidor-estagiario` e `/chefia-imediata` receberam ajustes mobile de empilhamento, alinhamento e largura de acoes.

## FE-DEMO-UX-01 — Refinamento visual dos modos demonstrativos

- **Status documental:** concluida no recorte frontend seguro.
- Os banners de modo demonstrativo/processo carregado de `/servidor-estagiario` e `/chefia-imediata` ganharam estrutura visual mais estavel.

## FE-ENV-01 — Documentar variaveis de ambiente do frontend

- **Status documental:** concluida no recorte frontend operacional.
- `NEXT_PUBLIC_API_BASE_URL` foi documentada como a variavel publica que define a origem da API consumida pelo frontend.
- `NEXT_PUBLIC_TECHNICAL_PROCESS_ID` permanece removida e nao deve ser reintroduzida como configuracao frontend.

## FT-16 — Layout base do parecer CESAD de etapa

- **Status documental:** concluida no recorte frontend.
- `/cesad-comissao` recebeu shell institucional para o futuro parecer CESAD por etapa.
- A consulta real de leitura consolidada da etapa foi preservada.
- A continuidade funcional nao deve reabrir FT-16: esta em `#103 — FE-CESAD-STAGE-OPINION-01`.

## FT-26 — Limpeza de scaffolds e placeholders legados

- **Status documental:** concluida no recorte frontend.
- Componentes antigos sem uso foram removidos.
- Textos visiveis e documentacao do frontend deixaram de tratar as telas atuais como placeholders genericos.

## FE-QUAL-01 — Quality gate frontend de texto e scaffolds legados

- **Status documental:** concluida no recorte frontend.
- Criou `scripts/check-frontend-copy.mjs` e adicionou o gate de copy-check ao fluxo do frontend.
- O gate bloqueia regressao de termos ou textos inadequados na superficie de interface.

## BE-ARCH-01D / BE-ARCH-01E4A / BE-ARCH-01E4B / BE-ARCH-01E4C — Recortes frontend de sessao/auth

- **Status documental:** concluidos nos recortes frontend de sessao.
- O frontend deixou de persistir access token em storage, passou a manter token em memoria e usa refresh de sessao para bootstrap.
- O retry de `401` foi centralizado no `http-client` com protecao contra chamadas concorrentes.
- Consumidores legados de access token na sessao foram removidos.

## FT-24 — Remover dependencia de NEXT_PUBLIC_TECHNICAL_PROCESS_ID

- **Status documental:** resolvida no recorte frontend.
- A varredura global nao encontrou `NEXT_PUBLIC_TECHNICAL_PROCESS_ID` no codigo frontend.
- `/chefia-imediata`, `/processos` e `/servidor-estagiario` dependem de consulta manual/selecao explicita na UI.
- A ausencia de listagem segura por perfil deve ser tratada em task futura propria.

## FT-17 — Area de homologacao

- **Status documental:** concluida no roadmap legado como painel preparado.
- A area `/homologacao-autoridade` foi preparada como workspace/painel para expansao.
- Esta conclusao nao deve ser lida como fluxo frontend completo de homologacao.

## FT-01 a FT-15 e FT-25

- `FT-01` a `FT-15` aparecem como concluidas no roadmap legado e validadas por gates frontend registrados.
- `FT-25` concluiu a triagem de vulnerabilidades/dependencias que afetam o frontend.
- O alerta residual `next`/`postcss` permanece pendente e separado em `DX-POSTCSS-01`.

## Cuidado especial com FT-05

- `FT-05` pode ser preservada como historico de refinamento visual/estrutural anterior da jornada da chefia.
- Ela nao deve ser interpretada como integracao plena da chefia.
- A integracao plena de `/chefia-imediata` com listagem segura por perfil continua fora do recorte arquivado de [`FE-CHEFIA-01`](../../archive/frontend/tasks/FE-CHEFIA-01-supervisor-workspace-integration.md).

Para a leitura de transicao e links modulares, consultar [`docs/archive/roadmaps-legados/frontend-tasks-roadmap.md`](../../../archive/roadmaps-legados/frontend-tasks-roadmap.md).
