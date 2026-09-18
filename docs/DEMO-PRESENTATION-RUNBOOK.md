# SADEP — Roteiro da apresentação

Este roteiro cobre o fluxo funcional mínimo da demonstração:

`Chefia → Servidor → Chefia → CESAD → parecer da etapa → Etapa 2`.

## 1. Preparar o ambiente

Use um banco limpo sempre que possível.

```bash
docker compose up -d
npm run backend:bootstrap
npm run backend:start:dev
npm run frontend:start:dev
```

O bootstrap aplica migrations, executa o seed e valida o banco.

A senha das contas de desenvolvimento vem de `DEV_SEED_PASSWORD`. Não registrar a senha neste documento.

## 2. Contas da demo

- Chefia: `supervisor@sadep.local`
- Servidor: `server@sadep.local`
- CESAD presidente: `cesad1@sadep.local`
- CESAD titular: `cesad2@sadep.local`
- CESAD titular: `cesad3@sadep.local`

O seed também possui `cesad4@sadep.local` e `cesad5@sadep.local` como suplentes.

O frontend não deve exigir que o apresentador copie o ID interno do processo.

## 3. Chefia — enviar avaliação

Rota: `/chefia-imediata`

1. Entrar como `supervisor@sadep.local`.
2. O servidor do processo seedado deve aparecer no painel.
3. Abrir a ação **Avaliar**.
4. Preencher os campos obrigatórios.
5. Clicar em **Enviar para assinatura**.
6. Confirmar que o processo passa a aguardar a ciência do servidor.
7. Recarregar a página para provar persistência.

## 4. Servidor — ciência e autoavaliação

Rota: `/servidor-estagiario`

1. Sair da Chefia e entrar como `server@sadep.local`.
2. O processo deve abrir automaticamente.
3. Confirmar que a avaliação da Chefia está visível.
4. Clicar em **Confirmar ciência**.
5. Recarregar e confirmar que a ciência continua registrada.
6. Abrir/preencher a autoavaliação.
7. Opcionalmente clicar em **Salvar rascunho**, recarregar e mostrar a persistência.
8. Clicar em **Enviar autoavaliação para a Chefia**.
9. Recarregar e confirmar que a autoavaliação está enviada e bloqueada para edição.

## 5. Chefia — confirmar autoavaliação

Rota: `/chefia-imediata`

1. Entrar novamente como `supervisor@sadep.local`.
2. O painel deve indicar **Confirmar autoavaliação**.
3. Abrir o processo.
4. Conferir a autoavaliação enviada.
5. Clicar em **Confirmar recebimento / Dar OK**.
6. O backend deve encaminhar o mesmo processo para `EM_ANALISE_CESAD`.
7. Recarregar antes de trocar de perfil.

## 6. CESAD — analisar e concluir parecer

Rota: `/cesad-comissao`

1. Entrar com um membro CESAD do seed.
2. O processo em `EM_ANALISE_CESAD` deve ser localizado automaticamente.
3. Confirmar que a avaliação da Chefia e a autoavaliação do Servidor estão visíveis.
4. Preencher o parecer da etapa.
5. Opcionalmente salvar um rascunho e recarregar.
6. Clicar em **Concluir parecer**.
7. Clicar em **Preparar confirmações** quando a ação estiver disponível.

## 7. Confirmações colegiadas

A comissão de desenvolvimento possui presidente e titulares reais no seed. Não existe bypass de assinatura.

Para cada signatário exigido pelo backend:

1. Entrar com a conta indicada na tela.
2. Abrir o mesmo processo.
3. Clicar em **Confirmar parecer**.
4. Confirmar que nome, status e data/hora ficaram persistidos.
5. Repetir até a interface informar **Todas as confirmações concluídas**.

Na composição padrão do seed, verificar `cesad1@sadep.local`, `cesad2@sadep.local` e `cesad3@sadep.local` conforme a lista de expected signers retornada pelo backend.

## 8. Emitir parecer e concluir Etapa 1

Quando todas as confirmações estiverem concluídas:

1. Clicar em **Emitir parecer da etapa**.
2. Confirmar status `PARECER_EMITIDO`.
3. Clicar em **Concluir etapa**.
4. Confirmar a mensagem de conclusão.
5. O processo deve retornar para `EM_AVALIACAO`.
6. A Etapa 1 deve possuir `endedAt`.
7. A Etapa 2 deve possuir `startedAt` e permanecer aberta.

## 9. Gates antes da apresentação

Na revisão final da branch/develop:

```bash
npm run typecheck --workspace @sadep/backend
npm run typecheck --workspace @sadep/frontend
npm run test:integration --workspace @sadep/backend
npm run test:unit --workspace @sadep/backend
npm run test:run --workspace @sadep/frontend
npm run build --workspace @sadep/backend
npm run build --workspace @sadep/frontend
npm run build --workspace @sadep/contracts
git diff --check
```

A suíte de integração contém um smoke E2E HTTP que percorre o mesmo processo por Chefia, Servidor e CESAD até a abertura da Etapa 2.

## 10. Prioridade em caso de problema durante a apresentação

Não desviar para parecer conclusivo final, homologação, recursos, portaria, DOE ou GOV.BR.

Prioridade:

1. Chefia envia avaliação.
2. Servidor confirma ciência e envia autoavaliação.
3. Chefia confirma e o processo chega à CESAD.
4. CESAD visualiza os dois instrumentos e conclui o parecer.
5. Confirmações, emissão e conclusão da etapa são a continuação do mesmo fluxo.
