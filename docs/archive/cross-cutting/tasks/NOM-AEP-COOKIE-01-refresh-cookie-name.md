# NOM-AEP-COOKIE-01 — Nomenclatura residual do cookie de refresh

## Status

Melhoria futura.

## Area

Cross-cutting, nomenclatura, auth/session e operacao.

## Contexto

O repositório mantém o nome histórico AEP-PA, enquanto packages/workspaces usam `@sadep/*`. A varredura global confirmou que o cookie default de refresh ainda pode usar `aep_pa_refresh`.

Essa pendencia deve ser tratada como ajuste pequeno e controlado, sem migracao ampla AEP -> SADEP.

## Escopo previsto

- avaliar renomeacao futura do cookie default para nomenclatura SADEP;
- definir estrategia de compatibilidade para usuarios/sessoes existentes, se necessario;
- atualizar documentacao de env e operacao;
- validar login, refresh e logout apos a mudanca.

## Fora do escopo

- renomear o cookie nesta atualizacao documental;
- migracao ampla AEP -> SADEP;
- trocar `@sadep/contracts` por nomenclatura antiga de contracts;
- alterar workflow, CESAD, documentos ou regras processuais;
- remover suporte legado sem decisao explicita.

## Criterios de aceite

- novo nome default fica definido e documentado;
- estrategia de transicao evita quebrar sessoes de forma silenciosa quando aplicavel;
- ambientes locais/homologacao/producao ficam alinhados;
- testes de auth/session passam.

## Validacoes esperadas

- `npm run typecheck --workspace @sadep/backend`;
- testes backend de auth/session;
- `npm run frontend:check`, se houver impacto frontend;
- `git diff --check`.

## Dependencias

- decisao explicita de nomenclatura;
- janela segura para mudanca de cookie;
- `BE-ARCH-01E5` ja concluida no recorte de cookies/CORS/env.

## Proxima acao

Manter ativo ate uma task tecnica especifica aprovar a renomeacao controlada do cookie.
