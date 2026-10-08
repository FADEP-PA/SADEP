import { PDFDocument } from 'pdf-lib';
import { fillOriginalDocx } from './original-template-renderer';
import PizZip from 'pizzip';
jest.setTimeout(90000);
﻿import { DocumentType, STAGE_4_PROVISIONAL_RESULT_NOTICE } from '@sadep/contracts';
import { createHash } from 'node:crypto';
import { EvaluationProcessDocumentPdfRenderer } from './evaluation-process-document-pdf-renderer';
import { PdfKitProcessDocumentPdfRenderer, type ProcessDocumentPdfInput } from './process-document-pdf-renderer';
import { supervisorEvaluationForm } from './official-supervisor-evaluation-renderer';

async function pdfText(pdf: Buffer): Promise<string> { const parsed = await require('pdf-parse/lib/pdf-parse.js')(pdf); return parsed.text; }

describe('Official supervisor evaluation', () => {
  const renderer = new EvaluationProcessDocumentPdfRenderer(new PdfKitProcessDocumentPdfRenderer());
  function input(scale = 'PERCENT_0_100', stageSequence = 1): ProcessDocumentPdfInput {
    return { documentType: DocumentType.SUPERVISOR_EVALUATION, stageSequence, title: 'Avaliação',
      metadata: [['Processo', '550e8400-e29b-41d4-a716-446655440000']], sections: [],
      presentation: { serverName: 'José Silva', supervisorName: 'Ana Sousa', version: 2,
        signatures: [{ name: 'Ana Sousa', role: 'IMMEDIATE_SUPERVISOR', status: 'COMPLETED', signedAt: '2026-10-07T12:00:00Z' },
          { name: 'José Silva', role: 'INTERN_SERVER', status: 'PENDING', signedAt: null }] },
      logicalContent: { scoreScale: scale, content: { criteria: Array.from({ length: 20 }, (_, i) => ({
        code: `${Math.floor(i / 4) + 1}.${i % 4 + 1}`, label: `Questão efetivamente avaliada ${i + 1}`, rating: scale === 'LEGACY_1_5' ? 4 : 80,
      })), textFields: { generalComments: 'Observação da chefia' } } }, generatedAt: new Date('2026-10-07T12:00:00Z') };
  }
  it.each(['PERCENT_0_100', 'LEGACY_1_5'])('fills the original pages 5 and 6 and preserves deterministic hashes (%s)', async scale => {
    const request=input(scale); const a=await renderer.render(request), b=await renderer.render(request); const value=await pdfText(a);
    expect((await PDFDocument.load(a)).getPageCount()).toBe(2); expect(value).toContain('ANEXO IV'); expect(value).toContain('José Silva');
    expect(value).toContain(scale === 'LEGACY_1_5' ? '4.0' : '80.0'); expect(value).not.toMatch(/550e8400|TODO|N\/A|\{\{/); expect(a.equals(b)).toBe(true);
    expect(value).not.toContain('1ª etapa — 1º–6º mês');
  });
});
