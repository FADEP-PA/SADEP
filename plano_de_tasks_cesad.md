# Plano de Ação: Alterações na Comissão CESAD

Para garantirmos estabilidade e seguirmos a arquitetura do projeto (como ditam os princípios do SADEP), o ideal é quebrarmos essas mudanças em **várias tasks menores e sequenciais**. Fazer tudo em uma única task (ou Pull Request) tornaria o código difícil de revisar e aumentaria o risco de quebrar o sistema.

Abaixo está a sugestão de como podemos dividir o trabalho em **4 tasks principais**:

## Task 1: Banco de Dados e Contratos (Fundação)

Esta é a base para o restante do trabalho. Vamos alterar a infraestrutura de dados e as definições de tipagem.

- **Prisma Schema (`schema.prisma`):**
  - Adicionar a opção `PRESIDENTE` no enum `CesadCommissionMemberRoleType`.
  - Adicionar os campos `registration` (matrícula), `bond` (vínculo) e `position` (cargo) na tabela `User` (ou criar os campos de snapshot na tabela `CesadCommissionMember` para garantir a segurança jurídica em caso de mudança de cargo no futuro).
  - Remover o campo `year` isolado de `CesadCommissionAct` e tornar `publishedAt` obrigatório (ou usar uma lógica de extração temporal).
- **Gerar Migration:** Rodar os comandos para criar a migration no banco de dados.
- **Contratos (`packages/contracts`):**
  - Atualizar as tipagens dos DTOs (`CesadCommissionWrite`, `CesadCommissionMember`, `CesadCommissionAct`, etc.) para refletirem as novas propriedades.

## Task 2: Backend (Domínio e Serviços)

Aqui vamos implementar a lógica de negócio seguindo a camada de aplicação/domínio.

- **Geração Automática do Nome:** Modificar o serviço de criação da comissão (`cesad-commissions.service.ts`) para gerar o `name` automaticamente no formato `cesad-nº-ano`, extraindo o ano da data de publicação.
- **Atualização das Entidades:** Mapear as novas propriedades de matrícula, vínculo, cargo e função nas entidades de domínio (`CesadCommissionMember.entity.ts`, etc.).
- **Regras de Negócio e Auditoria:** Garantir que as validações continuem funcionando e que os eventos de auditoria salvem os novos estados corretamente.
- **Testes Unitários:** Atualizar os testes dos serviços impactados.

## Task 3: Backend (Endpoints da API)

Esta task expõe as novas lógicas para o frontend consumir.

- **Controllers:** Atualizar os endpoints de `cesad-commission-acts` e `cesad-commission-members` para aceitarem os novos campos e removerem campos obsoletos (como o `year` no ato).
- **Validações:** Atualizar as classes de DTOs do NestJS (`create-cesad-commission.dto.ts`, etc.) e os decorators de validação (ex: `@IsString()`, `@IsDate()`).

## Task 4: Frontend (Interface do Usuário)

Por fim, atualizamos a interface visual para refletir todas as mudanças consumindo os novos endpoints.

- **Formulário de Comissão/Ato:** Remover o campo "Ano", substituindo-o pelo uso da "Data da Publicação" (`cesad-commission-act-form-scaffold.tsx`).
- **Tabela de Membros:** Atualizar o arquivo `cesad-commission-members-table.tsx` para renderizar as colunas: Nome, Matrícula, Vínculo, Cargo e Função.
- **Formulário de Composição:** Adicionar as novas opções de seleção (dropdown contendo Titular, Presidente e Suplente).
- **Visualização do Nome:** Ajustar a exibição do nome da comissão para consumir o valor gerado pelo backend.

---

### Por que várias tasks?

- **Segurança Jurídica:** O sistema é fortemente baseado em auditoria e máquina de estados. Mexer no backend em pedaços isolados garante que as regras vitais do SADEP não sejam violadas.
- **Testabilidade:** Podemos validar que o banco e a API respondem perfeitamente antes de nos preocuparmos com bugs visuais do React.

Podemos seguir com a **Task 1**? Se sim, me confirme apenas se você prefere salvar Matrícula/Vínculo/Cargo apenas no **Usuário** ou se fazemos um **Snapshot na Comissão** (para manter o histórico imutável).
