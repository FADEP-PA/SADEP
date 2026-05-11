# BE-AUDIT-AUTH-01 — Auditoria persistida de eventos de autenticacao

## Status

Melhoria futura.

## Area

Backend, autenticacao, auditoria e seguranca.

## Contexto

`BE-ARCH-01F` foi concluida no recorte de logs estruturados e testes de autenticacao. Essa conclusao nao equivale a auditoria institucional persistida de eventos de autenticacao.

Esta task registra a evolucao futura para persistir eventos relevantes de auth quando a politica de auditoria do projeto exigir esse nivel de rastreabilidade.

## Escopo previsto

- avaliar se eventos de auth devem usar `AuditEvent` ou modelo especifico;
- persistir eventos de login bem-sucedido e falho;
- persistir refresh aceito, rejeitado e rotacionado;
- persistir reuso detectado e revogacao por familia;
- persistir logout efetivo e logout idempotente relevante;
- registrar metadados minimos sem armazenar senha, access token ou refresh token puro;
- criar testes para persistencia e ausencia de dados sensiveis.

## Fora do escopo

- reabrir `BE-ARCH-01F`;
- alterar politica de cookies/CORS/env;
- implementar SIEM externo;
- alterar workflow processual, CESAD, documentos ou homologacao;
- armazenar tokens ou senhas em texto puro.

## Criterios de aceite

- eventos persistidos possuem usuario quando identificavel, role, data/hora, acao, sessao/familia quando aplicavel, IP/user-agent quando disponiveis e motivo de rejeicao/revogacao;
- dados sensiveis nao aparecem em log persistido;
- testes cobrem sucesso, falha, refresh, reuso e logout;
- a documentacao deixa claro o limite entre log operacional e auditoria persistida.

## Validacoes esperadas

- `npm run typecheck --workspace @sadep/backend`;
- `npm run typecheck:spec --workspace @sadep/backend`;
- testes backend de auth/auditoria;
- `npm run test --workspace @sadep/backend`;
- `git diff --check`.

## Dependencias

- `BE-ARCH-01F` concluida no recorte de logs/testes;
- politica de auditoria persistida do projeto;
- possivel revisao de `AuditEvent`.

## Proxima acao

Definir se eventos de autenticacao devem compartilhar `AuditEvent` ou ter modelo proprio antes de qualquer implementacao.
