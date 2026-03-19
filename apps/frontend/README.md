# Frontend (Next.js)

Interface operacional desacoplada para os perfis:
- servidor-estagiário
- chefia imediata
- CESAD/comissão
- autoridade homologadora

Sem lógica de negócio nesta fase (somente estrutura).

## Estrutura inicial

O frontend está organizado em camadas mínimas para permitir evolução incremental:

- `src/app`: composição de rotas, layout global e entrypoints do App Router.
- `src/features`: funcionalidades orientadas ao domínio, como autenticação.
- `src/shared`: estilos globais, utilitários e recursos reutilizáveis.

## Convenções iniciais

- Rotas devem ficar em `src/app`.
- Telas específicas de uma funcionalidade devem ser montadas em `src/features`.
- Recursos transversais, como estilos e helpers, devem ficar em `src/shared`.
