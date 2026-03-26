import assert from 'node:assert/strict';

import {
  ProcessAction,
  ProcessStatus,
} from '@aep-pa/contracts';

import {
  getAvailableWorkflowTransitions,
  getWorkflowTransition,
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
}
