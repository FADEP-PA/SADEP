# Segurança — SADEP

> Última atualização: 2026-05-15 (criação inicial da pasta de segurança e do relatório consolidado).

## Finalidade

Esta pasta reúne os documentos operacionais de **análise, hardening e acompanhamento de segurança** do SADEP — Sistema de Avaliação de Desempenho de Estágio Probatório.

A pasta nasce como recorte específico do roadmap operacional. Ela complementa, **mas não substitui**, os tópicos de segurança já existentes em [`../cross-cutting/active-problems.md`](../cross-cutting/active-problems.md). O painel transversal permanece como fonte primária de problemas ativos; esta pasta consolida a análise técnica e a priorização de hardening em um único lugar.

## Documentos

- [`relatorio-seguranca-2026-05-15.md`](./relatorio-seguranca-2026-05-15.md): relatório técnico consolidado da varredura realizada em 2026-05-15, com achados por severidade, mapa de superfície de ataque, recomendações de remediação faseada e referências cruzadas para tasks operacionais existentes.
- [`tasks/`](./tasks/): tasks específicas de hardening derivadas do relatório (a serem criadas conforme priorização aprovada).

## Tarefas de segurança já formalizadas no roadmap

As tarefas abaixo permanecem ativas no painel transversal e devem ser consultadas antes de qualquer ação derivada do relatório:

- [`SEC-HARD-01` — hardening adicional de segurança HTTP, rate limit e CSRF](../cross-cutting/tasks/SEC-HARD-01-http-rate-limit-csrf.md).
- [`SEC-LOG-PII-01` — reduzir PII e ruído em logs](../cross-cutting/tasks/SEC-LOG-PII-01-auth-logs-pii-noise.md).
- [`BE-SEC-03` — guarda-chuva residual de autorização contextual CESAD](../backend/tasks/BE-SEC-03-cesad-contextual-authorization.md).
- [`BE-AUDIT-AUTH-01` — auditoria persistida de eventos de autenticação](../backend/tasks/BE-AUDIT-AUTH-01-persisted-auth-audit.md).

## Regra de convivência

- Achados do relatório são **diagnóstico técnico**; conversão em task operacional exige aprovação humana e respeito à regra geral de prevalência de [`../../AGENTS.md`](../../AGENTS.md) e [`../../README.md`](../../README.md).
- O relatório **não** altera workflow, regras jurídicas, CESAD, documentos ou status de tasks.
- Implementações que toquem cookies, CORS, auth, autorização contextual, auditoria ou Prisma devem nascer como task própria, com validações por ambiente.

## Atualização do relatório

Atualizar o relatório (ou criar novo arquivo `relatorio-seguranca-AAAA-MM-DD.md`) quando:

- houver mudança relevante em dependências críticas (Next.js, NestJS, Prisma, runtime Node);
- houver alteração da política de cookies, CORS, sessão, JWT ou autorização contextual;
- houver introdução de novos canais externos (storage, fila, integração assinatura, govbr, e-mail, etc.);
- houver incidente, alerta ou achado externo (`npm audit`, ferramenta de SAST/DAST, pentest, ferramenta de scan de segredos).

Manter sempre o histórico: novos relatórios não devem sobrescrever os anteriores.
