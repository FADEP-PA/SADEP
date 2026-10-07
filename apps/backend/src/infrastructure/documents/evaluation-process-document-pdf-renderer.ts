import { Injectable } from '@nestjs/common';
import { renderOriginalAnnex, renderOriginalDocx } from './original-template-renderer';
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
      return renderOriginalAnnex(input, false);
    }
    if (input.documentType === DocumentType.SELF_EVALUATION) {
      return renderOriginalAnnex(input, true);
    }
    if (input.documentType === DocumentType.CESAD_OPINION && input.opinionKind === 'FINAL_CONCLUSIVE') {
      return renderOriginalDocx(input, false);
    }
    if (input.documentType === DocumentType.RESULT_NOTIFICATION) return renderOriginalDocx(input, true);
    return this.baseRenderer.render(input);
  }

}
