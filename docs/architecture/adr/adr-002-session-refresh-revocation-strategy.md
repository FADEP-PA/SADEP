# ADR-002 — Estratégia de sessão, refresh e revogação

## Status

Proposta aprovada / Decisão arquitetural inicial.

Esta ADR registra a decisão de produção para a frente `BE-ARCH-01E — Definir estratégia de produção para refresh/revogação`.

Ela não implementa refresh token, cookies, revogação, rotação, logout server-side, contratos, migrations, endpoints ou alterações de frontend/backend.

---

## Contexto

A frente `BE-ARCH-01 — Revisar estratégia de autenticação web` foi quebrada em subtasks incrementais.

Já foram concluídas:

- `BE-ARCH-01A — Fechar semântica de sessão web`;
- `BE-ARCH-01B — Revalidar usuário atual no backend`;
- `BE-ARCH-01C — Compartilhar contratos de auth/session`;
- `BE-ARCH-01D — Alinhar frontend de sessão`.

Estado atual consolidado:

- o backend usa bearer JWT como solução transitória;
- o JWT expira em 1 hora;
- o frontend envia o token no header `Authorization: Bearer`;
- o backend revalida usuário vivo em requests autenticadas;
- usuário inexistente, inativo ou com role divergente retorna `401`;
- `/auth/me` é leitura viva do usuário atual;
- o frontend trata `401` de forma centralizada e idempotente;
- o frontend preserva `403`;
- não há refresh token;
- não há revogação;
- não há rotação;
- não há logout server-side;
- o logout atual é limpeza local;
- cookies `HttpOnly` ainda não foram adotados;
- auditoria formal de eventos de autenticação está prevista para `BE-ARCH-01F`.

Essa solução é aceitável para MVP/local assistido, mas não é suficiente para homologação/produção institucional.

---

## Problema

O SADEP é um sistema administrativo formal, com foco em segurança jurídica, rastreabilidade, regras centralizadas no backend e auditoria obrigatória.

Para homologação e produção, a estratégia de sessão precisa permitir:

- reduzir exposição de tokens em ambiente web;
- evitar persistência de access token em storage acessível por JavaScript;
- manter boa experiência de uso sem exigir novo login a cada expiração curta;
- revogar uma sessão específica;
- revogar uma família de refresh tokens quando houver reutilização suspeita;
- executar logout server-side;
- preparar logout de todos os dispositivos;
- preservar a revalidação de usuário vivo já consolidada;
- nascer compatível com auditoria formal futura.

A estratégia atual com bearer JWT de 1 hora não atende todos esses requisitos.

---

## Decisão

O SADEP adotará, para homologação/produção, uma estratégia híbrida com:

- access token curto em memória no frontend;
- refresh token opaco em cookie `HttpOnly`;
- cookie `Secure` e `SameSite` adequado ao ambiente;
- refresh token salvo no banco apenas como hash;
- rotação de refresh token a cada refresh;
- revogação por sessão/família;
- logout server-side;
- logout-all em etapa posterior;
- auditoria formal em `BE-ARCH-01F`.

O bearer JWT atual permanece apenas como solução transitória de MVP/local assistido.

O access token não deve permanecer em `localStorage` ou `sessionStorage` em homologação/produção.

O refresh token não deve trafegar em JSON.

---

## Estratégia por ambiente

### MVP/local assistido

- manter bearer JWT transitório;
- manter expiração atual enquanto não houver refresh implementado;
- manter `/auth/me` como leitura viva do usuário atual;
- manter `401` centralizado e `403` preservado no frontend;
- documentar que token em storage JS é aceitável apenas nesse recorte assistido.

### Homologação

- implementar refresh token opaco em cookie `HttpOnly`;
- usar access token curto em memória;
- habilitar `credentials` em CORS e no frontend;
- configurar cookies de forma compatível com o domínio de homologação;
- usar HTTPS;
- implementar rotação e revogação por sessão/família;
- implementar logout server-side;
- preparar eventos e metadados para auditoria formal.

### Produção

