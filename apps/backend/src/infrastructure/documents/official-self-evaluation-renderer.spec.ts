import { PDFDocument } from 'pdf-lib';
import { fillOriginalDocx } from './original-template-renderer';
import PizZip from 'pizzip';
jest.setTimeout(90000);
import { DocumentType } from '@sadep/contracts';
import { createHash } from 'node:crypto';
import { EvaluationProcessDocumentPdfRenderer } from './evaluation-process-document-pdf-renderer';
import { PdfKitProcessDocumentPdfRenderer, type ProcessDocumentPdfInput } from './process-document-pdf-renderer';
import { selfEvaluationForm } from './official-self-evaluation-renderer';

async function text(pdf: Buffer): Promise<string> { const parsed = await require('pdf-parse/lib/pdf-parse.js')(pdf); return parsed.text.replace(/\s/g, ''); }
describe('Official Anexo V', () => {
  const renderer = new EvaluationProcessDocumentPdfRenderer(new PdfKitProcessDocumentPdfRenderer());
  const input: ProcessDocumentPdfInput = { documentType: DocumentType.SELF_EVALUATION, stageSequence: 2,
    title: 'Autoavaliação', metadata: [['Documento', '550e8400-e29b-41d4-a716-446655440000']], sections: [],
    generatedAt: new Date('2026-10-07T12:00:00Z'), logicalContent: { selfReflection: 'Planejei as atividades e avaliei seus resultados.', additionalNotes: 'Relações de trabalho respeitosas.' },
    presentation: { serverName: 'Maria Costa', supervisorName: 'João Lima', version: 3, signatures: [
      { name: 'Maria Costa', role: 'INTERN_SERVER', status: 'COMPLETED', signedAt: '2026-10-07T12:00:00Z' },
      { name: 'João Lima', role: 'IMMEDIATE_SUPERVISOR', status: 'COMPLETED', signedAt: '2026-10-07T13:00:00Z' },
    ] } };
  it('fills the original page 7, real content and signatures with deterministic bytes', async () => {
    const a=await renderer.render(input), b=await renderer.render(input); const value=await text(a);
    expect((await PDFDocument.load(a)).getPageCount()).toBe(1); expect(value).toContain('ANEXOV'); expect(value).toContain('MariaCosta'); expect(value).toContain('Planejeiasatividades'); expect(value).toContain('assinaturaeletr'); expect(a.equals(b)).toBe(true); expect(value).not.toMatch(/550e8400|TODO|\{\{/);
  });
  it('continues long content on copies of the original page without losing text', async () => {
    const a=await renderer.render({ ...input, logicalContent: { selfReflection: 'Long content '.repeat(1500)+'FINAL CONTENT' } }); expect((await PDFDocument.load(a)).getPageCount()).toBeGreaterThan(1); expect(await text(a)).toContain('FINALCONTENT');
  });
});
