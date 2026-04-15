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

    const evaluatedUser = await createUser(context.prisma, UserRole.INTERN_SERVER, 'joao.souza@test.local');
    const processOutsideCesadWindow = await createProcess(
      context.prisma,
      ProcessStatus.EM_AVALIACAO,
      evaluatedUser.id,
    );
    const processInCesadWindow = await createProcess(
      context.prisma,
      ProcessStatus.EM_ANALISE_CESAD,
      evaluatedUser.id,
    );
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

    const transitionResponse = await fetch(
      `${baseUrl}/processes/${processOutsideCesadWindow.id}/workflow/transition`,
      {
      method: 'POST',
      headers: {
        authorization: `Bearer ${loginPayload.accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        action: workflowActions.issueOpinion,
      }),
      },
    );

    assert.equal(transitionResponse.status, 400);
    const payload = (await transitionResponse.json()) as { message: string };
    assert.match(payload.message, /not allowed when process is in status EM_AVALIACAO/);

    const blockedCesadShortcutResponse = await fetch(
      `${baseUrl}/processes/${processOutsideCesadWindow.id}/workflow/transition`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${loginPayload.accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          action: workflowActions.sendToCesad,
        }),
      },
    );

    assert.equal(blockedCesadShortcutResponse.status, 400);
    const blockedShortcutPayload = (await blockedCesadShortcutResponse.json()) as { message: string };
    assert.match(blockedShortcutPayload.message, /not allowed when process is in status EM_AVALIACAO/);

    const forbiddenDraftResponse = await fetch(
      `${baseUrl}/processes/${processOutsideCesadWindow.id}/supervisor-evaluation/draft`,
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

    const validationResponse = await fetch(
      `${baseUrl}/processes/${processOutsideCesadWindow.id}/supervisor-evaluation/draft`,
      {
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
      },
    );

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

    const incompatibleStageReadResponse = await fetch(
      `${baseUrl}/processes/${processOutsideCesadWindow.id}/stages/1/consolidated-read`,
      {
        method: 'GET',
        headers: {
          authorization: `Bearer ${loginPayload.accessToken}`,
        },
      },
    );

    assert.equal(incompatibleStageReadResponse.status, 400);
    const incompatibleStageReadPayload = (await incompatibleStageReadResponse.json()) as { message: string };
    assert.match(
      incompatibleStageReadPayload.message,
      /CESAD consolidated stage read is only available while process is in EM_ANALISE_CESAD or PARECER_EMITIDO status/,
    );

    const stageReadResponse = await fetch(
      `${baseUrl}/processes/${processInCesadWindow.id}/stages/1/consolidated-read`,
      {
        method: 'GET',
        headers: {
          authorization: `Bearer ${loginPayload.accessToken}`,
        },
      },
    );

    assert.equal(stageReadResponse.status, 200);
    const stageReadPayload = (await stageReadResponse.json()) as {
      readOnly: boolean;
      server: {
        displayName: string;
        positionName: string;
        registrationNumber: string;
      };
      stage: { sequence: number };
      documents: Array<{ documentType: string; exists: boolean }>;
    };
    assert.equal(stageReadPayload.readOnly, true);
    assert.equal(stageReadPayload.server.displayName, 'Joao Souza');
    assert.equal(stageReadPayload.server.positionName, 'Cargo não informado no cadastro');
    assert.equal(stageReadPayload.server.registrationNumber, 'Matrícula não informada no cadastro');
    assert.equal(stageReadPayload.stage.sequence, 1);
    assert.equal(stageReadPayload.documents.length, 3);

    const opinionDraftResponse = await fetch(
      `${baseUrl}/processes/${processInCesadWindow.id}/stages/1/cesad-stage-opinion/draft`,
      {
        method: 'PUT',
        headers: {
          authorization: `Bearer ${loginPayload.accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          reportText: 'Relatório preliminar da CESAD para a etapa 1.',
          legalBasis: 'Lei municipal X, art. 10.',
          conclusion: '',
          stageConcept: 'Em análise',
          stageResult: 'Aguardando conclusão',
          comment: 'Abertura do rascunho funcional.',
        }),
      },
    );

    assert.equal(opinionDraftResponse.status, 200);
    const opinionDraftPayload = (await opinionDraftResponse.json()) as {
      id: string;
      scope: string;
      processId: string;
      processStageId: string;
      status: string;
      reportText: string;
      legalBasis: string | null;
      conclusion: string;
      stageConcept: string | null;
      stageResult: string | null;
      completedAt: string | null;
    };
    assert.equal(opinionDraftPayload.scope, 'STAGE');
    assert.equal(opinionDraftPayload.processId, processInCesadWindow.id);
    assert.equal(opinionDraftPayload.status, 'DRAFT');
    assert.equal(opinionDraftPayload.reportText, 'Relatório preliminar da CESAD para a etapa 1.');
    assert.equal(opinionDraftPayload.legalBasis, 'Lei municipal X, art. 10.');
    assert.equal(opinionDraftPayload.conclusion, '');
    assert.equal(opinionDraftPayload.stageConcept, 'Em análise');
    assert.equal(opinionDraftPayload.stageResult, 'Aguardando conclusão');
    assert.equal(opinionDraftPayload.completedAt, null);

    const opinionReadResponse = await fetch(
      `${baseUrl}/processes/${processInCesadWindow.id}/stages/1/cesad-stage-opinion`,
      {
        method: 'GET',
        headers: {
          authorization: `Bearer ${loginPayload.accessToken}`,
        },
      },
    );

    assert.equal(opinionReadResponse.status, 200);
    const opinionReadPayload = (await opinionReadResponse.json()) as {
      id: string;
      status: string;
      reportText: string;
      processStageId: string;
    };
    assert.equal(opinionReadPayload.id, opinionDraftPayload.id);
    assert.equal(opinionReadPayload.status, 'DRAFT');
    assert.equal(opinionReadPayload.reportText, 'Relatório preliminar da CESAD para a etapa 1.');
    assert.equal(opinionReadPayload.processStageId, opinionDraftPayload.processStageId);

    const opinionCompleteResponse = await fetch(
      `${baseUrl}/processes/${processInCesadWindow.id}/stages/1/cesad-stage-opinion/complete`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${loginPayload.accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          reportText: 'Relatório final da CESAD para a etapa 1.',
          legalBasis: 'Lei municipal X, art. 10 e art. 11.',
          conclusion: 'Conclusão favorável da comissão para a etapa 1.',
          stageConcept: 'Satisfatório',
          stageResult: 'Etapa favorável',
          comment: 'Conclusão lógica do parecer funcional.',
        }),
      },
    );

    assert.equal(opinionCompleteResponse.status, 201);
    const opinionCompletePayload = (await opinionCompleteResponse.json()) as {
      id: string;
      status: string;
      reportText: string;
      conclusion: string;
      stageConcept: string | null;
      stageResult: string | null;
      completedAt: string | null;
    };
    assert.equal(opinionCompletePayload.id, opinionDraftPayload.id);
    assert.equal(opinionCompletePayload.status, 'COMPLETED');
    assert.equal(opinionCompletePayload.reportText, 'Relatório final da CESAD para a etapa 1.');
    assert.equal(
      opinionCompletePayload.conclusion,
      'Conclusão favorável da comissão para a etapa 1.',
    );
    assert.equal(opinionCompletePayload.stageConcept, 'Satisfatório');
    assert.equal(opinionCompletePayload.stageResult, 'Etapa favorável');
    assert.notEqual(opinionCompletePayload.completedAt, null);

    const opinionReadCompletedResponse = await fetch(
      `${baseUrl}/processes/${processInCesadWindow.id}/stages/1/cesad-stage-opinion`,
      {
        method: 'GET',
        headers: {
          authorization: `Bearer ${loginPayload.accessToken}`,
        },
      },
    );

    assert.equal(opinionReadCompletedResponse.status, 200);
    const opinionReadCompletedPayload = (await opinionReadCompletedResponse.json()) as {
      id: string;
      status: string;
      completedAt: string | null;
    };
    assert.equal(opinionReadCompletedPayload.id, opinionDraftPayload.id);
    assert.equal(opinionReadCompletedPayload.status, 'COMPLETED');
    assert.notEqual(opinionReadCompletedPayload.completedAt, null);

    const incompatibleOpinionReadResponse = await fetch(
      `${baseUrl}/processes/${processOutsideCesadWindow.id}/stages/1/cesad-stage-opinion`,
      {
        method: 'GET',
        headers: {
          authorization: `Bearer ${loginPayload.accessToken}`,
        },
      },
    );

    assert.equal(incompatibleOpinionReadResponse.status, 400);
    const incompatibleOpinionReadPayload = (await incompatibleOpinionReadResponse.json()) as {
      message: string;
    };
    assert.match(
      incompatibleOpinionReadPayload.message,
      /CESAD stage opinion read is only available while process is in EM_ANALISE_CESAD or PARECER_EMITIDO status/,
    );

    const incompatibleOpinionDraftResponse = await fetch(
      `${baseUrl}/processes/${processOutsideCesadWindow.id}/stages/1/cesad-stage-opinion/draft`,
      {
        method: 'PUT',
        headers: {
          authorization: `Bearer ${loginPayload.accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          reportText: 'Parecer fora da janela.',
          conclusion: '',
        }),
      },
    );

    assert.equal(incompatibleOpinionDraftResponse.status, 400);
    const incompatibleOpinionDraftPayload = (await incompatibleOpinionDraftResponse.json()) as {
      message: string;
    };
    assert.match(
      incompatibleOpinionDraftPayload.message,
      /CESAD stage opinion artifact can only be manipulated while process is in EM_ANALISE_CESAD status/,
    );

    const forbiddenOpinionResponse = await fetch(
      `${baseUrl}/processes/${processInCesadWindow.id}/stages/1/cesad-stage-opinion/draft`,
      {
        method: 'PUT',
        headers: {
          authorization: `Bearer ${supervisorLoginPayload.accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          reportText: 'Tentativa indevida do supervisor.',
          conclusion: '',
        }),
      },
    );

    assert.equal(forbiddenOpinionResponse.status, 403);
    const forbiddenOpinionPayload = (await forbiddenOpinionResponse.json()) as { message: string };
    assert.match(
      forbiddenOpinionPayload.message,
      /Only CESAD_MEMBER can manipulate CESAD stage opinion artifacts/,
    );

    const forbiddenStageReadResponse = await fetch(
      `${baseUrl}/processes/${processInCesadWindow.id}/stages/1/consolidated-read`,
      {
        method: 'GET',
        headers: {
          authorization: `Bearer ${supervisorLoginPayload.accessToken}`,
        },
      },
    );

    assert.equal(forbiddenStageReadResponse.status, 403);
    const forbiddenStagePayload = (await forbiddenStageReadResponse.json()) as { message: string };
    assert.match(forbiddenStagePayload.message, /Only CESAD_MEMBER can access/);
  } finally {
    await app.close();
    await disposeTestContext(context);
  }
}