- exigir HTTPS;
- usar `Secure=true`;
- usar `HttpOnly=true`;
- usar `SameSite=Lax` quando frontend e backend forem same-site;
- usar `SameSite=None; Secure` somente se houver cross-site real;
- manter origem CORS explícita;
- nunca usar cookie inseguro;
- manter access token curto;
- revogar família/sessão em reutilização de refresh token;
- manter compatibilidade com auditoria, suporte operacional e investigação de incidentes.

---

## Alternativas consideradas

### A — Bearer JWT curto sem refresh

Características:

- access token curto;
- sem refresh token;
- logout local;
- backend revalida usuário vivo;
- sessão expira naturalmente.

Vantagens:

- simples;
- baixo impacto;
- pouca mudança no backend;
- pouca mudança no frontend.

Limites:

- UX ruim se o token for realmente curto;
- não resolve token em storage JS;
- não permite revogação por sessão;
- não permite logout server-side;
- não permite rotação;
- depende apenas da expiração natural do token.

Conclusão:

- aceitável para MVP/local assistido;
- insuficiente para produção institucional.

### B — Access token curto + refresh token HttpOnly

Características:

- access token curto;
- refresh token opaco em cookie `HttpOnly`;
- rotação de refresh token;
- logout server-side;
- revogação por sessão/família;
- proteção CSRF e CORS a configurar.

Vantagens:

- melhora a segurança contra roubo de refresh token por XSS;
- reduz necessidade de access token persistido em storage JS;
- permite UX adequada com refresh silencioso;
- permite revogação por sessão;
- permite logout server-side;
- permite detecção de reutilização de refresh token.

Custos:

- exige modelagem de sessão;
- exige cookie, CORS e variáveis de ambiente específicas;
- exige cuidado com CSRF;
- exige controle de requests concorrentes no frontend;
- exige contratos adicionais.

Conclusão:

- recomendada como base da estratégia.

### C — Sessão server-side com cookie

Características:

- cookie de sessão;
- estado de sessão no servidor;
- backend controla expiração e revogação;
- frontend não manipula access token.

Vantagens:

- forte controle server-side;
- modelo claro de revogação;
- reduz manipulação de tokens no frontend.

Custos:

- mudança mais ampla no desenho atual;
- maior refactor de frontend/backend;
- possível reorientação dos guards e contratos;
- impacto maior no MVP já consolidado.

Conclusão:

- pode ser considerada em evolução futura;
- não é o caminho incremental recomendado agora.

### Estratégia híbrida adotada

A estratégia adotada combina:

- access JWT curto em memória;
- refresh token opaco em cookie `HttpOnly`;
- rotação;
- revogação por sessão/família;
- logout server-side.

Ela preserva a base já construída com bearer access token e `/auth/me`, mas remove a persistência do access token em storage JS para homologação/produção.

Essa opção oferece o melhor equilíbrio entre segurança, UX e evolução incremental.

---

## Estratégia adotada

Diretrizes obrigatórias para implementação futura:

- access token deve ter vida curta;
- access token deve ficar em memória no frontend em homologação/produção;
- refresh token deve ser opaco;
- refresh token deve ser entregue por cookie `HttpOnly`;
- refresh token não deve trafegar em JSON;
- refresh token deve ser persistido somente como hash;
- refresh token deve rotacionar a cada refresh;
- reutilização de refresh token deve revogar a família/sessão;
- logout server-side deve revogar a sessão atual;
- logout-all pode ser implementado após o mínimo seguro;
- `/auth/me` deve continuar sendo leitura viva do usuário atual;
- usuário removido, inativo ou com role divergente deve continuar gerando `401`;
- `403` deve continuar representando falta de autorização, sem limpeza automática de sessão;
- a modelagem deve nascer compatível com auditoria formal futura.

---

## Modelagem futura prevista

A implementação futura provavelmente exigirá uma entidade como `UserSession`.

Campos previstos:

