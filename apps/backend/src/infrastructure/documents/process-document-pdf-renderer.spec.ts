import { PdfKitProcessDocumentPdfRenderer } from './process-document-pdf-renderer';

describe('PdfKitProcessDocumentPdfRenderer', () => {
  it('creates deterministic structured PDF bytes with Portuguese text and tables', async () => {
    const renderer = new PdfKitProcessDocumentPdfRenderer();
    const input = {
      title: 'Avaliação da chefia', subtitle: 'SADEP — documento processual', generatedAt: new Date('2026-10-05T10:00:00.000Z'),
      metadata: [['Processo', 'process-1'], ['Etapa', '4ª etapa'], ['Servidor', 'José da Silva']] as Array<[string, string]>,
      sections: [{ title: 'Critérios', rows: [['Critério', 'Nota'], ['Assiduidade', 5], ['Responsabilidade', 4]] }],
    };

    const first = await renderer.render(input);
    const second = await renderer.render(input);

    expect(first.subarray(0, 8).toString()).toBe('%PDF-1.3');
    expect(first).toEqual(second);
    expect(first.byteLength).toBeGreaterThan(500);
  });
});
