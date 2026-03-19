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
  const sendToCesad = getWorkflowTransition(ProcessStatus.EM_AVALIACAO, ProcessAction.SEND_TO_CESAD);
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

  const cesadTransitions = getAvailableWorkflowTransitions(ProcessStatus.EM_ANALISE_CESAD);
  assert.deepEqual(
    cesadTransitions.map((transition) => transition.action).sort(),
    [ProcessAction.ISSUE_CESAD_OPINION, ProcessAction.REQUEST_ADJUSTMENT].sort(),
  );
}
