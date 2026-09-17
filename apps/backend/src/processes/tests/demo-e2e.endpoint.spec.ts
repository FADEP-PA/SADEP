import assert from 'node:assert/strict';

import { NestFactory } from '@nestjs/core';
import { ProcessAction, ProcessStatus, UserRole } from '@sadep/contracts';

import { AppModule } from '../../app/app.module';
import { GlobalExceptionFilter } from '../../common/filters/global-exception.filter';
import { AppLogger } from '../../common/logging/app-logger.service';
import {
  buildSelfEvaluationPayload,
  buildSupervisorEvaluationPayload,
  createActiveCesadCommission,
  createProcess,
  createTestContext,
  createUser,
  disposeTestContext,
} from './test-helpers';

type LoginPayload = {
  accessToken: string;
  user: {
    email: string;
    name: string;
    role: UserRole;
  };
};

async function login(baseUrl: string, email: string): Promise<LoginPayload> {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'Test123456!',
    }),
  });

  assert.equal(response.status, 200);
  return (await response.json()) as LoginPayload;
}

function authHeaders(accessToken: string, includeJson = false) {
  return {
    authorization: `Bearer ${accessToken}`,
    ...(includeJson ? { 'content-type': 'application/json' } : {}),
  };
}

export async function runDemoE2EEndpointTests() {
  const context = await createTestContext('demo-e2e-endpoint-test');
  const app = await NestFactory.create(AppModule, { logger: false });

  try {
    const logger = app.get(AppLogger);
    app.useGlobalFilters(new GlobalExceptionFilter(logger));
    await app.listen(0);

    const address = app.getHttpServer().address();
    const port = typeof address === 'string' ? 80 : address.port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const server = await createUser(
      context.prisma,
      UserRole.INTERN_SERVER,
      'demo-e2e-server@test.local',
    );
    const supervisor = await createUser(
      context.prisma,
      UserRole.IMMEDIATE_SUPERVISOR,
      'demo-e2e-supervisor@test.local',
    );
    const cesad = await createUser(
      context.prisma,
      UserRole.CESAD_MEMBER,
      'demo-e2e-cesad@test.local',
    );

    await createActiveCesadCommission(context.prisma, [
      { userId: cesad.id, roleType: 'TITULAR' },
    ]);

    const process = await createProcess(
      context.prisma,
      ProcessStatus.EM_AVALIACAO,
      server.id,
      supervisor.id,
    );

    const supervisorSession = await login(baseUrl, supervisor.email);
    const serverSession = await login(baseUrl, server.email);
    const cesadSession = await login(baseUrl, cesad.email);

    const supervisorListResponse = await fetch(`${baseUrl}/processes`, {
      headers: authHeaders(supervisorSession.accessToken),
    });
    assert.equal(supervisorListResponse.status, 200);
    const supervisorList = (await supervisorListResponse.json()) as {
      items: Array<{ id: string; status: ProcessStatus }>;
    };
    assert.equal(supervisorList.items.some((item) => item.id === process.id), true);

    const submitSupervisorResponse = await fetch(
      `${baseUrl}/processes/${process.id}/supervisor-evaluation/submit`,
      {
        method: 'POST',
        headers: authHeaders(supervisorSession.accessToken, true),
        body: JSON.stringify(
          buildSupervisorEvaluationPayload({
            summary: 'Avaliação integrada da Chefia para o smoke test da demo.',
          }),
        ),
      },
    );
    assert.equal(submitSupervisorResponse.status, 201);

    const afterSupervisorSubmit = await context.prisma.evaluationProcess.findUniqueOrThrow({
      where: { id: process.id },
    });
    assert.equal(afterSupervisorSubmit.status, ProcessStatus.AGUARDANDO_ASSINATURA);

    const internWorkspaceResponse = await fetch(
      `${baseUrl}/processes/${process.id}/intern-workspace`,
      {
        headers: authHeaders(serverSession.accessToken),
      },
    );
    assert.equal(internWorkspaceResponse.status, 200);
    const internWorkspace = (await internWorkspaceResponse.json()) as {
      capabilities: {
        canViewSupervisorEvaluation: boolean;
        canSignSupervisorEvaluation: boolean;
      };
    };
    assert.equal(internWorkspace.capabilities.canViewSupervisorEvaluation, true);
    assert.equal(internWorkspace.capabilities.canSignSupervisorEvaluation, true);

    const confirmScienceResponse = await fetch(
      `${baseUrl}/processes/${process.id}/supervisor-evaluation/sign`,
      {
        method: 'POST',
        headers: authHeaders(serverSession.accessToken),
      },
    );
    assert.equal(confirmScienceResponse.status, 201);

    const submitSelfEvaluationResponse = await fetch(
      `${baseUrl}/processes/${process.id}/self-evaluation/submit`,
      {
        method: 'POST',
        headers: authHeaders(serverSession.accessToken, true),
        body: JSON.stringify(
          buildSelfEvaluationPayload({
            selfReflection: 'Autoavaliação integrada do servidor para o smoke test da demo.',
          }),
        ),
      },
    );
    assert.equal(submitSelfEvaluationResponse.status, 201);

    const supervisorSelfEvaluationResponse = await fetch(
      `${baseUrl}/processes/${process.id}/self-evaluation`,
      {
        headers: authHeaders(supervisorSession.accessToken),
      },
    );
    assert.equal(supervisorSelfEvaluationResponse.status, 200);
    const submittedSelfEvaluation = (await supervisorSelfEvaluationResponse.json()) as {
      status: string;
    };
    assert.equal(submittedSelfEvaluation.status, 'SUBMITTED');

    const confirmSelfEvaluationResponse = await fetch(
      `${baseUrl}/processes/${process.id}/self-evaluation/sign`,
      {
        method: 'POST',
        headers: authHeaders(supervisorSession.accessToken, true),
        body: JSON.stringify({ comment: 'Autoavaliação recebida pela Chefia.' }),
      },
    );
    assert.equal(confirmSelfEvaluationResponse.status, 201);

    const processInCesad = await context.prisma.evaluationProcess.findUniqueOrThrow({
      where: { id: process.id },
    });
    assert.equal(processInCesad.status, ProcessStatus.EM_ANALISE_CESAD);

    const assignment = await context.prisma.cesadStageAssignment.findFirst({
      where: {
        processId: process.id,
        processStageId: process.defaultStageId,
        status: 'ACTIVE',
      },
    });
    assert.notEqual(assignment, null);

    const cesadListResponse = await fetch(`${baseUrl}/processes`, {
      headers: authHeaders(cesadSession.accessToken),
    });
    assert.equal(cesadListResponse.status, 200);
    const cesadList = (await cesadListResponse.json()) as {
      items: Array<{ id: string; currentStageSequence: number; status: ProcessStatus }>;
    };
    const cesadProcess = cesadList.items.find((item) => item.id === process.id);
    assert.notEqual(cesadProcess, undefined);
    assert.equal(cesadProcess?.status, ProcessStatus.EM_ANALISE_CESAD);
    assert.equal(cesadProcess?.currentStageSequence, 1);

    const consolidatedReadResponse = await fetch(
      `${baseUrl}/processes/${process.id}/stages/1/consolidated-read`,
      {
        headers: authHeaders(cesadSession.accessToken),
      },
    );
    assert.equal(consolidatedReadResponse.status, 200);
    const consolidatedRead = (await consolidatedReadResponse.json()) as {
      supervisorEvaluation: unknown | null;
      selfEvaluation: unknown | null;
      stage: { sequence: number };
    };
    assert.notEqual(consolidatedRead.supervisorEvaluation, null);
    assert.notEqual(consolidatedRead.selfEvaluation, null);
    assert.equal(consolidatedRead.stage.sequence, 1);

    const saveOpinionDraftResponse = await fetch(
      `${baseUrl}/processes/${process.id}/stages/1/cesad-stage-opinion/draft`,
      {
        method: 'PUT',
        headers: authHeaders(cesadSession.accessToken, true),
        body: JSON.stringify({
          reportText: 'Parecer CESAD integrado em rascunho.',
          conclusion: 'Análise em andamento.',
        }),
      },
    );
    assert.equal(saveOpinionDraftResponse.status, 200);

    const completeOpinionResponse = await fetch(
      `${baseUrl}/processes/${process.id}/stages/1/cesad-stage-opinion/complete`,
      {
        method: 'POST',
        headers: authHeaders(cesadSession.accessToken, true),
        body: JSON.stringify({
          reportText: 'Parecer CESAD integrado concluído.',
          legalBasis: 'Base normativa utilizada no smoke test.',
          conclusion: 'Parecer favorável à conclusão da etapa.',
          stageConcept: 'Satisfatório',
          stageResult: 'Aprovado',
        }),
      },
    );
    assert.equal(completeOpinionResponse.status, 201);

    const prepareSignaturesResponse = await fetch(
      `${baseUrl}/processes/${process.id}/stages/1/cesad-stage-opinion/signatures/prepare`,
      {
        method: 'POST',
        headers: authHeaders(cesadSession.accessToken),
      },
    );
    assert.equal(prepareSignaturesResponse.status, 201);

    const signOpinionResponse = await fetch(
      `${baseUrl}/processes/${process.id}/stages/1/cesad-stage-opinion/sign`,
      {
        method: 'POST',
        headers: authHeaders(cesadSession.accessToken),
      },
    );
    assert.equal(signOpinionResponse.status, 201);
    const signedOpinion = (await signOpinionResponse.json()) as {
      allExpectedSignersSigned: boolean;
      expectedSigners: Array<{ signatureStatus: string; signedAt: string | null }>;
    };
    assert.equal(signedOpinion.allExpectedSignersSigned, true);
    assert.equal(
      signedOpinion.expectedSigners.every(
        (signer) => signer.signatureStatus === 'COMPLETED' && signer.signedAt !== null,
      ),
      true,
    );

    const issueOpinionResponse = await fetch(
      `${baseUrl}/processes/${process.id}/workflow/transition`,
      {
        method: 'POST',
        headers: authHeaders(cesadSession.accessToken, true),
        body: JSON.stringify({ action: ProcessAction.ISSUE_CESAD_OPINION }),
      },
    );
    assert.equal(issueOpinionResponse.status, 201);
    const issuedWorkflow = (await issueOpinionResponse.json()) as {
      status: ProcessStatus;
      availableActions: ProcessAction[];
    };
    assert.equal(issuedWorkflow.status, ProcessStatus.PARECER_EMITIDO);
    assert.equal(
      issuedWorkflow.availableActions.includes(ProcessAction.COMPLETE_CURRENT_STAGE),
      true,
    );

    const completeStageResponse = await fetch(
      `${baseUrl}/processes/${process.id}/workflow/transition`,
      {
        method: 'POST',
        headers: authHeaders(cesadSession.accessToken, true),
        body: JSON.stringify({ action: ProcessAction.COMPLETE_CURRENT_STAGE }),
      },
    );
    assert.equal(completeStageResponse.status, 201);
    const completedWorkflow = (await completeStageResponse.json()) as {
      status: ProcessStatus;
    };
    assert.equal(completedWorkflow.status, ProcessStatus.EM_AVALIACAO);

    const stages = await context.prisma.processStage.findMany({
      where: { evaluationProcessId: process.id },
      orderBy: { sequence: 'asc' },
    });
    assert.notEqual(stages[0]?.endedAt, null);
    assert.notEqual(stages[1]?.startedAt, null);
    assert.equal(stages[1]?.endedAt, null);

    const serverListAfterStageCompletionResponse = await fetch(`${baseUrl}/processes`, {
      headers: authHeaders(serverSession.accessToken),
    });
    assert.equal(serverListAfterStageCompletionResponse.status, 200);
    const serverListAfterStageCompletion =
      (await serverListAfterStageCompletionResponse.json()) as {
        items: Array<{
          id: string;
          status: ProcessStatus;
          currentStageSequence: number;
        }>;
      };
    const nextStageProcess = serverListAfterStageCompletion.items.find(
      (item) => item.id === process.id,
    );
    assert.notEqual(nextStageProcess, undefined);
    assert.equal(nextStageProcess?.status, ProcessStatus.EM_AVALIACAO);
    assert.equal(nextStageProcess?.currentStageSequence, 2);
  } finally {
    await app.close();
    await disposeTestContext(context);
  }
}
