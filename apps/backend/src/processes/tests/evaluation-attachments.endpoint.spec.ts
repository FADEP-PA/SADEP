import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ProcessStatus, UserRole } from '@sadep/contracts';

import { AppModule } from '../../app/app.module';
import { GlobalExceptionFilter } from '../../common/filters/global-exception.filter';
import { AppLogger } from '../../common/logging/app-logger.service';
import {
  authenticatedUser,
  buildSupervisorEvaluationPayload,
  createProcess,
  createTestContext,
  createUser,
  disposeTestContext,
} from './test-helpers';

function pngContent(sizeBytes = 64): Buffer {
  const buffer = Buffer.alloc(sizeBytes);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer);
  return buffer;
}

function buildMultipartUpload(
  filename: string,
  contentType: string,
  content: Buffer,
): { body: Uint8Array<ArrayBuffer>; contentType: string } {
  const boundary = `----SadepEvaluationAttachments${randomUUID()}`;
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`,
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return {
    body: new Uint8Array(Buffer.concat([head, content, tail])),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

async function login(baseUrl: string, email: string): Promise<string> {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'Test123456!' }),
  });
  assert.equal(response.status, 200);
  const payload = (await response.json()) as { accessToken?: string };
  assert.ok(payload.accessToken);
  return payload.accessToken;
}

export async function runEvaluationAttachmentsEndpointTests() {
  const context = await createTestContext('evaluation-attachments-endpoint-test');
  const previousStorageRoot = process.env.ARTIFACT_STORAGE_ROOT;
  const storageRoot = mkdtempSync(path.join(tmpdir(), 'sadep-attachments-endpoint-'));
  process.env.ARTIFACT_STORAGE_ROOT = storageRoot;

  const app = await NestFactory.create(AppModule, { logger: false });

  try {
    const logger = app.get(AppLogger);
    app.useGlobalFilters(new GlobalExceptionFilter(logger));
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.listen(0);

    const address = app.getHttpServer().address();
    const port = typeof address === 'string' ? 80 : address.port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const intern = await createUser(context.prisma, UserRole.INTERN_SERVER, 'attach-ep-intern@test.local');
    const supervisor = await createUser(
      context.prisma,
      UserRole.IMMEDIATE_SUPERVISOR,
      'attach-ep-supervisor@test.local',
    );
    const supervisorUser = authenticatedUser(supervisor.id, supervisor.role);
    const process = await createProcess(
      context.prisma,
      ProcessStatus.EM_AVALIACAO,
      intern.id,
      supervisor.id,
    );
    const stage = await context.prisma.processStage.findUniqueOrThrow({
      where: {
        evaluationProcessId_sequence: {
          evaluationProcessId: process.id,
          sequence: 1,
        },
      },
    });
    const baseUrlPath = `/processes/${process.id}/stages/${stage.id}/evaluation-attachments/SUPERVISOR_EVALUATION`;

    // Autenticação obrigatória.
    const unauthenticated = await fetch(`${baseUrl}${baseUrlPath}`, { method: 'GET' });
    assert.equal(unauthenticated.status, 401);

    const supervisorToken = await login(baseUrl, supervisor.email);

    // Avaliação inexistente: o autosave real cria o DRAFT antes do upload.
    assert.equal(await context.prisma.supervisorEvaluation.count({ where: { processId: process.id } }), 0);
    const payload = buildSupervisorEvaluationPayload();
    const draftResponse = await fetch(baseUrl+'/processes/'+process.id+'/supervisor-evaluation/draft', {
      method: 'POST', headers: { authorization: 'Bearer '+supervisorToken, 'content-type': 'application/json' }, body: JSON.stringify(payload),
    });
    assert.equal(draftResponse.status, 201);
    const persistedDraft = await context.prisma.supervisorEvaluation.findFirstOrThrow({ where: { processId: process.id } });
    assert.equal(persistedDraft.status, 'DRAFT'); assert.deepEqual(persistedDraft.content, payload.content);
    // Upload multipart com arquivo válido.
    const png = pngContent();
    const upload = buildMultipartUpload('evidencia.png', 'image/png', png);
    const uploadResponse = await fetch(`${baseUrl}${baseUrlPath}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${supervisorToken}`,
        'content-type': upload.contentType,
      },
      body: upload.body,
    });
    assert.equal(uploadResponse.status, 201);
    const uploadPayload = (await uploadResponse.json()) as {
      attachment?: { id?: string; originalFilename?: string; mimeType?: string; sizeBytes?: number };
    };
    assert.ok(uploadPayload.attachment?.id);
    assert.equal(uploadPayload.attachment.originalFilename, 'evidencia.png');
    assert.equal(uploadPayload.attachment.mimeType, 'image/png');
    assert.equal(uploadPayload.attachment.sizeBytes, png.length);
    const attachmentId = uploadPayload.attachment.id;

    // Listagem com token.
    const listResponse = await fetch(`${baseUrl}${baseUrlPath}`, {
      headers: { authorization: `Bearer ${supervisorToken}` },
    });
    assert.equal(listResponse.status, 200);
    const listPayload = (await listResponse.json()) as { attachments?: Array<{ id?: string }> };
    assert.equal(listPayload.attachments?.length, 1);
    assert.equal(listPayload.attachments?.[0]?.id, attachmentId);

    // Download com cabeçalhos privados e conteúdo íntegro.
    const downloadResponse = await fetch(`${baseUrl}${baseUrlPath}/${attachmentId}`, {
      headers: { authorization: `Bearer ${supervisorToken}` },
    });
    assert.equal(downloadResponse.status, 200);
    assert.equal(downloadResponse.headers.get('content-type'), 'image/png');
    assert.match(
      downloadResponse.headers.get('content-disposition') ?? '',
      /attachment; filename="evidencia\.png"/,
    );
    assert.match(downloadResponse.headers.get('content-disposition') ?? '', /filename\*=UTF-8''/);
    assert.match(downloadResponse.headers.get('cache-control') ?? '', /private/);
    assert.deepEqual(Buffer.from(await downloadResponse.arrayBuffer()), png);

    // Upload sem arquivo é rejeitado.
    const missingFileBoundary = `----SadepEvaluationAttachments${randomUUID()}`;
    const missingFileBody = new Uint8Array(
      Buffer.from(
        `--${missingFileBoundary}\r\nContent-Disposition: form-data; name="descricao"\r\n\r\nsem arquivo\r\n--${missingFileBoundary}--\r\n`,
      ),
    );
    const missingFileResponse = await fetch(`${baseUrl}${baseUrlPath}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${supervisorToken}`,
        'content-type': `multipart/form-data; boundary=${missingFileBoundary}`,
      },
      body: missingFileBody,
    });
    assert.equal(missingFileResponse.status, 400);

    // Arquivo acima de 10 MB é rejeitado no transporte (413).
    const oversized = buildMultipartUpload(
      'grande.png',
      'image/png',
      Buffer.alloc(10 * 1024 * 1024 + 1, 0x41),
    );
    const oversizedResponse = await fetch(`${baseUrl}${baseUrlPath}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${supervisorToken}`,
        'content-type': oversized.contentType,
      },
      body: oversized.body,
    });
    assert.equal(oversizedResponse.status, 413);

    // Papéis: servidor não anexa à avaliação da chefia.
    const internToken = await login(baseUrl, intern.email);
    const forbiddenUpload = buildMultipartUpload('nao-deve.png', 'image/png', pngContent());
    const forbiddenResponse = await fetch(`${baseUrl}${baseUrlPath}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${internToken}`,
        'content-type': forbiddenUpload.contentType,
      },
      body: forbiddenUpload.body,
    });
    assert.equal(forbiddenResponse.status, 403);

    // Remoção pelo autor e estado subsequente.
    const deleteResponse = await fetch(`${baseUrl}${baseUrlPath}/${attachmentId}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${supervisorToken}` },
    });
    assert.equal(deleteResponse.status, 200);
    assert.deepEqual(await deleteResponse.json(), { attachmentId, removed: true });

    const downloadAfterDelete = await fetch(`${baseUrl}${baseUrlPath}/${attachmentId}`, {
      headers: { authorization: `Bearer ${supervisorToken}` },
    });
    assert.equal(downloadAfterDelete.status, 404);

    const listAfterDelete = await fetch(`${baseUrl}${baseUrlPath}`, {
      headers: { authorization: `Bearer ${supervisorToken}` },
    });
    assert.equal(listAfterDelete.status, 200);
    const listAfterDeletePayload = (await listAfterDelete.json()) as { attachments?: unknown[] };
    assert.equal(listAfterDeletePayload.attachments?.length, 0);

    assert.equal(
      await context.prisma.evaluationAttachment.count({
        where: { evaluationProcessId: process.id },
      }),
      0,
    );
    const uploadAuditCount = await context.prisma.auditEvent.count({
      where: { eventType: 'EVALUATION_ATTACHMENT_UPLOADED' },
    });
    const removalAuditCount = await context.prisma.auditEvent.count({
      where: { eventType: 'EVALUATION_ATTACHMENT_REMOVED' },
    });
    assert.equal(uploadAuditCount, 1);
    assert.equal(removalAuditCount, 1);
    // Submissão real mantém conteúdo e bloqueia novos anexos/removal no backend.
    const submit = await fetch(baseUrl+'/processes/'+process.id+'/supervisor-evaluation/submit', {
      method: 'POST', headers: { authorization: 'Bearer '+supervisorToken, 'content-type': 'application/json' }, body: JSON.stringify(payload),
    });
    assert.equal(submit.status, 201);
    const submitted = await context.prisma.supervisorEvaluation.findFirstOrThrow({ where: { processId: process.id } });
    assert.equal(submitted.status, 'SUBMITTED'); assert.deepEqual(submitted.content, payload.content);
    const closedUpload = buildMultipartUpload('closed.png', 'image/png', pngContent());
    const closed = await fetch(baseUrl+baseUrlPath, { method: 'POST', headers: { authorization: 'Bearer '+supervisorToken, 'content-type': closedUpload.contentType }, body: closedUpload.body });
    assert.equal(closed.status, 400);
    const science = await fetch(`${baseUrl}/processes/${process.id}/supervisor-evaluation/sign`, {
      method: 'POST', headers: { authorization: `Bearer ${internToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ acknowledgementMode: 'ACKNOWLEDGED_WITH_RESERVATION' }),
    });
    assert.equal(science.status, 201);
    const selfPayload = { selfReflection: 'Texto preenchido antes do primeiro anexo.', additionalNotes: 'Observação preservada.' };
    const selfDraft = await fetch(`${baseUrl}/processes/${process.id}/self-evaluation/draft`, {
      method: 'PUT', headers: { authorization: `Bearer ${internToken}`, 'content-type': 'application/json' }, body: JSON.stringify(selfPayload),
    });
    assert.equal(selfDraft.status, 200);
    const selfPath = baseUrlPath.replace('SUPERVISOR_EVALUATION', 'SELF_EVALUATION');
    const selfUpload = buildMultipartUpload('self.png', 'image/png', pngContent());
    const selfAttachment = await fetch(baseUrl+selfPath, {
      method: 'POST', headers: { authorization: `Bearer ${internToken}`, 'content-type': selfUpload.contentType }, body: selfUpload.body,
    });
    assert.equal(selfAttachment.status, 201);
    const selfId = ((await selfAttachment.json()) as { attachment: { id: string } }).attachment.id;
    const selfSubmit = await fetch(`${baseUrl}/processes/${process.id}/self-evaluation/submit`, {
      method: 'POST', headers: { authorization: `Bearer ${internToken}`, 'content-type': 'application/json' }, body: JSON.stringify(selfPayload),
    });
    assert.equal(selfSubmit.status, 201);
    const selfSaved = await context.prisma.selfEvaluation.findFirstOrThrow({ where: { processId: process.id } });
    assert.equal(selfSaved.status, 'SUBMITTED'); assert.equal(selfSaved.selfReflection, selfPayload.selfReflection);
    const selfDelete = await fetch(`${baseUrl}${selfPath}/${selfId}`, { method: 'DELETE', headers: { authorization: `Bearer ${internToken}` } });
    assert.equal(selfDelete.status, 400);
  } finally {
    await app.close();
    if (previousStorageRoot === undefined) {
      delete process.env.ARTIFACT_STORAGE_ROOT;
    } else {
      process.env.ARTIFACT_STORAGE_ROOT = previousStorageRoot;
    }
    rmSync(storageRoot, { recursive: true, force: true });
    await disposeTestContext(context);
  }
}
