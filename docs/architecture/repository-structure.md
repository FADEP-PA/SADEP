# Estrutura inicial do repositório (MVP)

Este documento registra a organização base do monorepo para o SADEP, com separação entre:

- `apps/frontend` (interface por perfil)
- `apps/backend` (domínio, workflow, aplicação, infraestrutura e API)
- `apps/worker` (estrutura reservada para processamento assincrono futuro)
- `apps/cron` (estrutura reservada para rotinas agendadas futuras)
- `packages/contracts` (contratos compartilhados)
- `packages/config` (configuração comum)

Escopo desta etapa: apenas estrutura de diretorios/arquivos, sem codigo de implementacao. A varredura `BE-TECH-02` confirmou que worker e cron nao possuem execucao operacional no MVP.
