import { calculateEvaluationRatingsScore, isProvisionalStageResult, STAGE_4_PROVISIONAL_RESULT_NOTICE, type SupervisorEvaluationContentInput } from '@sadep/contracts';
import type { PdfDocumentSection, ProcessDocumentPdfInput } from './process-document-pdf-renderer';
import { officialIdentification, officialSignatures, renderOfficialDocument } from './official-document-layout';

export function supervisorEvaluationForm(input: ProcessDocumentPdfInput): ProcessDocumentPdfInput {
  const logical = input.logicalContent ?? {};
  const content = (logical.content ?? { criteria: [] }) as SupervisorEvaluationContentInput;
  const criteria = Array.isArray(content.criteria) ? content.criteria : [];
  const scale = logical.scoreScale === 'PERCENT_0_100' ? 'PERCENT_0_100' : 'LEGACY_1_5';
  const provisional = isProvisionalStageResult(input.stageSequence);
  const factors = ['ASSIDUIDADE', 'DISCIPLINA', 'CAPACIDADE DE INICIATIVA', 'PRODUTIVIDADE', 'RESPONSABILIDADE'];
  const sections: PdfDocumentSection[] = [{ title: 'INSTRUÇÕES INICIAIS', paragraphs: [scale === 'PERCENT_0_100'
    ? 'Avaliação constituída de cinco fatores. Atribuição de notas de 0 a 100, em passos de 10. O ponto de cada fator corresponde à média dos seus subfatores. A média da etapa corresponde à soma dos pontos dos fatores dividida por cinco.'
    : 'Avaliação histórica registrada na escala de 1 a 5. As notas e o conceito preservam a regra vigente no registro original.'], ...(scale === 'PERCENT_0_100' ? { rows: [['Pontos', 'Conceito'], ['0 a 49,9', 'INSUFICIENTE'], ['50 a 69,9', 'REGULAR'], ['70 a 89,9', 'BOM'], ['90 a 100', 'EXCELENTE']], columnWeights: [1, 2] } : {}) }];
  factors.forEach((factor, index) => {
    // Preserve the actual question assessed; never relabel a historical score as a different subfactor.
    const items = criteria.filter(item => item.code.startsWith(`${index + 1}.`));
    if (!items.length) return;
    const total = items.reduce((sum, item) => sum + item.rating, 0);
    sections.push({ title: `${index + 1}. ${factor}`, columnWeights: [8, 1], rows: [
      ['Fatores e subfatores de avaliação', scale === 'PERCENT_0_100' ? 'Nota (0–100)' : 'Nota (1–5)'],
      ...items.map(item => [`${item.code}. ${item.label}`, item.rating]),
      ['TOTAL', total.toFixed(1)], ['PONTO DO FATOR = MÉDIA DOS SUBFATORES', (total / items.length).toFixed(1)],
    ] });
    for (const item of items) if (item.comment?.trim()) sections.push({ title: `OBSERVAÇÃO — SUBFATOR ${item.code}`, paragraphs: [item.comment] });
  });
  if (!sections.some(section => section.rows?.some(row => String(row[0]).includes('SUBFATORES')))) {
    sections.push({ title: 'FATORES E SUBFATORES DE AVALIAÇÃO', columnWeights: [8, 1], rows: [['Critério registrado', 'Nota'], ...criteria.map(item => [`${item.code}. ${item.label}`, item.rating])] });
  }
  if (criteria.length === 20) {
    const score = calculateEvaluationRatingsScore(criteria.map(item => item.rating), scale);
    sections.push({ title: provisional ? 'RESULTADO PROVISÓRIO' : 'RESULTADO DA ETAPA', paragraphs: [
      ...(scale === 'PERCENT_0_100' ? [`Pontuação total da etapa (soma das médias dos subfatores): ${(Number(score.stageAverage) * 5).toFixed(1)}`] : [`Pontuação histórica da etapa: ${score.totalStageScore}`]),
      `${provisional ? 'Média provisória da etapa' : 'Média da etapa'}: ${score.stageAverage}`,
      `Conceito${provisional ? ' provisório' : ''}: ${score.administrativeConcept}`,
    ] });
  }
  if (provisional) sections.push({ title: 'CARÁTER PROVISÓRIO DA 4ª ETAPA', paragraphs: [STAGE_4_PROVISIONAL_RESULT_NOTICE] });
  const observations = content.textFields?.generalComments ?? logical.generalComments;
  if (typeof observations === 'string' && observations.trim()) sections.push({ title: 'OBSERVAÇÕES', paragraphs: [observations] });
  sections.push(officialSignatures(input));
  return { ...input, title: 'FICHA DE AVALIAÇÃO DE DESEMPENHO DO SERVIDOR-ESTAGIÁRIO', subtitle: 'ANEXO IV — Decreto nº 249/2011, com redação do Decreto nº 1.338/2015', metadata: officialIdentification(input), sections };
}

export function renderOfficialSupervisorEvaluation(input: ProcessDocumentPdfInput): Promise<Buffer> {
  return renderOfficialDocument(supervisorEvaluationForm(input));
}
