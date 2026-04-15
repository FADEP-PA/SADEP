import { runCesadStageReadServiceTests } from './cesad-stage-read.service.spec';
import { runWorkflowCatalogTests } from './workflow-catalog.spec';
import { runProcessesServiceTests } from './processes.service.spec';
import { runProcessesEndpointTests } from './processes.endpoint.spec';
import { runSelfEvaluationsTests } from './self-evaluations.service.spec';
import { runSupervisorEvaluationsServiceTests } from './supervisor-evaluations.service.spec';

async function main() {
  runWorkflowCatalogTests();
  await runProcessesServiceTests();
  await runCesadStageReadServiceTests();
  await runProcessesEndpointTests();
  await runSupervisorEvaluationsServiceTests();
  await runSelfEvaluationsTests();
  console.log('Workflow, CESAD stage read, supervisor evaluation, and self evaluation tests passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
