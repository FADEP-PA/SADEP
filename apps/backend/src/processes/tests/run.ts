import { runCesadCommissionActsEndpointTests } from '../../cesad/tests/cesad-commission-acts.endpoint.spec';
import { runCesadCommissionActsServiceTests } from '../../cesad/tests/cesad-commission-acts.service.spec';
import { runCesadCommissionMembersEndpointTests } from '../../cesad/tests/cesad-commission-members.endpoint.spec';
import { runCesadCommissionMembersServiceTests } from '../../cesad/tests/cesad-commission-members.service.spec';
import { runCesadCommissionsEndpointTests } from '../../cesad/tests/cesad-commissions.endpoint.spec';
import { runCesadCommissionsServiceTests } from '../../cesad/tests/cesad-commissions.service.spec';
import { runCesadStageOpinionsServiceTests } from './cesad-stage-opinions.service.spec';
import { runCesadStageReadServiceTests } from './cesad-stage-read.service.spec';
import { runWorkflowCatalogTests } from './workflow-catalog.spec';
import { runProcessesServiceTests } from './processes.service.spec';
import { runProcessesEndpointTests } from './processes.endpoint.spec';
import { runSelfEvaluationsTests } from './self-evaluations.service.spec';
import { runSupervisorEvaluationsServiceTests } from './supervisor-evaluations.service.spec';

async function main() {
  runWorkflowCatalogTests();
  await runProcessesServiceTests();
  await runCesadCommissionActsServiceTests();
  await runCesadCommissionActsEndpointTests();
  await runCesadCommissionMembersServiceTests();
  await runCesadCommissionMembersEndpointTests();
  await runCesadCommissionsServiceTests();
  await runCesadCommissionsEndpointTests();
  await runCesadStageReadServiceTests();
  await runCesadStageOpinionsServiceTests();
  await runProcessesEndpointTests();
  await runSupervisorEvaluationsServiceTests();
  await runSelfEvaluationsTests();
  console.log(
    'Workflow, CESAD commission acts, CESAD commission members, CESAD commissions, CESAD stage read, CESAD stage opinion, supervisor evaluation, and self evaluation tests passed.',
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
