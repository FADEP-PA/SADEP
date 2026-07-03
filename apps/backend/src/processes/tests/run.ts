process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters';
process.env.REFRESH_TOKEN_HMAC_SECRET = 'test-refresh-secret-with-at-least-32-characters';

async function main() {
  const [
    { runAuthEndpointTests },
    { runCesadCommissionActsEndpointTests },
    { runCesadCommissionActsServiceTests },
    { runCesadCommissionMembersEndpointTests },
    { runCesadCommissionMembersServiceTests },
    { runCesadCommissionsEndpointTests },
    { runCesadCommissionsServiceTests },
    { runCesadContextAuthorizationServiceTests },
    { runCesadRolloverServiceTests },
    { runCesadCurrentCommissionEndpointTests },
    { runCesadCurrentCommissionServiceTests },
    { runCesadFinalOpinionsServiceTests },
    { runCesadStageOpinionsServiceTests },
    { runCesadStageReadServiceTests },
    { runCompleteCurrentStageServiceTests },
    { runWorkflowCatalogTests },
    { runProcessesServiceTests },
    { runProcessesEndpointTests },
    { runSelfEvaluationsTests },
    { runSupervisorEvaluationsServiceTests },
  ] = await Promise.all([
    import('../../auth/auth.endpoint.spec'),
    import('../../cesad/tests/cesad-commission-acts.endpoint.spec'),
    import('../../cesad/tests/cesad-commission-acts.service.spec'),
    import('../../cesad/tests/cesad-commission-members.endpoint.spec'),
    import('../../cesad/tests/cesad-commission-members.service.spec'),
    import('../../cesad/tests/cesad-commissions.endpoint.spec'),
    import('../../cesad/tests/cesad-commissions.service.spec'),
    import('../../cesad/tests/cesad-context-authorization.service.spec'),
    import('./cesad-rollover.service.spec'),
    import('../../cesad/tests/cesad-current-commission.endpoint.spec'),
    import('../../cesad/tests/cesad-current-commission.service.spec'),
    import('./cesad-final-opinions.service.spec'),
    import('./cesad-stage-opinions.service.spec'),
    import('./cesad-stage-read.service.spec'),
    import('./complete-current-stage.service.spec'),
    import('./workflow-catalog.spec'),
    import('./processes.service.spec'),
    import('./processes.endpoint.spec'),
    import('./self-evaluations.service.spec'),
    import('./supervisor-evaluations.service.spec'),
  ]);

  runWorkflowCatalogTests();
  await runAuthEndpointTests();
  await runProcessesServiceTests();
  await runCesadCommissionActsServiceTests();
  await runCesadCommissionActsEndpointTests();
  await runCesadCommissionMembersServiceTests();
  await runCesadCommissionMembersEndpointTests();
  await runCesadCommissionsServiceTests();
  await runCesadCommissionsEndpointTests();
  await runCesadContextAuthorizationServiceTests();
  await runCesadRolloverServiceTests();
  await runCesadCurrentCommissionServiceTests();
  await runCesadCurrentCommissionEndpointTests();
  await runCesadStageReadServiceTests();
  await runCesadStageOpinionsServiceTests();
  await runCesadFinalOpinionsServiceTests();
  await runCompleteCurrentStageServiceTests();
  await runProcessesEndpointTests();
  await runSupervisorEvaluationsServiceTests();
  await runSelfEvaluationsTests();
  console.log(
    'Workflow, CESAD current commission, CESAD commission acts, CESAD commission members, CESAD commissions, CESAD stage read, CESAD stage opinion, CESAD final opinion, supervisor evaluation, and self evaluation tests passed.',
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
