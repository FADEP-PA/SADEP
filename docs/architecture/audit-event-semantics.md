# AuditEvent Semantics — AEP-PA

## Finalidade

O `AuditEvent` é a trilha única de auditoria estruturada do AEP-PA.

Ele existe para registrar, de forma persistida e rastreável, os atos relevantes praticados no sistema ao longo do rito do estágio probatório, permitindo:

- reconstrução do histórico processual
- identificação do usuário executor
- identificação do papel exercido no momento da ação
- registro de mudança de estado quando houver
- rastreabilidade de artefatos funcionais relevantes
- suporte a histórico técnico, auditoria administrativa e futura geração documental

O `AuditEvent` **não é log genérico de sistema** e **não é somente log de transição de workflow**.  
Ele é a trilha formal de auditoria do processo e dos artefatos funcionais do rito.

---

## Princípio central

O AEP-PA possui dois tipos principais de eventos auditáveis que coexistem no `AuditEvent`:

1. **eventos de processo / workflow**
2. **eventos de artefato funcional**

Esses eventos compartilham o mesmo repositório de auditoria (`AuditEvent`), mas **não têm a mesma semântica**.

A distinção entre eles deve ser preservada com clareza no código, especialmente por meio de:

- `eventType`
- `beforeState`
- `afterState`
- `metadata`
- `metadata.origin`, quando aplicável

---

## 1. Eventos de processo / workflow

São eventos que representam **mudança ou progressão do rito processual** do `EvaluationProcess`.

### Características

- estão diretamente ligados ao fluxo processual
- normalmente alteram `EvaluationProcess.status`
- devem registrar `beforeState` e `afterState` de forma coerente
- costumam aparecer no histórico básico de workflow do processo

### Exemplos

- `SIGNATURE_REQUESTED`
- `SENT_TO_CESAD`
- `CESAD_OPINION_ISSUED`
- `ADJUSTMENT_REQUESTED`
- `RESULT_HOMOLOGATED`

### Regra semântica

Quando o evento for de workflow/processo:

- `beforeState` deve refletir o estado processual anterior
- `afterState` deve refletir o estado processual novo
- o evento deve ser consistente com a transição definida no catálogo de workflow
- o evento deve nascer da workflow-engine ou de service que delegue corretamente ao workflow central

---

## 2. Eventos de artefato funcional

São eventos que representam **atos relevantes sobre artefatos do rito**, mesmo quando não há mudança direta do `EvaluationProcess.status`.

### Características

- representam criação, edição, submissão ou retificação de artefatos funcionais
- podem ou não gerar efeito processual
- podem coexistir com um evento de workflow na mesma operação
- devem deixar claro, no `metadata`, a que artefato se referem

### Exemplos

- `EVALUATION_STARTED`
- `EVALUATION_DRAFT_SAVED`
- `EVALUATION_COMPLETED`
- `EVALUATION_RECTIFIED`
- eventos futuros ligados a autoavaliação, parecer CESAD, etc.

### Regra semântica

Quando o evento for de artefato funcional:

- `beforeState` e `afterState` podem representar o estado do artefato funcional, e não necessariamente o `EvaluationProcess.status`
- `metadata` deve deixar clara a origem e o contexto do evento
- o evento não deve ser tratado automaticamente como transição de workflow do processo

---

## 3. Uso de `metadata.origin`

Sempre que possível, eventos de artefato funcional devem registrar no `metadata` uma origem explícita.

### Exemplo

```json
{
  "origin": "SUPERVISOR_EVALUATION",
  "action": "SAVE_DRAFT"
}