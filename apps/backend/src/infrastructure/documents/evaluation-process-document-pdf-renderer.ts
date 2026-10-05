import { Injectable } from '@nestjs/common';
import { calculateEvaluationRatingsScore, DocumentType, type EvaluationScoreScale } from '@sadep/contracts';

import {
  PdfKitProcessDocumentPdfRenderer,
  type ProcessDocumentPdfInput,
  type ProcessDocumentPdfRenderer,
} from './process-document-pdf-renderer';

type Criterion = { code: string; label: string; rating: number; comment?: string };

@Injectable()
export class EvaluationProcessDocumentPdfRenderer implements ProcessDocumentPdfRenderer {
  constructor(private readonly baseRenderer: PdfKitProcessDocumentPdfRenderer) {}

  render(input: ProcessDocumentPdfInput): Promise<Buffer> {
    if (input.documentType === DocumentType.SUPERVISOR_EVALUATION) {
      return this.baseRenderer.render(this.supervisorEvaluationDocument(input));
    }
    if (input.documentType === DocumentType.SELF_EVALUATION) {
      return this.baseRenderer.render(this.selfEvaluationDocument(input));
    }
    return this.baseRenderer.render(input);
  }

  private supervisorEvaluationDocument(input: ProcessDocumentPdfInput): ProcessDocumentPdfInput {
    const logicalContent = input.logicalContent ?? {};
    const content = (logicalContent.content ?? {}) as { criteria?: unknown };
    const criteria = Array.isArray(content.criteria) ? content.criteria.filter(this.isCriterion) : [];
    const scoreScale: EvaluationScoreScale = logicalContent.scoreScale === 'PERCENT_0_100'
      ? 'PERCENT_0_100'
      : 'LEGACY_1_5';
    const rows: Array<Array<string | number>> = [[
      'Código',
      'Critério',
      scoreScale === 'PERCENT_0_100' ? 'Nota (0–100)' : 'Nota (1–5)',
      'Comentário',
    ]];
    for (const criterion of criteria) rows.push([criterion.code, criterion.label, criterion.rating, criterion.comment ?? '']);
    const summaries = [
      `Resumo: ${String(logicalContent.summary ?? '')}`,
      `Observações: ${String(logicalContent.generalComments ?? '')}`,
    ];
    if (criteria.length === 20) {
      const score = calculateEvaluationRatingsScore(criteria.map((criterion) => criterion.rating), scoreScale);
      summaries.push(`Pontuação da etapa: ${score.totalStageScore} (${scoreScale === 'PERCENT_0_100' ? 'escala 0–100' : 'escala histórica 1–5'})`);
      summaries.push(`Média final da etapa: ${score.stageAverage}`);
      summaries.push(`Conceito administrativo: ${score.administrativeConcept}`);
    } else {
      summaries.push(`Critérios registrados: ${criteria.length}. O backend não fornece consolidação administrativa para este conteúdo.`);
    }
    return {
      ...input,
      sections: [
        { title: 'Resumo e observações', paragraphs: summaries },
        { title: 'Critérios e notas registradas', rows },
        ...(input.sections.find((section) => section.title === 'Assinaturas') ? [input.sections.find((section) => section.title === 'Assinaturas')!] : []),
      ],
    };
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

  private isCriterion(value: unknown): value is Criterion {
    if (!value || typeof value !== 'object') return false;
    const criterion = value as Partial<Criterion>;
    return typeof criterion.code === 'string' && typeof criterion.label === 'string' && typeof criterion.rating === 'number';
  }
}
