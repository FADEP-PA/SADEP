import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import PizZip from 'pizzip';
import { PDFDocument, PDFDict, PDFArray, PDFRawStream, StandardFonts, PDFHexString } from 'pdf-lib';
import { calculateEvaluationRatingsScore, isProvisionalStageResult, type SupervisorEvaluationContentInput } from '@sadep/contracts';
import type { ProcessDocumentPdfInput } from './process-document-pdf-renderer';
import { finalOpinionForm } from './official-final-opinion-renderer';
import { notificationForm } from './official-result-notification-renderer';

const templates = resolve(process.cwd(), process.cwd().endsWith('backend') ? 'assets/document-templates' : 'apps/backend/assets/document-templates');
const sourcePath = (name: string) => join(process.env.SADEP_DOCUMENT_TEMPLATES_ROOT ?? templates, name);
const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const decodeXml = (s: string) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const text = (v: unknown) => typeof v === 'string' || typeof v === 'number' ? String(v) : '';
const date = (v: unknown) => v && Number.isFinite(new Date(String(v)).getTime()) ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Belem', dateStyle: 'short' }).format(new Date(String(v))) : '';

export async function normalizeTemplatePdf(bytes: Uint8Array, input: ProcessDocumentPdfInput): Promise<Buffer> {
  const source = await PDFDocument.load(bytes, { updateMetadata: false });
  // LibreOffice varies indirect font object order. Copy the unchanged pages in
  // canonical resource order; font programs, images and page contents stay intact.
  const sort = (object: unknown): void => {
    if (object instanceof PDFRawStream) sort(object.dict);
    else if (object instanceof PDFDict) {
      const entries = object.entries().sort(([a], [b]) => a.toString().localeCompare(b.toString(), 'en'));
      for (const [key] of entries) object.delete(key);
      for (const [key, value] of entries) { sort(value); object.set(key, value); }
    } else if (object instanceof PDFArray) object.asArray().forEach(sort);
  };
  for (const [, object] of source.context.enumerateIndirectObjects()) sort(object);
  const pdf = await PDFDocument.create();
  for (const page of await pdf.copyPages(source, source.getPageIndices())) pdf.addPage(page);
  pdf.setCreationDate(input.generatedAt); pdf.setModificationDate(input.generatedAt); pdf.setProducer('SADEP'); pdf.setCreator('SADEP');
  pdf.context.trailerInfo.ID = pdf.context.obj([PDFHexString.of('00000000000000000000000000000000'), PDFHexString.of('00000000000000000000000000000000')]);
  return Buffer.from(await pdf.save({ useObjectStreams: false }));
}

