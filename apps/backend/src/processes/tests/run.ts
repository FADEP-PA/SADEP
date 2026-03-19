import { runWorkflowCatalogTests } from './workflow-catalog.spec';
import { runProcessesServiceTests } from './processes.service.spec';
import { runProcessesEndpointTests } from './processes.endpoint.spec';

async function main() {
  runWorkflowCatalogTests();
  await runProcessesServiceTests();
  await runProcessesEndpointTests();
  console.log('Workflow tests passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
