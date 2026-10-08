import { PDFDocument } from 'pdf-lib';
import { fillOriginalDocx } from './original-template-renderer';
import PizZip from 'pizzip';
jest.setTimeout(90000);
import { CesadFinalOpinionsController } from '../../processes/cesad-final-opinions/cesad-final-opinions.controller';
import { DocumentType, UserRole } from '@sadep/contracts';
import { artifactContentHash } from './document-artifact-storage';
import { EvaluationProcessDocumentPdfRenderer } from './evaluation-process-document-pdf-renderer';
import { PdfKitProcessDocumentPdfRenderer, type ProcessDocumentPdfInput } from './process-document-pdf-renderer';
import { finalOpinionForm } from './official-final-opinion-renderer';
import { evaluationFactorScores } from '../../domain/evaluations/evaluation-factor-scores';

async function text(pdf: Buffer): Promise<string> { const parsed = await require('pdf-parse/lib/pdf-parse.js')(pdf); return parsed.text.replace(/\s/g, ''); }
describe('Official final conclusive opinion', () => {
  const renderer = new EvaluationProcessDocumentPdfRenderer(new PdfKitProcessDocumentPdfRenderer());
  const snapshot = { stages: [1, 2, 3, 4].map(sequence => ({ sequence, isComplete: true,
    supervisorEvaluation: { id: `evaluation-${sequence}`, factorScores: Array.from({ length: 5 }, () => sequence * 10 + 50), scoreScale: 'PERCENT_0_100', stageAverage: sequence * 10 + 50 },
  })) };
  const input: ProcessDocumentPdfInput = { documentType: DocumentType.CESAD_OPINION, opinionKind: 'FINAL_CONCLUSIVE',
    title: 'Parecer', metadata: [['Processo', '550e8400-e29b-41d4-a716-446655440000']], sections: [],
    generatedAt: new Date('2026-10-07T12:00:00Z'), presentation: { serverName: 'Maria Costa', supervisorName: 'Ana Sousa', version: 1,
      signatures: ['Membro real da comissão', 'Segundo membro CESAD', 'Terceiro membro CESAD'].map(name => ({ name, role: 'CESAD_MEMBER', status: 'COMPLETED', signedAt: '2026-10-07T12:00:00Z' })) },
    logicalContent: { consolidatedSnapshot: snapshot, reportText: 'Ocorrências registradas nas quatro etapas.', legalBasis: 'Decreto nº 249/2011 e Decreto nº 1.338/2015.',
      finalConclusion: 'Conclusão deliberada pela comissão.', finalResult: 'APTO', finalConcept: 'Bom', recommendation: 'Efetivação no cargo.' } };
  it('fills the original DOCX with four stages and real signers without old names or placeholders', async () => {
    const bytes=await fillOriginalDocx(input,false); const zip=new PizZip(bytes); const xml=zip.file('word/document.xml')!.asText();
    expect(xml).toContain('Maria Costa'); expect(xml).toContain('Membro real'); expect(xml).toContain('75.0'); expect(xml).not.toMatch(/MARIA RAIMUNDA|LÍGIA ALICE|SIMONE RAMOS|550e8400|\{\{/);
    const a=await renderer.render(input), b=await renderer.render(input); expect(await text(a)).toContain('PARECERCONCLUSIVO'); expect(a.equals(b)).toBe(true);
  });
  it('renderiza INAPTO / Insuficiente, recomendação e os três signatários persistidos', async () => {
    const bad = { ...input, logicalContent: { ...input.logicalContent, finalResult: 'INAPTO', finalConcept: 'Insuficiente', finalConclusion: 'Servidor considerado INAPTO pela comissão.', recommendation: 'Exoneração recomendada.' } };
    const xml = new PizZip(await fillOriginalDocx(bad, false)).file('word/document.xml')!.asText();
    for (const value of ['INAPTO pela comissão', 'Insuficiente', 'Exoneração recomendada.', 'Segundo membro CESAD', 'Terceiro membro CESAD']) expect(xml).toContain(value);
    expect(xml).not.toContain('considerado APTO');
    const value = await text(await renderer.render(bad)); expect(value).toContain('INAPTOpelacomissão'); expect(value).toContain('TerceiromembroCESAD');
  });
  it('keeps long actual report and rejects incomplete or fifth stages', async () => {
    const a=await renderer.render({ ...input, logicalContent: { ...input.logicalContent, reportText: 'Actual recorded occurrence. '.repeat(800)+'FINAL REPORT' } }); expect(await text(a)).toContain('FINALREPORT'); expect((await PDFDocument.load(a)).getPageCount()).toBeGreaterThan(2);
    await expect(renderer.render({ ...input, logicalContent: { consolidatedSnapshot: { stages: [] } } })).rejects.toThrow(/four completed/);
  });
});
