import assert from 'node:assert/strict';

import { NestFactory } from '@nestjs/core';
import { ProcessStatus, UserRole } from '@aep-pa/contracts';

import { AppModule } from '../../app/app.module';
import { GlobalExceptionFilter } from '../../common/filters/global-exception.filter';
import { AppLogger } from '../../common/logging/app-logger.service';
import {
  buildSupervisorEvaluationPayload,
  createProcess,
  createTestContext,
  createUser,
  disposeTestContext,
  workflowActions,
} from './test-helpers';

export async function runProcessesEndpointTests() {
  const context = await createTestContext('workflow-endpoint-test');

  const app = await NestFactory.create(AppModule, { logger: false });

  try {
    const logger = app.get(AppLogger);
    app.useGlobalFilters(new GlobalExceptionFilter(logger));
    await app.listen(0);

    const address = app.getHttpServer().address();
    const port = typeof address === 'string' ? 80 : address.port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const evaluatedUser = await createUser(context.prisma, UserRole.INTERN_SERVER, 'endpoint-evaluated@test.local');
    await createProcess(context.prisma, ProcessStatus.EM_AVALIACAO, evaluatedUser.id);
    const cesadUser = await createUser(context.prisma, UserRole.CESAD_MEMBER, 'endpoint-cesad@test.local');

    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: cesadUser.email,
        password: 'Test123456!',
      }),
    });

    assert.equal(loginResponse.status, 200);
    const loginPayload = (await loginResponse.json()) as { accessToken: string };

    const process = await context.prisma.evaluationProcess.findFirstOrThrow({
      where: { evaluatedUserId: evaluatedUser.id },
    });

    const transitionResponse = await fetch(`${baseUrl}/processes/${process.id}/workflow/transition`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${loginPayload.accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        action: workflowActions.issueOpinion,
      }),
    });

    assert.equal(transitionResponse.status, 400);
    const payload = (await transitionResponse.json()) as { message: string };
    assert.match(payload.message, /not allowed when process is in status EM_AVALIACAO/);

    const blockedCesadShortcutResponse = await fetch(`${baseUrl}/processes/${process.id}/workflow/transition`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${loginPayload.accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        action: workflowActions.sendToCesad,
      }),
    });

    assert.equal(blockedCesadShortcutResponse.status, 400);
    const blockedShortcutPayload = (await blockedCesadShortcutResponse.json()) as { message: string };
    assert.match(blockedShortcutPayload.message, /Workflow action is required and must be valid/);

    const forbiddenDraftResponse = await fetch(
      `${baseUrl}/processes/${process.id}/supervisor-evaluation/draft`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${loginPayload.accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(buildSupervisorEvaluationPayload()),
      },
    );

    assert.equal(forbiddenDraftResponse.status, 403);
    const forbiddenPayload = (await forbiddenDraftResponse.json()) as { message: string };
    assert.match(forbiddenPayload.message, /cannot manipulate supervisor evaluations/);
  } finally {
    await app.close();
    await disposeTestContext(context);
  }
}
