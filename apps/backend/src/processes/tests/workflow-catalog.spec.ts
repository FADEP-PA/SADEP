import assert from 'node:assert/strict';

import {
  AuditEventType,
  ProcessAction,
  ProcessStatus,
  UserRole,
} from '@sadep/contracts';

import {
  getAvailableWorkflowTransitions,
  getWorkflowTransition,
  isWorkflowAction,
  isWorkflowAuditEventType,
} from '../workflow-catalog';

export function runWorkflowCatalogTests() {
  const releaseForSignature = getWorkflowTransition(
    ProcessStatus.EM_AVALIACAO,
    ProcessAction.RELEASE_FOR_SERVER_SIGNATURE,
  );
  assert.ok(releaseForSignature, 'expected RELEASE_FOR_SERVER_SIGNATURE transition to exist');
  assert.equal(releaseForSignature.to, ProcessStatus.AGUARDANDO_ASSINATURA);

  const sendToCesad = getWorkflowTransition(
    ProcessStatus.AGUARDANDO_ASSINATURA,
    ProcessAction.SEND_TO_CESAD,
  );
  assert.ok(sendToCesad, 'expected SEND_TO_CESAD transition to exist');
  assert.equal(sendToCesad.to, ProcessStatus.EM_ANALISE_CESAD);

  const issueOpinion = getWorkflowTransition(
    ProcessStatus.EM_ANALISE_CESAD,
    ProcessAction.ISSUE_CESAD_OPINION,
  );
  assert.ok(issueOpinion, 'expected ISSUE_CESAD_OPINION transition to exist');
  assert.equal(issueOpinion.to, ProcessStatus.PARECER_EMITIDO);

  const invalidTransition = getWorkflowTransition(
    ProcessStatus.PARECER_EMITIDO,
    ProcessAction.REQUEST_ADJUSTMENT,
  );
  assert.equal(invalidTransition, null);

  const evaluationTransitions = getAvailableWorkflowTransitions(ProcessStatus.EM_AVALIACAO);
  assert.deepEqual(
    evaluationTransitions.map((transition) => transition.action),
    [ProcessAction.RELEASE_FOR_SERVER_SIGNATURE],
  );

  const waitingSignatureTransitions = getAvailableWorkflowTransitions(ProcessStatus.AGUARDANDO_ASSINATURA);
  assert.deepEqual(
    waitingSignatureTransitions.map((transition) => transition.action),
    [ProcessAction.SEND_TO_CESAD],
  );

  const completeCurrentStage = getWorkflowTransition(
    ProcessStatus.PARECER_EMITIDO,
    ProcessAction.COMPLETE_CURRENT_STAGE,
  );
  assert.ok(completeCurrentStage, 'expected COMPLETE_CURRENT_STAGE transition to exist');
  assert.equal(completeCurrentStage.from, ProcessStatus.PARECER_EMITIDO);
  assert.equal(completeCurrentStage.eventType, AuditEventType.STAGE_COMPLETED);
  assert.equal(completeCurrentStage.requiresComment, false);
  assert.deepEqual(
    [...completeCurrentStage.allowedRoles].sort(),
    [UserRole.ADMIN, UserRole.CESAD_MEMBER].sort(),
  );
  assert(!completeCurrentStage.allowedRoles.includes(UserRole.COMMISSION_ASSISTANT));
  assert(!completeCurrentStage.allowedRoles.includes(UserRole.IMMEDIATE_SUPERVISOR));
  assert(!completeCurrentStage.allowedRoles.includes(UserRole.INTERN_SERVER));
  assert(!completeCurrentStage.allowedRoles.includes(UserRole.HOMOLOGATION_AUTHORITY));

  const opinionEmittedTransitions = getAvailableWorkflowTransitions(ProcessStatus.PARECER_EMITIDO);
  assert.deepEqual(
    opinionEmittedTransitions.map((transition) => transition.action),
    [ProcessAction.COMPLETE_CURRENT_STAGE],
  );

  assert.equal(isWorkflowAction(ProcessAction.COMPLETE_CURRENT_STAGE), true);
  assert.equal(isWorkflowAuditEventType(AuditEventType.STAGE_COMPLETED), true);
}
