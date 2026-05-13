# BE-SEC-03 — Guarda-chuva residual / integracao futura de autorizacao contextual CESAD

## Status

Aberta como guarda-chuva residual / integracao futura.

## Area

Backend, seguranca e autorizacao.

## Fonte de transicao

- [`../../backend-implementation-tracker.md`](../../backend-implementation-tracker.md)
- [`../active.md`](../active.md)
- [`../../problemas-atuais-do-projeto.md`](../../problemas-atuais-do-projeto.md)

## Contexto

A varredura de autenticacao identificou que endpoints CESAD sensiveis podem depender de role global combinada com status. Isso nao e problema de sessao, mas de autorizacao contextual por processo, com risco juridico e operacional.

## Estado atual

O problema esta registrado como frente separada da familia `BE-ARCH-01`. A primeira fatia executiva, `BE-CESAD-AUTH-01`, foi concluida, auditada e aprovada com ressalvas no commit `211a4d4 feat(backend): apply contextual CESAD authorization`.

Com esse recorte, os endpoints sensiveis atuais deixaram de depender apenas de role global/status e passaram a usar `CesadContextAuthorizationService` para workflow, historico, transicoes CESAD sensiveis, leitura consolidada e parecer CESAD de etapa.

A segunda fatia executiva, `BE-CESAD-AUTH-02`, foi concluida, auditada e aprovada com ressalvas no commit `8ffd804 feat(backend): persist CESAD stage assignments`.

Com esse recorte, o backend passou a persistir o vinculo formal entre comissao CESAD, processo e etapa por meio de `CesadStageAssignment`, conforme a [`ADR-003`](../../../architecture/adr/adr-003-cesad-stage-assignment.md). A assignment ativa da etapa e criada ou reutilizada em `SEND_TO_CESAD`, a autorizacao contextual CESAD passou a consultar esse vinculo persistido, e `CesadStageOpinionExpectedSigner` passou a derivar a comissao da assignment da etapa.

A terceira fatia executiva, `BE-CESAD-ASSIGN-REPLACE-01`, foi concluida, auditada e aprovada com ressalvas.

Com esse recorte, o backend passou a permitir supersessao formal da assignment CESAD ativa da etapa antes de qualquer parecer, expected signer ou documento CESAD. A operacao cria nova assignment `ACTIVE`, preserva a antiga como `SUPERSEDED`, registra `supersededByAssignmentId`, bloqueia troca para mesma comissao ou comissao invalida e audita o ato por `AuditEventType.CESAD_STAGE_ASSIGNMENT_SUPERSEDED` / `SUPERSEDE_CESAD_STAGE_ASSIGNMENT`.

A quarta fatia executiva, `BE-DOC-CESAD-SIGN-01`, foi concluida, auditada e aprovada com ressalvas.

Com esse recorte, o parecer CESAD de etapa passou a ter ciclo documental com `ProcessDocument.CESAD_OPINION` stage-bound, assinaturas pendentes derivadas de `CesadStageOpinionExpectedSigner`, multiplos `CESAD_MEMBER` no mesmo documento e bloqueio de `ISSUE_CESAD_OPINION` ate completude colegiada.

`BE-SEC-03` permanece aberta como guarda-chuva residual / integracao futura, mas o risco critico imediato de autorizacao contextual CESAD foi reduzido substancialmente. A frente nao permanece aberta por ausencia de autorizacao contextual basica, vinculo persistido, reatribuicao segura ou assinatura colegiada do parecer CESAD de etapa. As pendencias remanescentes sao integracoes futuras com workflow completo de quatro etapas, parecer conclusivo final, homologacao/notificacao/ciencia, documentos posteriores e possiveis integracoes futuras ainda nao formalizadas.

## Escopo previsto

- preservar a protecao ja aplicada por `BE-CESAD-AUTH-01`;
- preservar o vinculo persistido comissao-processo-etapa entregue por `BE-CESAD-AUTH-02`;
- preservar a reatribuicao/supersessao formal segura entregue por `BE-CESAD-ASSIGN-REPLACE-01`;
- preservar a integracao com assinatura colegiada do parecer CESAD de etapa entregue por `BE-DOC-CESAD-SIGN-01`;
- integrar a autorizacao contextual com pareceres futuros e workflow completo;
- manter testes positivos e negativos de autorizacao a cada novo ponto sensivel.

## Fora do escopo

- refresh token;
- frontend;
- UX;
- assinatura externa ou documentos posteriores ainda nao formalizados;
- parecer final;
- homologacao;
- refactor amplo de workflow.

## Evidencias / referencias

- O indice backend e o painel ativo preservam `BE-SEC-03` como guarda-chuva residual / integracao futura aberto, nao como lacuna imediata de autorizacao contextual basica.
- O painel transversal registra o achado CESAD separadamente da estrategia de sessao.
- `BE-CESAD-AUTH-01` concluiu a aplicacao executiva da autorizacao contextual aos endpoints sensiveis atuais, sem substituir nem encerrar este guarda-chuva.
- `BE-CESAD-AUTH-02` concluiu a modelagem persistida do vinculo comissao-processo-etapa por `CesadStageAssignment`, sem substituir nem encerrar este guarda-chuva.
- `BE-CESAD-ASSIGN-REPLACE-01` concluiu a supersessao formal segura de assignment por etapa, sem troca automatica invisivel e sem update simples de `commissionId`.
- `BE-DOC-CESAD-SIGN-01` concluiu a assinatura colegiada do parecer CESAD de etapa no recorte documental minimo, com documento `CESAD_OPINION` stage-bound e assinaturas derivadas dos expected signers.
- Ressalvas remanescentes de `BE-CESAD-ASSIGN-REPLACE-01`: `referenceDate` ainda usa parsing por `new Date(...)`; testes HTTP adicionais podem cobrir payloads invalidos adicionais; reatribuicao apos parecer, expected signers ou documento CESAD permanece bloqueada e exigira versionamento, invalidacao ou supersessao documental formal.
- Ressalvas remanescentes de `BE-DOC-CESAD-SIGN-01`: metadata de `SIGNATURE_REQUESTED` pode ser enriquecida futuramente; a nova unique de `SignatureRecord` permite multiplos usuarios com a mesma role no mesmo documento, mantendo documentos nao colegiados protegidos em service; versionamento, invalidacao/supersessao documental, substituicao formal de signatario apos assinatura aberta e GOVBR real continuam fora do recorte.
- Workflow completo de quatro etapas permanece em `BE-FLOW-4STAGE-01`, parecer conclusivo final permanece em `BE-CESAD-FINAL-01`, e homologacao/notificacao/ciencia permanecem em `BE-HOMOLOG-01`.

## Validacoes esperadas

- testes unitarios ou integrados de autorizacao positiva;
- testes unitarios ou integrados de autorizacao negativa;
- typecheck backend;
- suite backend relevante ao modulo afetado.

## Proxima acao

Priorizar as integracoes remanescentes conforme o roadmap: `BE-FLOW-4STAGE-01` para quatro etapas, `BE-CESAD-FINAL-01` para parecer conclusivo final e `BE-HOMOLOG-01` para homologacao/notificacao/ciencia. Versionamento, invalidacao/supersessao documental, substituicao formal de signatario apos assinatura aberta e assinatura externa GOVBR real devem nascer como tasks proprias.