- `id`;
- `userId`;
- `refreshTokenHash`;
- `familyId`;
- `createdAt`;
- `expiresAt`;
- `revokedAt`;
- `revokedReason`;
- `rotatedAt`;
- `userAgent`;
- `ipAddress`;
- metadados mínimos para auditoria futura.

Observações:

- não criar migration nesta ADR;
- não criar tabela nesta ADR;
- a modelagem deve funcionar em SQLite no desenvolvimento local;
- a modelagem deve permanecer adequada para PostgreSQL em homologação/produção;
- revogação individual de access token não é prioridade inicial;
- a revogação deve ocorrer por sessão/família de refresh token.

---

## Endpoints futuros previstos

Endpoints candidatos:

- `POST /auth/refresh`;
- `POST /auth/logout`;
- `POST /auth/logout-all`;
- `GET /auth/sessions`;
- `DELETE /auth/sessions/:id`.

Prioridade mínima futura:

1. `POST /auth/refresh`;
2. `POST /auth/logout`;
3. rotação de refresh token;
4. revogação por sessão/família.

Podem ficar para etapa posterior:

- `POST /auth/logout-all`;
- `GET /auth/sessions`;
- `DELETE /auth/sessions/:id`.

---

## Impacto frontend

A implementação futura exigirá:

- access token em memória;
- remoção do access token persistido em `localStorage`/`sessionStorage` para homologação/produção;
- `credentials: include` em chamadas que dependam de cookie;
- refresh silencioso;
- proteção contra refresh storm por single-flight;
- retry controlado após refresh;
- logout server-side;
- revisão do papel de `rememberMe`;
- manutenção da UX de sessão expirada;
- preservação de `403` como falta de permissão;
- invalidação idempotente de sessão quando refresh falhar.

`rememberMe` deve deixar de escolher storage JS e passar a influenciar a duração da sessão/refresh token, conforme política institucional.

Nenhuma alteração frontend é feita por esta ADR.

---

## Impacto backend

A implementação futura exigirá:

- modelagem de sessão/refresh;
- geração de refresh token opaco;
- hashing do refresh token antes de persistir;
- endpoint de refresh;
- endpoint de logout;
- rotação de refresh token;
- revogação por sessão/família;
- detecção de reutilização de refresh token;
- validação de cookie;
- emissão e limpeza de cookie;
- configuração CORS com credentials;
- variáveis de ambiente específicas;
- testes de expiração, rotação, revogação e concorrência;
- preservação da revalidação de usuário vivo.

Nenhuma alteração backend é feita por esta ADR.

---

## Impacto em contracts

A implementação futura poderá exigir contratos como:

- `RefreshResponse`;
- `LogoutResponse`;
- `SessionInfo`;
- `AuthSessionState`;
- `AuthErrorCode`.

Diretrizes:

- não criar `RefreshRequest` se o refresh vier exclusivamente por cookie;
- evitar `TokenPair` se o refresh token não trafegar em JSON;
- manter tipagem compartilhada onde houver payload de resposta;
- coordenar mudanças com `BE-ARCH-02`, pois essa frente trata a estabilidade dos packages compartilhados;
- a ADR não depende da conclusão de `BE-ARCH-02`.

Nenhuma alteração de contracts é feita por esta ADR.

---

## Impacto em segurança

Riscos mitigados pela estratégia:

- exposição prolongada de access token em storage JS;
- ausência de revogação por sessão;
- logout apenas local;
- reutilização silenciosa de refresh token;
- sessão ativa após incidente em um dispositivo específico;
- inconsistência entre usuário atual e token antigo, preservando a revalidação viva já existente.

Riscos novos ou cuidados:

- CSRF em endpoints baseados em cookie;
- configuração incorreta de CORS com credentials;
- configuração incorreta de `SameSite`;
- refresh storm em múltiplas requests concorrentes;
- falhas operacionais em ambientes sem HTTPS;
- uso indevido de cookie inseguro fora de localhost.

Cuidados obrigatórios:

