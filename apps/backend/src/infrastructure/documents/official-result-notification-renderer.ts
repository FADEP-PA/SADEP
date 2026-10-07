import { BadRequestException } from '@nestjs/common';
import type { ProcessDocumentPdfInput, PdfDocumentSection } from './process-document-pdf-renderer';
import { officialIdentification, officialSignatures, renderOfficialDocument } from './official-document-layout';

function date(value: unknown): string {
  if (typeof value !== 'string' || !Number.isFinite(new Date(value).getTime())) throw new BadRequestException('Valid official act date is required');
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Belem', dateStyle: 'long', timeStyle: 'short' }).format(new Date(value));
}

export function notificationForm(input: ProcessDocumentPdfInput): ProcessDocumentPdfInput {
  const content = input.logicalContent ?? {};
  if (!content.homologatedAt || !content.notifiedAt || typeof content.authorityName !== 'string' || !content.authorityName.trim()) {
    throw new BadRequestException('Personal notification requires a valid homologation and notification record');
  }
  const sections: PdfDocumentSection[] = [{ title: 'COMUNICAÇÃO DO RESULTADO HOMOLOGADO', paragraphs: [
    `Senhor(a) ${input.presentation?.serverName ?? ''},`,
    'A Secretaria Adjunta de Gestão de Pessoas, por meio da Comissão Especial de Avaliação de Desempenho — CESAD, notifica Vossa Senhoria do resultado da Avaliação Especial de Desempenho do estágio probatório, conforme o parecer conclusivo final e a decisão homologatória registrados no processo administrativo.',
  ] }];
  const results: string[] = [];
  if (typeof content.finalResult === 'string' && content.finalResult.trim()) results.push(`Resultado: ${content.finalResult}`);
  if (typeof content.finalConcept === 'string' && content.finalConcept.trim()) results.push(`Conceito obtido: ${content.finalConcept}`);
  if (results.length) sections.push({ title: 'RESULTADO', paragraphs: results });
  sections.push({ title: 'DECISÃO HOMOLOGATÓRIA', paragraphs: [
    `Resultado homologado em ${date(content.homologatedAt)}.`,
    `Autoridade responsável pela homologação: ${content.authorityName}.`,
    ...(typeof content.homologationRemarks === 'string' && content.homologationRemarks.trim() ? [content.homologationRemarks] : []),
  ] });
  sections.push({ title: 'PRAZO PARA RECURSO', paragraphs: [
    'O servidor-estagiário poderá interpor recurso no prazo de 5 (cinco) dias, contado da ciência do resultado, nos termos dos arts. 22 a 25 do Decreto nº 249/2011.',
  ] });
  sections.push({ title: 'RECEBIMENTO ELETRÔNICO', paragraphs: [
    `Notificação expedida em ${date(content.notifiedAt)}.`,
    'A visualização desta Notificação Pessoal e o registro de ciência são realizados no SADEP. A ciência confirma o recebimento do resultado e permanece registrada no processo administrativo.',
  ] });
  if (input.presentation?.signatures.length) sections.push(officialSignatures(input));
  return { ...input, title: 'NOTIFICAÇÃO PESSOAL', subtitle: 'Avaliação Especial de Desempenho — Estágio Probatório',
    metadata: officialIdentification(input), sections };
}

export function renderOfficialNotification(input: ProcessDocumentPdfInput): Promise<Buffer> {
  return renderOfficialDocument(notificationForm(input));
}
