import { CesadFinalOpinionsController } from '../../processes/cesad-final-opinions/cesad-final-opinions.controller';
import { DocumentType, UserRole } from '@sadep/contracts';
import { artifactContentHash } from './document-artifact-storage';
import { EvaluationProcessDocumentPdfRenderer } from './evaluation-process-document-pdf-renderer';
import { PdfKitProcessDocumentPdfRenderer, type ProcessDocumentPdfInput } from './process-document-pdf-renderer';
import { finalOpinionForm } from './official-final-opinion-renderer';
import { evaluationFactorScores } from '../../domain/evaluations/evaluation-factor-scores';

function text(pdf: Buffer): string {
  return [...pdf.toString('latin1').matchAll(/<([0-9a-f]+)>/g)].map(match => Buffer.from(match[1]!, 'hex').toString('latin1')).join('').replace(/\s/g, '');
}
describe('Official final conclusive opinion', () => {
  const renderer = new EvaluationProcessDocumentPdfRenderer(new PdfKitProcessDocumentPdfRenderer());
  const snapshot = { stages: [1, 2, 3, 4].map(sequence => ({ sequence, isComplete: true,
    supervisorEvaluation: { id: `evaluation-${sequence}`, factorScores: Array.from({ length: 5 }, () => sequence * 10 + 50), scoreScale: 'PERCENT_0_100', stageAverage: sequence * 10 + 50 },
  })) };
  const input: ProcessDocumentPdfInput = { documentType: DocumentType.CESAD_OPINION, opinionKind: 'FINAL_CONCLUSIVE',
    title: 'Parecer', metadata: [['Processo', '550e8400-e29b-41d4-a716-446655440000']], sections: [],
    generatedAt: new Date('2026-10-07T12:00:00Z'), presentation: { serverName: 'Maria Costa', supervisorName: 'Ana Sousa', version: 1,
      signatures: [{ name: 'Membro real da comissão', role: 'CESAD_MEMBER', status: 'COMPLETED', signedAt: '2026-10-07T12:00:00Z' }] },
    logicalContent: { consolidatedSnapshot: snapshot, reportText: 'Ocorrências registradas nas quatro etapas.', legalBasis: 'Decreto nº 249/2011 e Decreto nº 1.338/2015.',
      finalConclusion: 'Conclusão deliberada pela comissão.', finalResult: 'APTO', finalConcept: 'Bom', recommendation: 'Efetivação no cargo.' } };
  it('renders four consolidated stages, all factors, partial sum and final average with the actual decision', async () => {
    const form = finalOpinionForm(input); const value = text(await renderer.render(input));
    expect(form.sections[0]!.rows![1]).toEqual(['ASSIDUIDADE', '60.0', '70.0', '80.0', '90.0', '300.0', '75.0']);
    for (const factor of ['ASSIDUIDADE', 'DISCIPLINA', 'CAPACIDADEDEINICIATIVA', 'PRODUTIVIDADE', 'RESPONSABILIDADE']) expect(value).toContain(factor);
    expect(value).toContain('PARECERCONCLUSIVO'); expect(value).toContain('MariaCosta'); expect(value).toContain('75.0');
    expect(value).toContain('APTO'); expect(value).toContain('Bom'); expect(value).toContain('FUNDAMENTOLEGAL');
    expect(value).toContain('Conclusãodeliberada'); expect(value).toContain('Membrorealdacomissão'); expect(value).toContain('Assinadoem');
    expect(value).not.toMatch(/550e8400|evaluation-|CESAD_MEMBER|FINAL_CONCLUSIVE|TODO|\{\{|backend|N\/A/);
    expect(value).toContain('provisória');
  });
  it('does not manufacture a numeric result from incomplete historical data', () => {
    const historical = { ...input, logicalContent: { ...input.logicalContent, consolidatedSnapshot: { stages: snapshot.stages.map(stage => ({ ...stage, supervisorEvaluation: { id: 'old-evaluation' } })) } } };
    expect(finalOpinionForm(historical).sections[0]!.rows![1]).toEqual(['ASSIDUIDADE', '', '', '', '', '', '']);
  });
  it('does not merge historical and percent scales into an invented final score', () => {
    const mixed = { ...input, logicalContent: { ...input.logicalContent, consolidatedSnapshot: { stages: snapshot.stages.map(stage => ({ ...stage, supervisorEvaluation: { ...stage.supervisorEvaluation, scoreScale: stage.sequence === 1 ? 'LEGACY_1_5' : 'PERCENT_0_100' } })) } } };
    expect(finalOpinionForm(mixed).sections[0]!.rows![1]!.slice(-2)).toEqual(['', '']);
  });
  it('rejects a fifth stage and incomplete stages', () => {
    expect(() => finalOpinionForm({ ...input, logicalContent: { consolidatedSnapshot: { stages: [...snapshot.stages, snapshot.stages[0]] } } })).toThrow(/four completed/);
    expect(() => finalOpinionForm({ ...input, logicalContent: { consolidatedSnapshot: { stages: snapshot.stages.map(stage => ({ ...stage, isComplete: false })) } } })).toThrow(/four completed/);
  });
  it('keeps deterministic bytes, checksum, large report and final signatures', async () => {
    const request = { ...input, logicalContent: { ...input.logicalContent, reportText: 'Ocorrência documentada durante o estágio. '.repeat(1000) + 'FIM DO RELATÓRIO' } };
    const a = await renderer.render(request), b = await renderer.render(request);
    expect(a.equals(b)).toBe(true); expect(artifactContentHash(a)).toBe(artifactContentHash(b));
    expect((a.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length).toBeGreaterThan(2);
    expect(text(a)).toContain('FIMDORELATÓRIO'); expect(text(a)).toContain('Assinadoem');
  });
  it.each(['PERCENT_0_100', 'LEGACY_1_5'])('captures factor scores from the original identified subfactors (%s)', scale => {
    const score = evaluationFactorScores({ scoreScale: scale, criteria: Array.from({ length: 20 }, (_, index) => ({ code: `${Math.floor(index / 4) + 1}.${index % 4 + 1}`, rating: scale === 'LEGACY_1_5' ? 4 : 80 })) });
    expect(score?.factorScores).toEqual(Array.from({ length: 5 }, () => scale === 'LEGACY_1_5' ? 4 : 80));
    expect(evaluationFactorScores({ scoreScale: scale, criteria: [] })).toBeNull();
  });
  it('materializes after preparation and after a colegiate signature without undoing a committed action on storage failure', async () => {
    const result = { document: { documentId: 'final-document' } };
    const documents = { prepareCesadFinalOpinionSignatures: jest.fn().mockResolvedValue(result), signCesadFinalOpinionDocument: jest.fn().mockResolvedValue(result) };
    const artifacts = { materializeAfterAuthorizedAction: jest.fn().mockResolvedValue(undefined) };
    const controller = new CesadFinalOpinionsController({} as any, documents as any, artifacts as any);
    const user = { sub: 'cesad-user', name: 'Membro', email: 'membro@test.local', role: UserRole.CESAD_MEMBER };
    await controller.prepareSignatures('process', user); expect(artifacts.materializeAfterAuthorizedAction).toHaveBeenCalledWith('final-document', user);
    artifacts.materializeAfterAuthorizedAction.mockRejectedValueOnce(new Error('storage failure'));
    await expect(controller.signOpinion('process', user)).resolves.toEqual(result);
  });
});
