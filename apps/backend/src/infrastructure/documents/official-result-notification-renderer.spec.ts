import { PDFDocument } from 'pdf-lib';
import { fillOriginalDocx } from './original-template-renderer';
import PizZip from 'pizzip';
jest.setTimeout(90000);
import { DocumentType } from '@sadep/contracts';
import { artifactContentHash } from './document-artifact-storage';
import { EvaluationProcessDocumentPdfRenderer } from './evaluation-process-document-pdf-renderer';
import { PdfKitProcessDocumentPdfRenderer, type ProcessDocumentPdfInput } from './process-document-pdf-renderer';
import { notificationForm } from './official-result-notification-renderer';

async function text(pdf: Buffer): Promise<string> { const parsed = await require('pdf-parse/lib/pdf-parse.js')(pdf); return parsed.text.replace(/\s/g, ''); }
describe('Official personal notification', () => {
  const renderer = new EvaluationProcessDocumentPdfRenderer(new PdfKitProcessDocumentPdfRenderer());
  const input: ProcessDocumentPdfInput = { documentType: DocumentType.RESULT_NOTIFICATION, title: 'Notificação',
    metadata: [['Processo', '550e8400-e29b-41d4-a716-446655440000']], sections: [], generatedAt: new Date('2026-10-07T12:00:00Z'),
    presentation: { serverName: 'Maria Costa', version: 1, signatures: [] },
    logicalContent: { homologatedAt: '2026-10-07T12:00:00Z', notifiedAt: '2026-10-07T13:00:00Z', authorityName: 'Autoridade real',
      homologationRemarks: 'Homologo o resultado do parecer conclusivo.', finalResult: 'APTO', finalConcept: 'Bom' } };
  it('uses the original NP DOCX and actual authority without simulating a signature', async () => {
    const docx=await fillOriginalDocx(input,true); const xml=new PizZip(docx).file('word/document.xml')!.asText(); expect(xml).toContain('Autoridade real'); expect(xml).not.toMatch(/Hellen Nyde|\{\{|550e8400|assinado eletronicamente/);
    const a=await renderer.render(input), b=await renderer.render(input); const value=await text(a); expect(value).toContain('NOTIFICA'); expect(value).toContain('Autoridadereal'); expect(a.equals(b)).toBe(true);
  });
  it('renderiza INAPTO / Insuficiente com a homologação real e sem assinatura fictícia', async () => {
    const bad = { ...input, logicalContent: { ...input.logicalContent, finalResult: 'INAPTO', finalConcept: 'Insuficiente', homologatedAt: '2026-10-06T12:00:00Z' } };
    const xml = new PizZip(await fillOriginalDocx(bad, true)).file('word/document.xml')!.asText();
    for (const value of ['não foi confirmada', 'INAPTO', 'Insuficiente', '06/10/2026', 'Homologo o resultado do parecer conclusivo.']) expect(xml).toContain(value);
    expect(xml).not.toMatch(/Hellen Nyde|assinado eletronicamente|\{\{|550e8400/);
    expect(await text(await renderer.render(bad))).toContain('Resultado:INAPTO');
  });
  it('rejects notification before a valid homologation and notification', async () => { await expect(renderer.render({ ...input, logicalContent: {} })).rejects.toThrow(/valid homologation/); });
});
