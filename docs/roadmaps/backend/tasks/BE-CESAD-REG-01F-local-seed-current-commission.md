# BE-CESAD-REG-01F — Seed local mínimo de comissão CESAD

**Dev:** Edgar

**Status:** Concluído

**Depende de:** BE-CESAD-REG-01A, BE-CESAD-REG-01B (modelo de criação estável)

---

## Objetivo

Criar seed local mínimo que permita testar fluxos CESAD com uma comissão vigente, ato formal e composição mínima de titulares e suplentes.

---

## Fora do escopo

- Endpoint de cadastro
- Frontend
- Dados reais de servidores ou portarias reais
- Rollover
- Homologação, notificação ou ciência

---

## Pré-condições

- Definição de contracts/payloads em 01A
- Preferencialmente implementação de criação em 01B, para que o seed use o mesmo padrão de domínio

---

## Dados esperados

- Comissão local com nome identificável como ambiente de desenvolvimento
- Ato fictício com tipo, número, ano e vigência
- 3 usuários `CESAD_MEMBER` titulares
- 2 usuários `CESAD_MEMBER` suplentes
- 1 usuário `COMMISSION_ASSISTANT` separado, sem vínculo como membro formal

---

## Regras de segurança

- Seed deve falhar em `NODE_ENV=production`
- Não usar dados reais
- Senha deve continuar vindo de variável local segura, como já ocorre no seed atual
- Seed deve ser idempotente

---

## Implementação

- [x] Criar ou atualizar seed apenas para ambiente de desenvolvimento/local
- [x] Cadastrar comissão CESAD vigente com nome identificável
- [x] Cadastrar ato/portaria local de exemplo
- [x] Vincular 3 titulares `CESAD_MEMBER`
- [x] Vincular 2 suplentes `CESAD_MEMBER`
- [x] Criar usuário `COMMISSION_ASSISTANT` separado (sem vínculo como membro)
- [x] Garantir seed idempotente (rodar duas vezes sem duplicar dados)
- [x] Falhar explicitamente em `NODE_ENV=production`

---

## Validações após seed

- [x] Rodar seed duas vezes e confirmar ausência de duplicação
- [x] `GET /cesad/commissions/current` retorna a comissão local vigente
- [x] Composição contém 3 titulares e 2 suplentes
- [x] `COMMISSION_ASSISTANT` existe como usuário mas não como membro formal
- [x] Banco local passa em `db:check` (se aplicável)

---

## Critérios de aceite

- [x] Ambiente local possui comissão CESAD funcional para testes manuais
- [x] Seed não usa dados reais
- [x] Seed não executa em produção
- [x] Fluxos de leitura CESAD continuam funcionando após seed

---

## Paralelização

Pode ser preparada em paralelo com frontend demonstrativo e documentação, mas a implementação deve aguardar a estabilização do modelo de criação da comissão.
