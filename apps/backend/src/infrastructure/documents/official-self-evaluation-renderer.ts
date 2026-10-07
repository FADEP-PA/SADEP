import type { ProcessDocumentPdfInput, PdfDocumentSection } from './process-document-pdf-renderer';
import { officialIdentification, officialSignatures, renderOfficialDocument } from './official-document-layout';

export function selfEvaluationForm(input: ProcessDocumentPdfInput): ProcessDocumentPdfInput {
  const content = input.logicalContent ?? {};
  const sections: PdfDocumentSection[] = [{ title: 'AUTOAVALIAÇÃO', paragraphs: [
    'Descrever as tarefas que você vem desenvolvendo, destacar os aspectos positivos e negativos, considerar os seguintes fatores: coordenação, planejamento e avaliação do trabalho, espaço físico, equipamento e materiais, segurança, relações de trabalho e outros.',
    typeof content.selfReflection === 'string' ? content.selfReflection : '',
  ] }];
  if (typeof content.additionalNotes === 'string' && content.additionalNotes.trim()) {
    sections.push({ title: 'OUTRAS OBSERVAÇÕES', paragraphs: [content.additionalNotes] });
  }
  sections.push(officialSignatures(input));
  return { ...input, title: 'FICHA DE AUTOAVALIAÇÃO DO SERVIDOR-ESTAGIÁRIO',
    subtitle: 'ANEXO V — Decreto nº 249/2011, com redação do Decreto nº 1.338/2015',
    metadata: officialIdentification(input), sections };
}

export function renderOfficialSelfEvaluation(input: ProcessDocumentPdfInput): Promise<Buffer> {
  return renderOfficialDocument(selfEvaluationForm(input));
}
