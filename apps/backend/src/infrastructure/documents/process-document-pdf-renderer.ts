import PDFDocument from 'pdfkit';
import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

export type PdfDocumentValue = string | number | null | undefined;

export interface PdfDocumentSection {
  title: string;
  paragraphs?: string[];
  rows?: Array<Array<PdfDocumentValue>>;
}

export interface ProcessDocumentPdfInput {
  title: string;
  subtitle?: string;
  metadata: Array<[string, PdfDocumentValue]>;
  sections: PdfDocumentSection[];
  logicalContent?: Record<string, unknown>;
  generatedAt: Date;
}

export const PROCESS_DOCUMENT_PDF_RENDERER = Symbol('PROCESS_DOCUMENT_PDF_RENDERER');

export interface ProcessDocumentPdfRenderer {
  render(input: ProcessDocumentPdfInput): Promise<Buffer>;
}

@Injectable()
export class PdfKitProcessDocumentPdfRenderer implements ProcessDocumentPdfRenderer {
  render(input: ProcessDocumentPdfInput): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const document = new PDFDocument({ size: 'A4', margin: 48, compress: false, info: { Title: input.title, Creator: 'SADEP' } });
      const chunks: Buffer[] = [];
      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.on('end', () => resolve(this.makeDeterministic(Buffer.concat(chunks))));
      document.on('error', reject);
      document.font('Helvetica').fontSize(16).fillColor('#17365d').text(input.title, { align: 'center' });
      if (input.subtitle) document.moveDown(0.25).fontSize(10).fillColor('#333333').text(input.subtitle, { align: 'center' });
      document.moveDown(1);
      this.renderMetadata(document, input.metadata);
      for (const section of input.sections) this.renderSection(document, section);
      document.fontSize(8).fillColor('#666666').text(`Gerado em ${input.generatedAt.toLocaleString('pt-BR')}`, 48, 790, { align: 'left' });
      document.end();
    });
  }

  private makeDeterministic(content: Buffer): Buffer {
    const withoutGeneratedId = content.toString('latin1').replace(/\/ID \[<[0-9a-f]+> <[0-9a-f]+>\]/, '/ID [<00000000000000000000000000000000> <00000000000000000000000000000000>]');
    const id = createHash('md5').update(withoutGeneratedId, 'latin1').digest('hex');
    return Buffer.from(withoutGeneratedId.replace(/<00000000000000000000000000000000> <00000000000000000000000000000000>/, `<${id}> <${id}>`), 'latin1');
  }

  private renderMetadata(document: PDFKit.PDFDocument, metadata: Array<[string, PdfDocumentValue]>): void {
    document.fontSize(9).fillColor('#222222');
    for (const [label, value] of metadata) document.text(`${label}: ${value ?? '—'}`);
    document.moveDown(0.75);
  }

  private renderSection(document: PDFKit.PDFDocument, section: PdfDocumentSection): void {
    document.fontSize(12).fillColor('#17365d').text(section.title, { underline: true });
    document.moveDown(0.25).fontSize(10).fillColor('#222222');
    for (const paragraph of section.paragraphs ?? []) document.text(paragraph, { align: 'left', lineGap: 3 }).moveDown(0.25);
    if (section.rows?.length) this.renderTable(document, section.rows);
    document.moveDown(0.75);
  }

  private renderTable(document: PDFKit.PDFDocument, rows: Array<Array<PdfDocumentValue>>): void {
    const columnCount = Math.max(...rows.map((row) => row.length));
    const columnWidth = (document.page.width - 96) / columnCount;
    for (const [rowIndex, row] of rows.entries()) {
      const y = document.y;
      const cells = Array.from({ length: columnCount }, (_, index) => String(row[index] ?? ''));
      const height = Math.max(22, ...cells.map((cell) => document.heightOfString(cell, { width: columnWidth - 8 }) + 8));
      if (y + height > document.page.height - 70) {
        document.addPage();
      }
      const rowY = document.y;
      cells.forEach((cell, index) => {
        const x = 48 + index * columnWidth;
        document.rect(x, rowY, columnWidth, height).strokeColor('#b7c9dc').stroke();
        document.fontSize(9).fillColor(rowIndex === 0 ? '#17365d' : '#222222').text(cell, x + 4, rowY + 4, { width: columnWidth - 8, height: height - 8 });
      });
      document.y = rowY + height;
    }
  }
}
