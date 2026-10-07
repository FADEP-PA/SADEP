import { Injectable } from '@nestjs/common';
import { renderOfficialSupervisorEvaluation } from './official-supervisor-evaluation-renderer';
import { DocumentType } from '@sadep/contracts';

import {
  PdfKitProcessDocumentPdfRenderer,
  type ProcessDocumentPdfInput,
  type ProcessDocumentPdfRenderer,
} from './process-document-pdf-renderer';


@Injectable()
export class EvaluationProcessDocumentPdfRenderer implements ProcessDocumentPdfRenderer {
  constructor(private readonly baseRenderer: PdfKitProcessDocumentPdfRenderer) {}

  render(input: ProcessDocumentPdfInput): Promise<Buffer> {
    if (input.documentType === DocumentType.SUPERVISOR_EVALUATION) {
      return renderOfficialSupervisorEvaluation(input);
    }
    if (input.documentType === DocumentType.SELF_EVALUATION) {
      return this.baseRenderer.render(this.selfEvaluationDocument(input));
    }
    return this.baseRenderer.render(input);
  }

  private selfEvaluationDocument(input: ProcessDocumentPdfInput): ProcessDocumentPdfInput {
    const logicalContent = input.logicalContent ?? {};
    return {
      ...input,
      sections: [
        { title: 'Reflexão do servidor', paragraphs: [String(logicalContent.selfReflection ?? '')] },
        { title: 'Observações adicionais', paragraphs: [String(logicalContent.additionalNotes ?? 'Não informado')] },
        ...(input.sections.find((section) => section.title === 'Assinaturas') ? [input.sections.find((section) => section.title === 'Assinaturas')!] : []),
      ],
    };
  }

}
