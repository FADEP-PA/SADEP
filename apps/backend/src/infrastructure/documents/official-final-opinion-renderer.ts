import { BadRequestException } from '@nestjs/common';
import { STAGE_4_PROVISIONAL_RESULT_NOTICE, type CesadFinalOpinionConsolidatedSnapshotRef } from '@sadep/contracts';
import type { ProcessDocumentPdfInput, PdfDocumentSection } from './process-document-pdf-renderer';
import { officialIdentification, officialSignatures, renderOfficialDocument } from './official-document-layout';

export function finalOpinionForm(input: ProcessDocumentPdfInput): ProcessDocumentPdfInput {
  const content = input.logicalContent ?? {};
  const snapshot = content.consolidatedSnapshot as CesadFinalOpinionConsolidatedSnapshotRef | undefined;
  const stages = [...(snapshot?.stages ?? [])].sort((a, b) => a.sequence - b.sequence);
  if (stages.length !== 4 || stages.some((stage, index) => stage.sequence !== index + 1 || !stage.isComplete)) {
    throw new BadRequestException('Final opinion requires the consolidated snapshot of four completed stages');
  }
  const evaluations = stages.map(stage => stage.supervisorEvaluation);
  const compatible = evaluations.every(evaluation => evaluation?.scoreScale && evaluation.scoreScale === evaluations[0]?.scoreScale);
  const factors = ['ASSIDUIDADE', 'DISCIPLINA', 'CAPACIDADE DE INICIATIVA', 'PRODUTIVIDADE', 'RESPONSABILIDADE'];
  const row = (label: string, values: Array<number | undefined>): Array<string | number> => {
    const complete = compatible && values.every(value => typeof value === 'number' && Number.isFinite(value));
    const sum = complete ? (values as number[]).reduce((a, b) => a + b, 0) : undefined;
    return [label, ...values.map(value => typeof value === 'number' && Number.isFinite(value) ? value.toFixed(1) : ''),
      sum?.toFixed(1) ?? '', sum === undefined ? '' : (sum / 4).toFixed(1)];
  };
  const sections: PdfDocumentSection[] = [{ title: 'FATORES DE AVALIAÇÃO', columnWeights: [3, 1, 1, 1, 1, 1.7, 1.7], rows: [
    ['Fator de avaliação', '1ª etapa', '2ª etapa', '3ª etapa', '4ª etapa*', 'Resultado parcial (soma)', 'Resultado final (média)'],
    ...factors.map((factor, index) => row(factor, evaluations.map(evaluation => evaluation?.factorScores?.[index]))),
    row('PONTUAÇÃO GERAL (MÉDIA DOS FATORES)', evaluations.map(evaluation => evaluation?.stageAverage)),
  ], paragraphs: ['Resultados extraídos das avaliações consolidadas das quatro etapas. A soma das etapas compõe o resultado parcial; sua divisão por quatro compõe a média final.'] }];
  if (evaluations.some(evaluation => evaluation?.scoreScale === 'LEGACY_1_5')) {
    sections.push({ title: 'REGISTROS HISTÓRICOS', paragraphs: ['As notas históricas mantêm a escala original de 1 a 5. Não há conversão automática entre escalas. O conceito e a conclusão correspondem ao parecer emitido pela comissão.'] });
  }
  sections.push({ title: '4ª ETAPA — MÉDIA PROVISÓRIA', paragraphs: [STAGE_4_PROVISIONAL_RESULT_NOTICE] });
  for (const [title, field] of [['RELATÓRIO — OCORRÊNCIAS DO ESTÁGIO PROBATÓRIO', 'reportText'], ['FUNDAMENTO LEGAL', 'legalBasis'], ['CONCLUSÃO', 'finalConclusion']] as const) {
    const value = content[field]; if (typeof value === 'string' && value.trim()) sections.push({ title, paragraphs: [value] });
  }
  const result: string[] = [];
  if (typeof content.finalConcept === 'string' && content.finalConcept.trim()) result.push(`Conceito geral obtido: ${content.finalConcept}`);
  if (typeof content.finalResult === 'string' && content.finalResult.trim()) result.push(`Considerando o servidor-estagiário: ${content.finalResult}`);
  if (typeof content.recommendation === 'string' && content.recommendation.trim()) result.push(`Recomendação: ${content.recommendation}`);
  if (result.length) sections.push({ title: 'RESULTADO', paragraphs: result });
  sections.push(officialSignatures(input));
  return { ...input, title: 'PARECER CONCLUSIVO DA COMISSÃO ESPECIAL DE AVALIAÇÃO DE DESEMPENHO — CESAD',
    subtitle: 'ANEXO VI — Decreto nº 249/2011, com redação do Decreto nº 1.338/2015',
    metadata: [...officialIdentification(input), ['Período de acompanhamento', 'Quatro etapas — 1º ao 32º mês; 4ª etapa provisória']], sections };
}

export function renderOfficialFinalOpinion(input: ProcessDocumentPdfInput): Promise<Buffer> {
  return renderOfficialDocument(finalOpinionForm(input));
}