- `HttpOnly=true`;
- `Secure=true` em homologação/produção;
- `SameSite` adequado;
- origem CORS explícita;
- refresh token opaco;
- hash de refresh token no banco;
- rotação em todo refresh;
- revogação de família/sessão em reutilização;
- access token curto;
- logs e auditoria sem armazenar token puro.

---

## Impacto em auditoria

`BE-ARCH-01F` cuidará da auditoria formal de autenticação.

Mesmo assim, a modelagem da `BE-ARCH-01E` deve nascer compatível com auditoria.

Eventos candidatos para `BE-ARCH-01F`:

- login bem-sucedido;
- login falho;
- refresh bem-sucedido;
- refresh falho;
- token rotacionado;
- reutilização detectada;
- sessão revogada;
- logout;
- logout-all;
- sessão rejeitada por usuário inativo;
- sessão rejeitada por usuário removido;
- sessão rejeitada por divergência de role.

Metadados mínimos esperados:

- usuário, quando identificável;
- role, quando identificável;
- data/hora;
- ação;
- sessão afetada, quando aplicável;
- família de token, quando aplicável;
- IP;
- user-agent;
- motivo da rejeição/revogação, quando aplicável.

---

## Dependências operacionais

Decisões e pendências operacionais:

- HTTPS obrigatório em homologação/produção;
- `Secure=true` em produção;
- `HttpOnly=true`;
- `SameSite=Lax` se frontend/backend forem same-site;
- `SameSite=None; Secure` apenas se houver cross-site real;
- CORS com origem explícita;
- CORS com `credentials: true`;
- frontend usando `credentials: include` quando depender de cookie;
- localhost pode usar `COOKIE_SECURE=false`;
- produção nunca deve usar cookie inseguro.

Variáveis adotadas no recorte incremental:

- `ACCESS_TOKEN_TTL`;
- `REFRESH_TOKEN_TTL`;
- `REFRESH_COOKIE_NAME`;
- `COOKIE_DOMAIN`;
- `COOKIE_SECURE`;
- `COOKIE_SAMESITE`.

Ambientes de deploy, como Railway/Vercel ou equivalentes, devem garantir domínio, HTTPS e comportamento previsível de cookies antes da homologação institucional.

---

## Fora do escopo desta ADR

Esta ADR não faz:

- alteração em código;
- alteração em backend;
- alteração em frontend;
- alteração em contracts;
- alteração em Prisma;
- migrations;
- criação de tabelas;
- criação de endpoints;
- cookies reais;
- refresh real;
- revogação real;
- logout server-side real;
- auditoria formal;
- alteração de permissões;
- alteração de workflow;
- alteração de CESAD;
- alteração de status de tasks não relacionadas.

---

## Consequências

Consequências positivas:

- registra uma direção institucional para sessão web;
- separa MVP/local assistido de homologação/produção;
- reduz risco futuro de implementar refresh de modo ad hoc;
- orienta modelagem, contracts, frontend, backend e operação;
- preserva o caminho incremental já consolidado nas subtasks anteriores;
- prepara a integração com auditoria formal.

Custos e trade-offs:

- aumenta complexidade de autenticação;
- exige banco para sessão/refresh;
- exige cuidado operacional com cookies, CORS e HTTPS;
- exige alteração coordenada de frontend/backend/contracts;
- exige testes de concorrência e expiração;
- exige política institucional de duração de sessão.

Risco aceito temporariamente:

- bearer JWT atual com storage JS permanece aceitável somente no recorte MVP/local assistido até implementação da estratégia desta ADR.

---

## Próximas subtasks

Subtasks propostas:

- `BE-ARCH-01E1 — Registrar ADR de estratégia de sessão em produção`;
- `BE-ARCH-01E2 — Modelar sessão e refresh token`;
- `BE-ARCH-01E3 — Implementar refresh, rotação e logout server-side`;
- `BE-ARCH-01E4 — Alinhar frontend para access em memória e refresh silencioso`;
- `BE-ARCH-01E5 — Hardening operacional de cookies/CORS/env` concluida no recorte backend;
- `BE-ARCH-01F — Auditar e testar eventos de autenticação` concluida no recorte backend.