export async function renderOriginalAnnex(input: ProcessDocumentPdfInput, self: boolean): Promise<Buffer> {
  const original = await PDFDocument.load(await readFile(sourcePath('caso-2-original.pdf')));
  const pdf = await PDFDocument.create();
  const pages = await pdf.copyPages(original, self ? [6] : [4, 5]); pages.forEach(page => pdf.addPage(page));
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const draw = (index: number, value: unknown, x: number, y: number, width: number, size = 9) => {
    const valueText = text(value); if (!valueText) return;
    const page = pages[index]!; const ratio = page.getWidth() / 714;
    let actualSize = size; while (actualSize > 5 && font.widthOfTextAtSize(valueText, actualSize) > width * ratio) actualSize -= 0.25;
    page.drawText(valueText, { x: x * ratio, y: page.getHeight() - y * ratio, size: actualSize, font, maxWidth: width * ratio });
  };
  draw(0, input.presentation?.serverName, 237, 274, 425); draw(0, input.presentation?.supervisorName, 237, 353, 425);
  draw(0, input.stageSequence ? input.stageSequence + 'ª etapa — ' + (['1º–6º mês', '7º–12º mês', '13º–24º mês', '25º–32º mês'][input.stageSequence - 1] ?? '') : '', 299, 338, 363, 7);
  const logical = input.logicalContent ?? {};
  if (self) {
    // Continue on copies of the same original page rather than clipping submitted content.
    const wrap = (value: unknown) => {
      const lines: string[] = []; for (const paragraph of text(value).split('\n')) { let line = ''; for (const word of paragraph.split(/\s+/)) { if (font.widthOfTextAtSize(line + ' ' + word, 9) > 510) { lines.push(line); line = word; } else line += (line ? ' ' : '') + word; } lines.push(line); } return lines;
    };
    const reflection = wrap(logical.selfReflection), notes = wrap(logical.additionalNotes);
    const count = Math.max(1, Math.ceil(reflection.length / 7), Math.ceil(notes.length / 8));
    for (let i = 0; i < count; i++) {
      if (i > 0) { const [page] = await pdf.copyPages(original, [6]); pdf.addPage(page!); pages.push(page!); draw(i, input.presentation?.serverName, 237, 274, 425); }
      reflection.slice(i * 7, i * 7 + 7).forEach((line, j) => draw(i, line, 50, 448 + j * 12, 615));
      notes.slice(i * 8, i * 8 + 8).forEach((line, j) => draw(i, line, 50, 570 + j * 12, 615));
    }
  } else {
    const content = logical.content as SupervisorEvaluationContentInput | undefined;
    const criteria = content?.criteria ?? []; const scale = logical.scoreScale === 'PERCENT_0_100' ? 'PERCENT_0_100' : 'LEGACY_1_5';
    const locations = [[0, 732], [0, 871], [1, 224], [1, 363], [1, 517]];
    locations.forEach(([page, start], index) => {
      const items = [1, 2, 3, 4].map(n => criteria.find(c => c.code === (index + 1) + '.' + n));
      items.forEach((item, row) => { if (item) draw(page!, item.rating, 610, start! + row * 19.5, 50); });
      if (items.every(Boolean)) { const values = items.map(item => item!.rating); const average = calculateEvaluationRatingsScore(values, scale).stageAverage;
        draw(page!, values.reduce((a, b) => a + b, 0).toFixed(1), 602, start! + 78, 60);
        draw(index === 1 ? 1 : page!, average, 602, index === 1 ? 163 : start! + 98, 60);
      }
    });
    if (criteria.length === 20) { const score = calculateEvaluationRatingsScore(criteria.map(c => c.rating), scale); draw(1, (Number(score.stageAverage) * 5).toFixed(1), 125, 700, 90); draw(1, score.stageAverage, 425, 700, 100);
      const concept = ['INSUFICIENTE', 'REGULAR', 'BOM', 'EXCELENTE'].indexOf(score.administrativeConcept.toUpperCase()); if (concept >= 0) draw(1, 'X', [185, 312, 474, 638][concept]!, 768, 20);
    }
    if (isProvisionalStageResult(input.stageSequence)) draw(1, 'Média e conceito provisórios — 4ª etapa', 255, 703, 335, 7);
  }
  const signaturePage = self ? 0 : 1;
  for (const signature of input.presentation?.signatures ?? []) {
    if (signature.status !== 'COMPLETED' || !signature.signedAt) continue;
    const supervisor = signature.role === 'IMMEDIATE_SUPERVISOR'; const y = self ? (supervisor ? 720 : 780) : (supervisor ? 815 : 875);
    draw(signaturePage, signature.name + ' — assinatura eletrônica em ' + date(signature.signedAt), self ? 297 : 270, y, 390, 8);
    draw(signaturePage, date(signature.signedAt), 100, y, 135, 8);
  }
  return normalizeTemplatePdf(await pdf.save({ useObjectStreams: false }), input);
}

