process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters';

async function main() {
  const [
    { runCesadCommissionActsEndpointTests },
    { runCesadCommissionActsServiceTests },
    { runCesadCommissionMembersEndpointTests },
    { runCesadCommissionMembersServiceTests },
    { runCesadCommissionsEndpointTests },
    { runCesadCommissionsServiceTests },
    { runCesadCurrentCommissionEndpointTests },
    { runCesadCurrentCommissionServiceTests },
    { runCesadStageOpinionsServiceTests },
    { runCesadStageReadServiceTests },
    { runWorkflowCatalogTests },
    { runProcessesServiceTests },
    { runProcessesEndpointTests },
    { runSelfEvaluationsTests },
    { runSupervisorEvaluationsServiceTests },
  ] = await Promise.all([
    import('../../cesad/tests/cesad-commission-acts.endpoint.spec'),
    import('../../cesad/tests/cesad-commission-acts.service.spec'),
    import('../../cesad/tests/cesad-commission-members.endpoint.spec'),
    import('../../cesad/tests/cesad-commission-members.service.spec'),
    import('../../cesad/tests/cesad-commissions.endpoint.spec'),
    import('../../cesad/tests/cesad-commissions.service.spec'),
    import('../../cesad/tests/cesad-current-commission.endpoint.spec'),
    import('../../cesad/tests/cesad-current-commission.service.spec'),
    import('./cesad-stage-opinions.service.spec'),
    import('./cesad-stage-read.service.spec'),
    import('./workflow-catalog.spec'),
    import('./processes.service.spec'),
    import('./processes.endpoint.spec'),
    import('./self-evaluations.service.spec'),
    import('./supervisor-evaluations.service.spec'),
  ]);

  runWorkflowCatalogTests();
  await runProcessesServiceTests();
  await runCesadCommissionActsServiceTests();
  await runCesadCommissionActsEndpointTests();
  await runCesadCommissionMembersServiceTests();
  await runCesadCommissionMembersEndpointTests();
  await runCesadCommissionsServiceTests();
  await runCesadCommissionsEndpointTests();
  await runCesadCurrentCommissionServiceTests();
  await runCesadCurrentCommissionEndpointTests();
  await runCesadStageReadServiceTests();
  await runCesadStageOpinionsServiceTests();
  await runProcessesEndpointTests();
  await runSupervisorEvaluationsServiceTests();
  await runSelfEvaluationsTests();
  console.log(
    'Workflow, CESAD current commission, CESAD commission acts, CESAD commission members, CESAD commissions, CESAD stage read, CESAD stage opinion, supervisor evaluation, and self evaluation tests passed.',
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
