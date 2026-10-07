import { DocumentType, STAGE_4_PROVISIONAL_RESULT_NOTICE } from '@sadep/contracts';
import { createHash } from 'node:crypto';
import { EvaluationProcessDocumentPdfRenderer } from './evaluation-process-document-pdf-renderer';
import { PdfKitProcessDocumentPdfRenderer, type ProcessDocumentPdfInput } from './process-document-pdf-renderer';
import { supervisorEvaluationForm } from './official-supervisor-evaluation-renderer';

export function pdfText(pdf: Buffer): string {
  return [...pdf.toString('latin1').matchAll(/<([0-9a-f]+)>/g)]
    .map(match => Buffer.from(match[1]!, 'hex').toString('latin1')).join('');
}

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
  it.each([1, 2, 3, 4])('renders the official structure and actual stage %s', async sequence => {
    const request = input('PERCENT_0_100', sequence);
    const form = supervisorEvaluationForm(request);
    const text = pdfText(await renderer.render(request));
    expect(text).toContain('FICHA DE'); expect(text).toContain('José Silva'); expect(text).toContain('Ana Sousa');
    expect(text).toContain('ASSIDUIDADE'); expect(text).toContain('RESPONSABILIDADE'); expect(text).toContain('80.0');
    expect(text).toContain('400.0'); expect(text).toContain('Bom'); expect(text).toContain('Assinado em');
    expect(text).not.toMatch(/550e8400|IMMEDIATE_SUPERVISOR|PENDING|TODO|N\/A|backend|\{\{/);
    expect(JSON.stringify(form)).toContain(`${sequence}ª etapa`);
    expect(JSON.stringify(form).includes(STAGE_4_PROVISIONAL_RESULT_NOTICE)).toBe(sequence === 4);
    if (sequence === 4) expect(text).toContain('Média provisória');
  });
  it('preserves historical 1–5 scores and question wording', async () => {
    const text = pdfText(await renderer.render(input('LEGACY_1_5')));
    expect(text).toContain('80.0'); expect(text).toContain('4.0'); expect(text).toContain('Bom');
    expect(text).toContain('Questão efetivamente'); expect(text).not.toContain('400.0');
  });
  it('is byte deterministic with a stable SHA-256', async () => {
    const request = input(); const a = await renderer.render(request); const b = await renderer.render(request);
    expect(a.equals(b)).toBe(true);
    expect(createHash('sha256').update(a).digest('hex')).toBe(createHash('sha256').update(b).digest('hex'));
  });
  it('keeps long observations across A4 pages without losing the final signature', async () => {
    const request = input(); const content = request.logicalContent!.content as any;
    content.textFields.generalComments = 'Ocorrência registrada na avaliação. '.repeat(900) + 'FIM DAS OBSERVAÇÕES';
    const pdf = await renderer.render(request); const text = pdfText(pdf);
    expect((pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length).toBeGreaterThan(3);
    expect(text.replace(/\s/g, '')).toContain('FIMDASOBSERVAÇÕES'); expect(text).toContain('Assinado em');
  });
  it('keeps provisional notice for historical incomplete content', () => {
    const request = input('LEGACY_1_5', 4); request.logicalContent = { content: { criteria: [] } };
    expect(JSON.stringify(supervisorEvaluationForm(request))).toContain(STAGE_4_PROVISIONAL_RESULT_NOTICE);
  });
});
