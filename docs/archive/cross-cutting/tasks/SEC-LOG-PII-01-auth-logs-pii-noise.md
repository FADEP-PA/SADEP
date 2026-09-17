# SEC-LOG-PII-01 — Reduzir PII e ruido em logs

## Status

**Encerrado** (2026-06-29). E-mails mascarados via `maskEmail()` em `auth.service.ts`; `GlobalExceptionFilter` corrigido para logar 5xx como `error` com stack, 401/403 como `debug` e demais 4xx como `warn` sem stack.

## Area

Seguranca, backend, auth/session, observabilidade e compliance.

## Contexto

A varredura global confirmou que os logs estruturados de auth nao expõem senha, access token ou refresh token, mas ainda podem registrar e-mail em eventos de autenticacao.

Tambem foi observado que o filtro global pode registrar stacks/mensagens de erros esperados, como `401` e `403`, gerando ruido operacional e possivel exposicao indevida de detalhes.

## Escopo previsto

- revisar eventos de auth que usam e-mail ou identificadores pessoais;
- reduzir ou pseudonimizar PII quando possivel;
- diferenciar logs esperados de seguranca/autorizacao de erros inesperados;
- preservar rastreabilidade minima para investigacao e auditoria;
- alinhar com `SEC-HARD-01` e `BE-AUDIT-AUTH-01`.

## Fora do escopo

- remover auditoria obrigatoria;
- alterar politica juridica/processual;
- implementar SIEM completo;
- substituir auditoria persistida futura de `BE-AUDIT-AUTH-01`.

## Criterios de aceite

- logs de auth nao expõem PII desnecessaria;
- erros esperados nao poluem logs como falhas inesperadas;
- testes existentes continuam cobrindo ausencia de senha e tokens em logs;
- criterios de auditoria e seguranca ficam documentados.

## Proxima acao

Tratar junto ao primeiro recorte de `SEC-HARD-01`, preferencialmente antes de homologacao/producao.
