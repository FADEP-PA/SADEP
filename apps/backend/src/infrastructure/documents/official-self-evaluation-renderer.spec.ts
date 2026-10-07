import { DocumentType } from '@sadep/contracts';
import { createHash } from 'node:crypto';
import { EvaluationProcessDocumentPdfRenderer } from './evaluation-process-document-pdf-renderer';
import { PdfKitProcessDocumentPdfRenderer, type ProcessDocumentPdfInput } from './process-document-pdf-renderer';
import { selfEvaluationForm } from './official-self-evaluation-renderer';

function text(pdf: Buffer): string {
  return [...pdf.toString('latin1').matchAll(/<([0-9a-f]+)>/g)].map(match => Buffer.from(match[1]!, 'hex').toString('latin1')).join('').replace(/\s/g, '');
}
describe('Official Anexo V', () => {
  const renderer = new EvaluationProcessDocumentPdfRenderer(new PdfKitProcessDocumentPdfRenderer());
  const input: ProcessDocumentPdfInput = { documentType: DocumentType.SELF_EVALUATION, stageSequence: 2,
    title: 'Autoavaliação', metadata: [['Documento', '550e8400-e29b-41d4-a716-446655440000']], sections: [],
    generatedAt: new Date('2026-10-07T12:00:00Z'), logicalContent: { selfReflection: 'Planejei as atividades e avaliei seus resultados.', additionalNotes: 'Relações de trabalho respeitosas.' },
    presentation: { serverName: 'Maria Costa', supervisorName: 'João Lima', version: 3, signatures: [
      { name: 'Maria Costa', role: 'INTERN_SERVER', status: 'COMPLETED', signedAt: '2026-10-07T12:00:00Z' },
      { name: 'João Lima', role: 'IMMEDIATE_SUPERVISOR', status: 'COMPLETED', signedAt: '2026-10-07T13:00:00Z' },
    ] } };
  it('dispatches the actual document type and maps the official content and signatures', async () => {
    const pdf = await renderer.render(input); const value = text(pdf);
    expect(value).toContain('FICHADEAUTOAVALIAÇÃODOSERVIDOR'); expect(value).toContain('ANEXOV');
    expect(value).toContain('MariaCosta'); expect(value).toContain('JoãoLima'); expect(value).toContain('7ºao12ºmês');
    expect(value).toContain('Planejeiasatividades'); expect(value).toContain('OUTRASOBSERVAÇÕES');
    expect(value).toContain('Assinadoem07/10/2026'); expect(value).toContain('Versão3');
    expect(value).not.toMatch(/550e8400|INTERN_SERVER|COMPLETED|TODO|N\/A|backend|\{\{|Conceito|Pontuação/);
  });
  it('does not invent optional observations or functional identification', () => {
    const form = selfEvaluationForm({ ...input, logicalContent: { selfReflection: 'Registro histórico.' } });
    expect(form.sections.some(section => section.title === 'OUTRAS OBSERVAÇÕES')).toBe(false);
    expect(JSON.stringify(form.sections)).not.toMatch(/Não informado|placeholder|TODO/);
  });
  it('preserves historical text with no score conversion', async () => {
    const pdf = await renderer.render({ ...input, logicalContent: { selfReflection: 'Autoavaliação histórica de 2021.', additionalNotes: null } });
    expect(text(pdf)).toContain('Autoavaliaçãohistóricade2021.');
  });
  it('is byte deterministic with a stable hash', async () => {
    const a = await renderer.render(input), b = await renderer.render(input);
    expect(a.equals(b)).toBe(true);
    expect(createHash('sha256').update(a).digest('hex')).toEqual(createHash('sha256').update(b).digest('hex'));
  });
  it('paginates long text and keeps its ending and both signatures', async () => {
    const pdf = await renderer.render({ ...input, logicalContent: { selfReflection: 'Atividade registrada no período. '.repeat(1000) + 'FIM DA AUTOAVALIAÇÃO', additionalNotes: 'Observação final.' } });
    expect((pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length).toBeGreaterThan(2);
    expect(text(pdf)).toContain('FIMDAAUTOAVALIAÇÃO'); expect(text(pdf)).toContain('Observaçãofinal.');
    expect(text(pdf)).toContain('MariaCosta'); expect(text(pdf)).toContain('JoãoLima');
  });
});
