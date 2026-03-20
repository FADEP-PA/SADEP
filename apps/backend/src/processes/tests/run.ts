import { runWorkflowCatalogTests } from './workflow-catalog.spec';
import { runProcessesServiceTests } from './processes.service.spec';
import { runProcessesEndpointTests } from './processes.endpoint.spec';
import { runSupervisorEvaluationsServiceTests } from './supervisor-evaluations.service.spec';

async function main() {
  runWorkflowCatalogTests();
  await runProcessesServiceTests();
  await runProcessesEndpointTests();
  await runSupervisorEvaluationsServiceTests();
  console.log('Workflow and supervisor evaluation tests passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
