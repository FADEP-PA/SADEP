import { DocumentType } from '@sadep/contracts';

import { EvaluationProcessDocumentPdfRenderer } from './evaluation-process-document-pdf-renderer';
import { PdfKitProcessDocumentPdfRenderer } from './process-document-pdf-renderer';

describe('EvaluationProcessDocumentPdfRenderer', () => {
  const renderer = new EvaluationProcessDocumentPdfRenderer(new PdfKitProcessDocumentPdfRenderer());

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
      logicalContent: { summary: 'Resumo institucional', generalComments: 'Observações da chefia', content: { criteria } },
      sections: [{ title: 'Assinaturas', rows: [['Usuário', 'Papel', 'Status', 'Data'], ['Servidor', 'INTERN_SERVER', 'PENDING', 'Pendente']] }],
      generatedAt: new Date('2026-10-05T10:00:00.000Z'),
    });

    // PDFKit encodes WinAnsi text as hexadecimal PDF strings. Assert stable
    // encoded fragments instead of coupling the test to the binary layout.
    const encoded = pdf.toString('latin1');
    expect(encoded).toContain('446f63756d656e746f'); // Documento
    expect(encoded).toContain('6f74616c20646173203230206e6f746173'); // otal das 20 notas
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
