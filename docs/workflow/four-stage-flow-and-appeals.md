# AEP-PA — Fluxo do Caso 2 com 4 Etapas e Regras de Recursos

**Status:** Aprovado para referência de projeto  
**Versão:** 1.0.0  
**Data:** 2026-03-27  
**Escopo:** Regras processuais do Caso 2 com 4 etapas, pareceres, homologação e recursos  
**Aplicação:** Backend, frontend, workflow, auditoria e prompts de implementação

---

## 1. Objetivo

Este documento define o fluxo processual oficial do AEP-PA para o **Caso 2 com 4 etapas**, incluindo:

- estrutura do processo em etapas;
- ciclo documental mínimo de cada etapa;
- parecer CESAD por etapa;
- parecer conclusivo final;
- trava de homologação;
- regras mínimas de recurso por etapa;
- regras mínimas de recurso final;
- efeitos processuais da reavaliação substitutiva.

Este documento serve como referência normativa para implementação controlada do workflow e deve evitar interpretações ambíguas na evolução do backend e do frontend.

---

## 2. Regra estrutural do Caso 2

### 2.1. Processo único com quatro etapas internas

No Caso 2, o AEP-PA representa:

- **um único processo administrativo**;
- com **quatro etapas avaliativas internas**;
- cada etapa com ciclo documental próprio;
- e consolidação final somente após a conclusão das quatro etapas.

### 2.2. Princípio de progressão

O processo evolui de forma progressiva:

1. execução da etapa 1;
2. execução da etapa 2;
3. execução da etapa 3;
4. execução da etapa 4;
5. parecer conclusivo final;
6. homologação;
7. notificação;
8. ciência;
9. publicação, quando cabível.

### 2.3. Regra de não antecipação

Etapas posteriores não devem ser tratadas como concluídas antes da completude formal das etapas anteriores, salvo regra expressa de negócio futura.

---

## 3. Ciclo mínimo de cada etapa

Cada etapa do processo deve conter, no mínimo:

1. **avaliação da chefia**
2. **assinatura do servidor na avaliação**
3. **autoavaliação**
4. **assinatura da chefia na autoavaliação**
5. **parecer CESAD da etapa**

### 3.1. Completude da etapa

Uma etapa só pode ser considerada documentalmente completa quando os artefatos obrigatórios daquela etapa estiverem concluídos segundo a regra vigente do sistema.

### 3.2. Independência relativa

Cada etapa possui seu próprio ciclo documental, mas continua vinculada ao mesmo processo administrativo.

### 3.3. Histórico

Todos os artefatos da etapa devem permanecer historicamente rastreáveis, mesmo quando houver reavaliação ou substituição formal posterior.

---

## 4. Parecer CESAD de etapa

### 4.1. Natureza

O parecer CESAD de etapa é o parecer produzido pela comissão sobre uma etapa específica do processo.

### 4.2. Escopo

O parecer de etapa deve estar vinculado explicitamente a:

- um processo;
- uma etapa;
- um número de etapa (`1`, `2`, `3` ou `4`).

### 4.3. Regras mínimas

O parecer de etapa:

- não substitui avaliação da chefia ou autoavaliação;
- não altera diretamente documentos já assinados;
- deve resultar da leitura consolidada da etapa;
- deve possuir trilha de assinatura própria;
- deve ser auditável.

### 4.4. Emissão formal

O parecer de etapa só deve ser considerado formalmente emitido após a conclusão das assinaturas obrigatórias da CESAD, conforme a regra que vier a ser implementada.

---

## 5. Parecer CESAD conclusivo final

### 5.1. Natureza

O parecer conclusivo final é o parecer consolidado da CESAD sobre o processo como um todo.

### 5.2. Condição de habilitação

O parecer conclusivo final só pode ser iniciado quando houver, no mínimo:

- quatro etapas realizadas;
- quatro etapas aptas segundo a regra documental vigente;
- pareceres de etapa emitidos, conforme a política adotada pelo sistema.

### 5.3. Conteúdo consolidado mínimo

O parecer conclusivo final deve consolidar, no mínimo:

- histórico das quatro etapas;
- resultados das etapas;
- resultado parcial, quando aplicável;
- resultado final consolidado;
- pontuação geral final, quando aplicável;
- conceito final;
- conclusão final da CESAD;
- recomendação final para homologação.

### 5.4. Relação com os pareceres de etapa

O parecer conclusivo final:

- **não substitui** os pareceres de etapa;
- atua como documento consolidado final;
- é a base formal para a homologação.

