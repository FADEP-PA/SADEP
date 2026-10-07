import PDFDocument from 'pdfkit';
import { createHash } from 'node:crypto';
import type { PdfDocumentSection, ProcessDocumentPdfInput } from './process-document-pdf-renderer';

/** Digital transcription of the institutional forms, independent of local reference files. */
export function renderOfficialDocument(input: ProcessDocumentPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margins: { top: 104, bottom: 58, left: 45, right: 45 },
      compress: false, bufferPages: true,
      info: { Title: input.title, Creator: 'SADEP', CreationDate: input.generatedAt, ModDate: input.generatedAt } });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => {
      const zero = '00000000000000000000000000000000';
      const content = Buffer.concat(chunks).toString('latin1').replace(/\/ID \[<[0-9a-f]+> <[0-9a-f]+>\]/, `/ID [<${zero}> <${zero}>]`);
      const id = createHash('md5').update(content, 'latin1').digest('hex');
      resolve(Buffer.from(content.replace(`<${zero}> <${zero}>`, `<${id}> <${id}>`), 'latin1'));
    });
    const width = doc.page.width - 90;
    const header = () => {
      doc.font('Helvetica-Bold').fontSize(9).fillColor('black');
      doc.text('GOVERNO DO ESTADO DO PARÁ', 45, 35, { width, align: 'center' });
      doc.text('SECRETARIA DE ESTADO DE EDUCAÇÃO', { width, align: 'center' });
      doc.font('Helvetica').fontSize(8).text('SECRETARIA ADJUNTA DE GESTÃO DE PESSOAS', { width, align: 'center' });
      doc.text('COMISSÃO ESPECIAL DE AVALIAÇÃO DE DESEMPENHO — CESAD', { width, align: 'center' });
      doc.moveTo(45, 88).lineTo(doc.page.width - 45, 88).strokeColor('black').lineWidth(0.5).stroke();
      doc.x = 45; doc.y = 104;
      doc.font('Helvetica').fontSize(10);
    };
    header(); doc.on('pageAdded', header);
    doc.font('Helvetica-Bold').fontSize(12).text(input.title, { width, align: 'center' }).moveDown(0.7);
    if (input.subtitle) doc.font('Helvetica').fontSize(9).text(input.subtitle, { width, align: 'center' }).moveDown(0.7);
    doc.font('Helvetica').fontSize(10);
    for (const [label, value] of input.metadata) {
      if (value !== null && value !== undefined && String(value).trim()) doc.text(`${label}: ${value}`, { width, lineGap: 2 });
    }
    doc.moveDown(0.6);
    const ensureSpace = (height: number) => { if (doc.y + height > doc.page.height - 58) doc.addPage(); };
    const table = (section: PdfDocumentSection) => {
      const rows = section.rows!;
      const count = Math.max(...rows.map(row => row.length));
      const weights = section.columnWeights ?? Array.from({ length: count }, () => 1);
      const total = weights.reduce((a, b) => a + b, 0);
      const widths = weights.map(weight => width * weight / total);
      const drawRow = (row: Array<string | number | null | undefined>, bold: boolean) => {
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
        const cells = Array.from({ length: count }, (_, index) => String(row[index] ?? ''));
        const height = Math.max(25, ...cells.map((cell, index) => doc.heightOfString(cell, { width: widths[index]! - 12, lineGap: 2 }) + 12));
        const y = doc.y; let x = 45;
        cells.forEach((cell, index) => {
          doc.rect(x, y, widths[index]!, height).strokeColor('black').lineWidth(0.4).stroke();
          doc.text(cell, x + 6, y + 6, { width: widths[index]! - 12, height: height - 10, lineGap: 2 });
          x += widths[index]!;
        });
        doc.x = 45; doc.y = y + height;
        return height;
      };
      rows.forEach((row, index) => {
        doc.font(index === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
        const height = Math.max(25, ...row.map((cell, col) => doc.heightOfString(String(cell ?? ''), { width: widths[col]! - 12, lineGap: 2 }) + 12));
        if (doc.y + height > doc.page.height - 58) {
          doc.addPage();
          if (index > 0) drawRow(rows[0]!, true);
        }
        drawRow(row, index === 0);
      });
    };
    for (const section of input.sections) {
      ensureSpace(60);
      doc.font('Helvetica-Bold').fontSize(10).text(section.title, { width }).moveDown(0.4);
      doc.font('Helvetica').fontSize(10);
      for (const paragraph of section.paragraphs ?? []) {
        if (paragraph.trim()) doc.text(paragraph, { width, align: 'justify', lineGap: 3 }).moveDown(0.5);
      }
      if (section.rows?.length) table(section);
      doc.moveDown(0.6);
    }
    const range = doc.bufferedPageRange();
    for (let page = range.start; page < range.start + range.count; page++) {
      doc.switchToPage(page);
      const bottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      doc.font('Helvetica').fontSize(8).text(`Versão ${input.presentation?.version ?? 1} • Página ${page + 1} de ${range.count}`,
        45, doc.page.height - 40, { width, align: 'right', lineBreak: false });
      doc.page.margins.bottom = bottom;
    }
    doc.end();
  });
}

export function officialIdentification(input: ProcessDocumentPdfInput): Array<[string, string | number | undefined]> {
  const periods = ['1º ao 6º mês', '7º ao 12º mês', '13º ao 24º mês', '25º ao 32º mês'];
  return [
    ['Nome do servidor-estagiário', input.presentation?.serverName],
    ['Nome da chefia imediata', input.presentation?.supervisorName],
    ['Etapa', input.stageSequence ? `${input.stageSequence}ª etapa` : undefined],
    ['Período de acompanhamento', input.stageSequence ? periods[input.stageSequence - 1] : undefined],
  ];
}

export function officialSignatures(input: ProcessDocumentPdfInput): PdfDocumentSection {
  const roles: Record<string, string> = { INTERN_SERVER: 'Servidor-estagiário', IMMEDIATE_SUPERVISOR: 'Chefia imediata', CESAD_MEMBER: 'Membro da CESAD', HOMOLOGATION_AUTHORITY: 'Autoridade homologadora', ADMIN: 'Administrador' };
  return { title: 'ASSINATURAS ELETRÔNICAS', columnWeights: [3, 2, 3], rows: [
    ['Signatário', 'Qualidade', 'Registro'],
    ...(input.presentation?.signatures ?? []).map(signature => [signature.name, roles[signature.role] ?? 'Signatário',
      signature.status === 'COMPLETED' && signature.signedAt
        ? `Assinado em ${new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Belem', dateStyle: 'short', timeStyle: 'medium' }).format(new Date(signature.signedAt))}`
        : 'Aguardando assinatura']),
  ] };
}
