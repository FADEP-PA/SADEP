import { Injectable } from '@nestjs/common';
import { renderOfficialSupervisorEvaluation } from './official-supervisor-evaluation-renderer';
import { renderOfficialSelfEvaluation } from './official-self-evaluation-renderer';
import { renderOfficialFinalOpinion } from './official-final-opinion-renderer';
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
      return renderOfficialSelfEvaluation(input);
    }
    if (input.documentType === DocumentType.CESAD_OPINION && input.opinionKind === 'FINAL_CONCLUSIVE') {
      return renderOfficialFinalOpinion(input);
    }
    return this.baseRenderer.render(input);
  }

}