---

## 6. Trava de homologação

### 6.1. Regra principal

A homologação final só pode ser habilitada quando houver:

- quatro etapas realizadas;
- quatro etapas documentalmente completas;
- parecer conclusivo final emitido.

### 6.2. Efeitos da trava

Antes dessa condição, o sistema não deve:

- habilitar a fila da autoridade homologadora;
- permitir homologação final;
- gerar notificação final;
- liberar publicação de portaria.

### 6.3. Base formal da homologação

A autoridade homologadora deve atuar sobre o **parecer conclusivo final**, e não sobre parecer isolado de etapa, salvo regra excepcional futura.

---

## 7. Recurso por etapa

### 7.1. Cabimento

Há recurso por etapa.

O recurso por etapa é cabível contra:

- o resultado da etapa; e/ou
- o parecer da CESAD da etapa.

### 7.2. Legitimado

O recurso por etapa é apresentado pelo:

- **servidor-estagiário**

### 7.3. Destinatário

O recurso por etapa é dirigido à:

- **CESAD**

### 7.4. Marco inicial do prazo

O prazo recursal da etapa começa a contar da:

- ciência/visualização pelo servidor do resultado da etapa em seu perfil;
- especialmente do recebimento/visualização do parecer da comissão no sistema.

### 7.5. Prazo

O prazo para recurso por etapa é de:

- **5 dias**

### 7.6. Comportamento do sistema

Durante o prazo, o sistema deve:

- exibir ao servidor a possibilidade de recorrer;
- mostrar a data-limite para recurso;
- exibir contador regressivo ou indicador equivalente.

Após o prazo, o sistema deve:

- desabilitar a opção de recurso da etapa.

### 7.7. Efeito processual

O recurso por etapa suspende a fase contestada no ponto cabível até a sua resolução.

---

## 8. Tramitação do recurso por etapa

### 8.1. Análise inicial pela CESAD

Após o protocolo do recurso, a CESAD analisa o pedido e gera um **despacho para a chefia imediata**.

### 8.2. Função do despacho da CESAD

O despacho da CESAD:

- registra a análise inicial do recurso;
- encaminha a controvérsia à chefia;
- exige manifestação da chefia imediata;
- deve ser formalmente auditável.

### 8.3. Resposta da chefia imediata

A chefia imediata deve escolher entre:

#### a) Manter a avaliação
Nesse caso:

- apresenta despacho justificando a manutenção;
- pode anexar arquivo opcional.

#### b) Reavaliar o servidor
Nesse caso:

- o sistema abre nova avaliação substitutiva;
- a nova avaliação percorre novo fluxo formal;
- o servidor deve assinar a nova avaliação.

---

## 9. Avaliação substitutiva

### 9.1. Natureza

A avaliação substitutiva é uma nova avaliação formal aberta em decorrência de recurso de etapa acolhido para reavaliação.

### 9.2. Regra de histórico

A avaliação substitutiva:

- não apaga a avaliação anterior;
- substitui logicamente a avaliação contestada;
- deve manter vínculo rastreável com a avaliação original;
- deve preservar a trilha auditável de superação/substituição.

### 9.3. Novo fluxo formal

A nova avaliação substitutiva deve passar novamente, no mínimo, por:

- preenchimento pela chefia;
- geração do documento formal;
- assinatura do servidor;
- continuidade do fluxo correspondente.

---

## 10. Recurso final

### 10.1. Cabimento

Há recurso final.

O recurso final é cabível contra:

- o resultado final homologado e notificado.

### 10.2. Legitimado

O recurso final é apresentado pelo:

- **servidor-estagiário**

### 10.3. Destinatário

O recurso final é dirigido à:

- **autoridade homologadora**

### 10.4. Marco inicial do prazo

O prazo do recurso final começa a contar da:

- visualização/ciência da notificação pelo servidor.

### 10.5. Prazo

O prazo para recurso final é de:

- **5 dias**

### 10.6. Comportamento do sistema

Durante o prazo, o sistema deve:

- mostrar ao servidor que o recurso final está disponível;
- exibir a data-limite;
- apresentar contador regressivo ou mecanismo equivalente.

Após o prazo, o sistema deve:

- desabilitar a opção de recurso final.

### 10.7. Efeito processual

O recurso final suspende o resultado final no ponto cabível até a sua resolução.

---

## 11. Comunicação de prazo recursal no sistema

### 11.1. Recurso de etapa

