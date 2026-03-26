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
    const supervisorUser = await createUser(
      context.prisma,
      UserRole.IMMEDIATE_SUPERVISOR,
      'endpoint-supervisor@test.local',
    );

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
    assert.match(blockedShortcutPayload.message, /not allowed when process is in status EM_AVALIACAO/);

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

    const supervisorLoginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: supervisorUser.email,
        password: 'Test123456!',
      }),
    });

    assert.equal(supervisorLoginResponse.status, 200);
    const supervisorLoginPayload = (await supervisorLoginResponse.json()) as { accessToken: string };

    const validationResponse = await fetch(`${baseUrl}/processes/${process.id}/supervisor-evaluation/draft`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${supervisorLoginPayload.accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        summary: 123,
        generalComments: true,
        content: {
          criteria: [
            {
              code: 999,
              label: false,
              rating: 'cinco',
              comment: 10,
            },
          ],
        },
      }),
    });

    assert.equal(validationResponse.status, 400);
    const validationPayload = (await validationResponse.json()) as {
      message: string;
      error: string;
      details?: Record<string, string>;
    };
    assert.equal(validationPayload.message, 'Supervisor evaluation payload is invalid');
    assert.equal(validationPayload.error, 'Bad Request');
    assert.equal(validationPayload.details?.summary, 'Resumo da avaliação deve ser um texto.');
    assert.equal(
      validationPayload.details?.generalComments,
      'Comentários gerais devem ser informados em texto.',
    );
    assert.equal(validationPayload.details?.['criteria[0].code'], 'Código do critério deve ser texto.');
    assert.equal(validationPayload.details?.['criteria[0].label'], 'Título do critério deve ser texto.');
    assert.equal(validationPayload.details?.['criteria[0].rating'], 'Nota do critério deve ser numérica.');
    assert.equal(
      validationPayload.details?.['criteria[0].comment'],
      'Comentário do critério deve ser texto quando informado.',
    );
  } finally {
    await app.close();
    await disposeTestContext(context);
  }
}
