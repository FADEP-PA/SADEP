import { DocumentType, STAGE_4_PROVISIONAL_RESULT_NOTICE } from '@sadep/contracts';

import { EvaluationProcessDocumentPdfRenderer } from './evaluation-process-document-pdf-renderer';
import { PdfKitProcessDocumentPdfRenderer } from './process-document-pdf-renderer';

describe('EvaluationProcessDocumentPdfRenderer', () => {
  const renderer = new EvaluationProcessDocumentPdfRenderer(new PdfKitProcessDocumentPdfRenderer());

  it.each([1, 2, 3, 4])('labels only stage four as provisional (sequence %s)', async (stageSequence) => {
    const base = new PdfKitProcessDocumentPdfRenderer();
    const spy = jest.spyOn(base, 'render');
    const stageRenderer = new EvaluationProcessDocumentPdfRenderer(base);
    const criteria = Array.from({ length: 20 }, (_, index) => ({ code: `C${index + 1}`, label: 'Critério', rating: 50 }));
    const pdf = await stageRenderer.render({
      documentType: DocumentType.SUPERVISOR_EVALUATION, stageSequence,
      title: 'Avaliação da chefia', metadata: [],
      logicalContent: { scoreScale: 'PERCENT_0_100', summary: 'Resumo', generalComments: 'Resultado final informado pela chefia: projeção anterior', content: { criteria, textFields: { generalComments: 'Observação original' } } },
      sections: [], generatedAt: new Date('2026-10-07T12:00:00.000Z'),
    });
    const paragraphs = spy.mock.calls[0]![0].sections[0]!.paragraphs!;
    if (stageSequence === 4) {
      expect(paragraphs).toContain(STAGE_4_PROVISIONAL_RESULT_NOTICE);
      expect(paragraphs).toContain('Média provisória da etapa: 50.0');
      expect(paragraphs).toContain('Conceito administrativo provisório: Regular');
      expect(paragraphs.some((text) => text.includes('Resultado final') || text.includes('Média final'))).toBe(false);
      expect(paragraphs).toContain('Observações: Observação original');
      const decodedText = [...pdf.toString('latin1').matchAll(/<([0-9a-f]+)>/g)]
        .map((match) => Buffer.from(match[1]!, 'hex').toString('latin1')).join('');
      expect(decodedText).toContain('Média provisória da etapa: 50.0');
    } else {
      expect(paragraphs).toContain('Média final da etapa: 50.0');
      expect(paragraphs).not.toContain(STAGE_4_PROVISIONAL_RESULT_NOTICE);
      expect(paragraphs.some((text) => text.includes('provisóri'))).toBe(false);
    }
  });

  it('includes the stage-four notice even with incomplete criteria', async () => {
    const base = new PdfKitProcessDocumentPdfRenderer();
    const spy = jest.spyOn(base, 'render');
    await new EvaluationProcessDocumentPdfRenderer(base).render({
      documentType: DocumentType.SUPERVISOR_EVALUATION, stageSequence: 4,
      title: 'Avaliação', metadata: [], logicalContent: { content: { criteria: [] } },
      sections: [], generatedAt: new Date('2026-10-07T12:00:00.000Z'),
    });
    expect(spy.mock.calls[0]![0].sections[0]!.paragraphs).toContain(STAGE_4_PROVISIONAL_RESULT_NOTICE);
  });

  it('renders the supervisor criteria, notes, 20-item total and signatures without legacy 0-100 recalculation', async () => {
    const criteria = Array.from({ length: 20 }, (_, index) => ({
      code: `C${index + 1}`,
      label: `Critério ${index + 1}`,
      rating: (index % 5) + 1,
      comment: index === 0 ? 'Comentário com ação e atenção' : '',
    }));
    const pdf = await renderer.render({
      documentType: DocumentType.SUPERVISOR_EVALUATION,
      title: 'Documento processual — avaliação da chefia',
      metadata: [['Processo', 'process-1'], ['Etapa', '4ª etapa'], ['Servidor', 'José da Silva']],
      logicalContent: {
        summary: 'Resumo institucional',
        generalComments: 'Observações da chefia',
        scoreScale: 'PERCENT_0_100',
        content: { criteria },
      },
      sections: [{ title: 'Assinaturas', rows: [['Usuário', 'Papel', 'Status', 'Data'], ['Servidor', 'INTERN_SERVER', 'PENDING', 'Pendente']] }],
      generatedAt: new Date('2026-10-05T10:00:00.000Z'),
    });

    // PDFKit encodes WinAnsi text as hexadecimal PDF strings. Assert stable
    // encoded fragments instead of coupling the test to the binary layout.
    const encoded = pdf.toString('latin1');
    expect(encoded).toContain('446f63756d656e746f'); // Documento
    expect(encoded).toContain('4e6f7461202830'); // Nota (0–100)
    expect(encoded).toContain('656e64656e7465'); // endente
    expect(encoded).not.toContain('302d313030'); // legacy 0-100
    expect((encoded.match(/\/Type \/Page/g) ?? []).length).toBeGreaterThan(1);
  });

  it('keeps self-evaluation separate and preserves long Portuguese content across pages', async () => {
    const pdf = await renderer.render({
      documentType: DocumentType.SELF_EVALUATION,
      title: 'Documento processual — autoavaliação',
      metadata: [['Processo', 'process-2'], ['Etapa', '2ª etapa']],
      logicalContent: { selfReflection: 'A'.repeat(5000), additionalNotes: 'Observação adicional: atuação ética e responsável.' },
      sections: [{ title: 'Assinaturas', rows: [['Usuário', 'Papel', 'Status', 'Data'], ['Chefia', 'IMMEDIATE_SUPERVISOR', 'COMPLETED', '2026-10-05']] }],
      generatedAt: new Date('2026-10-05T10:00:00.000Z'),
    });

    expect(pdf.subarray(0, 8).toString()).toBe('%PDF-1.3');
    expect((pdf.toString('latin1').match(/\/Type \/Page/g) ?? []).length).toBeGreaterThan(1);
  });
});