O prazo recursal por etapa pode ser comunicado pelo próprio sistema, sem exigir documento externo específico, por meio de:

- mensagem contextual;
- status do prazo;
- data-limite;
- contador regressivo.

### 11.2. Recurso final

No resultado final, a própria notificação já informa o prazo recursal, mas o sistema também deve exibir:

- cronômetro ou contador;
- data-limite;
- status do prazo.

### 11.3. Desabilitação automática

Ao fim do prazo, a interface deve remover ou desabilitar a ação de recurso correspondente.

---

## 12. Diretrizes de modelagem de estados

### 12.1. Princípio

O workflow macro do processo deve permanecer o mais estável possível.

### 12.2. Recomendação

Sempre que possível, evitar inflar excessivamente o `ProcessStatus` com estados recursais detalhados, preferindo:

- macroestado principal do processo;
- subestado complementar da etapa ou do recurso.

### 12.3. Reserva de espaço no domínio

Mesmo sem implementação imediata, o domínio deve reservar suporte para:

- recurso de etapa;
- despacho da CESAD;
- resposta da chefia;
- avaliação substitutiva;
- recurso final.

---

## 13. Diretrizes de auditoria

Toda ação relevante deste fluxo deve registrar auditoria, incluindo, no mínimo:

- parecer de etapa iniciado;
- parecer de etapa concluído;
- parecer final iniciado;
- parecer final concluído;
- homologação iniciada;
- homologação concluída;
- recurso de etapa aberto;
- despacho da CESAD emitido;
- resposta da chefia emitida;
- avaliação substitutiva aberta;
- recurso final aberto;
- recurso encerrado.

---

## 14. Ordem recomendada de implementação

### 14.1. Bloco documental e de leitura
1. leitura consolidada da etapa pela CESAD

### 14.2. Bloco do parecer de etapa
2. rascunho do parecer de etapa  
3. conclusão e assinaturas do parecer de etapa

### 14.3. Bloco de consolidação final
4. habilitação do parecer conclusivo final  
5. rascunho do parecer conclusivo final  
6. conclusão e assinaturas do parecer conclusivo final

### 14.4. Bloco homologatório
7. fila e leitura da homologação  
8. registro formal da homologação

### 14.5. Bloco de comunicação final
9. notificação  
10. ciência

### 14.6. Bloco recursal
11. recurso por etapa  
12. despacho da CESAD  
13. resposta da chefia  
14. avaliação substitutiva  
15. recurso final

### 14.7. Bloco de publicação
16. portaria  
17. saída para DOE

---

## 15. Decisões consolidadas por este documento

Ficam definidos, para fins de continuidade do projeto:

1. no Caso 2, há um processo administrativo com quatro etapas internas;
2. cada etapa possui ciclo documental próprio;
3. existe parecer CESAD por etapa;
4. existe parecer CESAD conclusivo final;
5. o parecer final só é habilitado após a conclusão das quatro etapas;
6. a homologação final só é habilitada após o parecer conclusivo final;
7. há recurso por etapa;
8. há recurso final;
9. o recurso de etapa é dirigido à CESAD;
10. o recurso final é dirigido à autoridade homologadora;
11. o prazo recursal de etapa é de 5 dias da ciência/visualização do resultado da etapa;
12. o prazo recursal final é de 5 dias da visualização/ciência da notificação;
13. o sistema deve exibir prazo e contador recursal;
14. a CESAD despacha à chefia no recurso de etapa;
15. a chefia pode manter ou reavaliar;
16. a reavaliação gera avaliação substitutiva com novo fluxo formal;
17. a avaliação anterior não é apagada, apenas superada formalmente.

---

## 16. Pontos ainda dependentes de detalhamento futuro

Este documento não esgota todos os detalhes de implementação. Permanecem como temas futuros, entre outros:

- modelagem exata dos subestados recursais;
- desenho final dos endpoints recursais;
- julgamento material do recurso final;
- efeitos completos de suspensão por recurso;
- definição final sobre quais atos recursais terão `ProcessDocument` próprio;
- detalhes de integração entre recurso, notificação e publicação;
- comportamento em casos excepcionais de urgência.

---

## 17. Regra de prevalência

Na presença de conflito entre:

- leitura simplificada de interface;
- entendimento anterior incompleto;
- ou implementação ad hoc;

deve prevalecer esta diretriz:

**no Caso 2, o fluxo processual de quatro etapas, o parecer conclusivo final, a trava de homologação e as regras mínimas de recurso definidas neste documento têm primazia sobre simplificações de implementação.**