export async function fillOriginalDocx(input: ProcessDocumentPdfInput, notification: boolean): Promise<Buffer> {
  const content = input.logicalContent ?? {};
  if (notification) notificationForm(input); else finalOpinionForm(input); // Existing domain/document guards.
  const values: Record<string, string> = { nome: input.presentation?.serverName ?? '', nomeChefia: input.presentation?.supervisorName ?? '', conceito: text(notification ? content.finalConcept : content.finalConcept), dataParecer: date(notification ? content.notifiedAt : input.generatedAt.toISOString()) };
  const snapshot = content.consolidatedSnapshot as { stages?: Array<{ supervisorEvaluation?: { factorScores?: number[]; stageAverage?: number; scoreScale?: string } }> } | undefined;
  const evaluations = snapshot?.stages?.map(stage => stage.supervisorEvaluation) ?? [];
  const compatible = evaluations.length === 4 && evaluations.every(e => e?.scoreScale && e.scoreScale === evaluations[0]?.scoreScale);
  ['assiduidade', 'disciplina', 'iniciativa', 'produtividade', 'responsabilidade'].forEach((factor, index) => {
    const scores = evaluations.map((e, stage) => { const value = e?.factorScores?.[index]; values[factor + (stage + 1)] = typeof value === 'number' ? value.toFixed(1) : ''; return value; });
    if (compatible && scores.every(v => typeof v === 'number')) { const sum = (scores as number[]).reduce((a,b) => a+b,0); values['resultado'+(index+1)] = sum.toFixed(1); values['final'+(index+1)] = (sum/4).toFixed(1); }
  });
  const averages = evaluations.map((e,i) => { const v=e?.stageAverage; values['media'+(i+1)] = typeof v === 'number' ? v.toFixed(1) : ''; return v; });
  if (compatible && averages.every(v => typeof v === 'number')) { const sum=(averages as number[]).reduce((a,b)=>a+b,0); values.mediaresultado=sum.toFixed(1); values.mediafinal=(sum/4).toFixed(1); }
  ['insuficiente','regular','bom','excelente'].forEach(concept => values[concept] = text(content.finalConcept).toLowerCase() === concept ? 'X' : '');
  values.apto = content.finalResult === 'APTO' ? 'X' : ''; values.inapto = content.finalResult === 'INAPTO' ? 'X' : '';
  const zip = new PizZip(await readFile(sourcePath(notification ? 'notificacao-original.docx' : 'parecer-original.docx')));
  let signerIndex = 0;
  for (const name of Object.keys(zip.files).filter(name => /^word\/.*\.xml$/.test(name))) {
    let xml=zip.file(name)!.asText();
    xml=xml.replace(/<w:p[ >][\s\S]*?<\/w:p>/g, paragraph => {
      const joined = [...paragraph.matchAll(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g)].map(m => decodeXml(m[1]!)).join('');
      let result=joined.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => values[key.trim()] ?? '');
      if (!notification) {
        if (joined.startsWith('A presente Comissão')) result=text(content.reportText);
        if (joined.startsWith('Assim, o SERVIDOR')) result=text(content.finalConclusion);
        if (joined.includes('MARIA RAIMUNDA') || joined.includes('LÍGIA ALICE') || joined.includes('SIMONE RAMOS')) result=input.presentation?.signatures[signerIndex++]?.name ?? '';
        if (joined.startsWith('Cargo:') && !joined.includes('{{')) result='';
        if (joined.includes('Presidente (Membro)')) result='Membro CESAD';
      } else {
        if (joined.includes('Hellen Nyde')) result=text(content.authorityName);
        if (joined.includes('Secretária Adjunta')) result='Autoridade homologadora';
        if (result.includes('após o “CIENTE”, devolver uma via desta NOTIFICAÇÃO PESSOAL')) result=result.replace('após o “CIENTE”, devolver uma via desta NOTIFICAÇÃO PESSOAL', 'a visualização e o registro de ciência desta NOTIFICAÇÃO PESSOAL serão realizados eletronicamente no SADEP');
        if (result.includes('foi confirmada') && content.finalResult === 'INAPTO') result=result.replace('foi confirmada','não foi confirmada');
      }
      if (joined.includes('[assinado eletronicamente]')) { const signature=notification ? input.presentation?.signatures.find(s => s.status === 'COMPLETED') : input.presentation?.signatures[signerIndex]; result=signature?.status === 'COMPLETED' && signature.signedAt ? 'Assinado eletronicamente em '+date(signature.signedAt) : ''; }
      if (result === joined) return paragraph;
      let first=true; return paragraph.replace(/(<w:t(?: [^>]*)?>)[\s\S]*?(<\/w:t>)/g, (_, open: string, close: string) => { const value=first ? escapeXml(result) : ''; first=false; return open+value+close; });
    });
    if (/\{\{/.test(xml)) throw new Error('Unresolved document template field');
    zip.file(name, xml);
  }
  for (const file of Object.values(zip.files)) file.date = new Date('2000-01-01T00:00:00Z');
  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

export async function renderOriginalDocx(input: ProcessDocumentPdfInput, notification: boolean): Promise<Buffer> {
  const dir=await mkdtemp(join(tmpdir(),'sadep-docx-'));
  try {
    const { writeFile }=await import('node:fs/promises'); await writeFile(join(dir,'document.docx'),await fillOriginalDocx(input, notification));
    const converter=process.env.LIBREOFFICE_PATH ?? (process.platform === 'win32' ? 'C:\\Program Files\\LibreOffice\\program\\soffice.exe' : 'libreoffice');
    await promisify(execFile)(converter,['-env:UserInstallation=file:///'+join(dir,'profile').replace(/\\/g,'/'),'--headless','--convert-to','pdf','--outdir',dir,join(dir,'document.docx')],{timeout:60000,windowsHide:true});
    return normalizeTemplatePdf(await readFile(join(dir,'document.pdf')),input);
  } finally { await rm(dir,{ recursive:true, force:true }); }
}
