import { DocumentType } from '@sadep/contracts';
import { artifactContentHash } from './document-artifact-storage';
import { EvaluationProcessDocumentPdfRenderer } from './evaluation-process-document-pdf-renderer';
import { PdfKitProcessDocumentPdfRenderer, type ProcessDocumentPdfInput } from './process-document-pdf-renderer';
import { notificationForm } from './official-result-notification-renderer';

function text(pdf: Buffer) {
  return [...pdf.toString('latin1').matchAll(/<([0-9a-f]+)>/g)].map(match => Buffer.from(match[1]!, 'hex').toString('latin1')).join('').replace(/\s/g, '');
}
describe('Official personal notification', () => {
  const renderer = new EvaluationProcessDocumentPdfRenderer(new PdfKitProcessDocumentPdfRenderer());
  const input: ProcessDocumentPdfInput = { documentType: DocumentType.RESULT_NOTIFICATION, title: 'Notificação',
    metadata: [['Processo', '550e8400-e29b-41d4-a716-446655440000']], sections: [], generatedAt: new Date('2026-10-07T12:00:00Z'),
    presentation: { serverName: 'Maria Costa', version: 1, signatures: [] },
    logicalContent: { homologatedAt: '2026-10-07T12:00:00Z', notifiedAt: '2026-10-07T13:00:00Z', authorityName: 'Autoridade real',
      homologationRemarks: 'Homologo o resultado do parecer conclusivo.', finalResult: 'APTO', finalConcept: 'Bom' } };
  it('renders the institutional notice using real decision and authority without inventing a signature', async () => {
    const value = text(await renderer.render(input));
    expect(value).toContain('NOTIFICAÇÃOPESSOAL'); expect(value).toContain('MariaCosta'); expect(value).toContain('Autoridadereal');
    expect(value).toContain('Homologooresultado'); expect(value).toContain('APTO'); expect(value).toContain('Bom');
    expect(value).toContain('5(cinco)dias'); expect(value).toContain('ciênciadoresultado'); expect(value).toContain('22a25');
    expect(value).not.toMatch(/550e8400|RESULT_NOTIFICATION|TODO|N\/A|\{\{|backend|Assinadoem|imprimir|escanear/);
  });
  it('rejects absence of valid homologation, notification or authority data', () => {
    for (const field of ['homologatedAt', 'notifiedAt', 'authorityName']) {
      expect(() => notificationForm({ ...input, logicalContent: { ...input.logicalContent, [field]: null } })).toThrow(/valid homologation/);
    }
  });
  it('presents only actual signature records when they exist', async () => {
    const value = text(await renderer.render({ ...input, presentation: { ...input.presentation!, signatures: [{ name: 'Autoridade real', role: 'HOMOLOGATION_AUTHORITY', status: 'COMPLETED', signedAt: '2026-10-07T13:00:00Z' }] } }));
    expect(value).toContain('Assinadoem'); expect(value).not.toContain('HOMOLOGATION_AUTHORITY');
  });
  it('keeps deterministic bytes and hashes including historical act dates', async () => {
    const historical = { ...input, logicalContent: { ...input.logicalContent, homologatedAt: '2021-01-02T12:00:00Z', notifiedAt: '2021-01-03T12:00:00Z' } };
    const a = await renderer.render(historical), b = await renderer.render(historical);
    expect(a.equals(b)).toBe(true); expect(artifactContentHash(a)).toBe(artifactContentHash(b));
    expect(text(a)).toContain('2021');
  });
  it('paginates a long real decision without dropping the notice and appeal information', async () => {
    const pdf = await renderer.render({ ...input, logicalContent: { ...input.logicalContent, homologationRemarks: 'Decisão motivada com fundamento no processo. '.repeat(800) + 'FIM DA DECISÃO' } });
    expect((pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length).toBeGreaterThan(2);
    expect(text(pdf)).toContain('FIMDADECISÃO'); expect(text(pdf)).toContain('5(cinco)dias');
  });
});
