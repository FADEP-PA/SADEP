import { BadRequestException } from '@nestjs/common';

import {
  MAX_EVALUATION_ATTACHMENT_BYTES,
  MAX_EVALUATION_ATTACHMENT_FILENAME_LENGTH,
  buildEvaluationAttachmentContentDisposition,
  detectEvaluationAttachmentMimeType,
  extractEvaluationAttachmentExtension,
  sanitizeEvaluationAttachmentFilename,
  validateEvaluationAttachmentFile,
} from './evaluation-attachment-file-validation';

function pdfBuffer(sizeBytes = 16): Buffer {
  const buffer = Buffer.alloc(sizeBytes);
  Buffer.from('%PDF-1.7\n').copy(buffer);
  return buffer;
}

function jpegBuffer(sizeBytes = 16): Buffer {
  const buffer = Buffer.alloc(sizeBytes);
  buffer[0] = 0xff;
  buffer[1] = 0xd8;
  buffer[2] = 0xff;
  buffer[3] = 0xe0;
  return buffer;
}

function pngBuffer(sizeBytes = 16): Buffer {
  const buffer = Buffer.alloc(sizeBytes);
  buffer[0] = 0x89;
  buffer[1] = 0x50;
  buffer[2] = 0x4e;
  buffer[3] = 0x47;
  buffer[4] = 0x0d;
  buffer[5] = 0x0a;
  buffer[6] = 0x1a;
  buffer[7] = 0x0a;
  return buffer;
}

function gifBuffer(sizeBytes = 16): Buffer {
  const buffer = Buffer.alloc(sizeBytes);
  Buffer.from('GIF89a').copy(buffer);
  return buffer;
}

describe('evaluation attachment file validation', () => {
  it('accepts a valid PDF and reports validated metadata', () => {
    const result = validateEvaluationAttachmentFile({
      originalname: 'evidencia.pdf',
      mimetype: 'application/pdf',
      buffer: pdfBuffer(128),
    });

    expect(result).toEqual({
      originalFilename: 'evidencia.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 128,
      buffer: expect.any(Buffer) as Buffer,
    });
  });

  it('accepts a valid JPEG', () => {
    const result = validateEvaluationAttachmentFile({
      originalname: 'foto.jpeg',
      mimetype: 'image/jpeg',
      buffer: jpegBuffer(64),
    });

    expect(result.originalFilename).toBe('foto.jpeg');
    expect(result.mimeType).toBe('image/jpeg');
    expect(result.sizeBytes).toBe(64);
  });

  it('accepts a valid PNG', () => {
    const result = validateEvaluationAttachmentFile({
      originalname: 'imagem.png',
      mimetype: 'image/png',
      buffer: pngBuffer(64),
    });

    expect(result.originalFilename).toBe('imagem.png');
    expect(result.mimeType).toBe('image/png');
    expect(result.sizeBytes).toBe(64);
  });

  it('accepts the image/jpg alias for JPEG content', () => {
    const result = validateEvaluationAttachmentFile({
      originalname: 'foto.jpg',
      mimetype: 'image/jpg',
      buffer: jpegBuffer(),
    });

    expect(result.mimeType).toBe('image/jpeg');
  });

  it('normalizes declared MIME types that carry parameters', () => {
    const result = validateEvaluationAttachmentFile({
      originalname: 'doc.pdf',
      mimetype: 'Application/PDF; charset=binary',
      buffer: pdfBuffer(),
    });

    expect(result.mimeType).toBe('application/pdf');
  });

  it('rejects a missing file', () => {
    expect(() => validateEvaluationAttachmentFile(undefined)).toThrow(BadRequestException);
    expect(() => validateEvaluationAttachmentFile(undefined)).toThrow('file is required');
  });

  it('rejects an empty file', () => {
    expect(() =>
      validateEvaluationAttachmentFile({
        originalname: 'vazio.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.alloc(0),
      }),
    ).toThrow('must not be empty');
  });

  it('accepts a file of exactly 10 MB', () => {
    const result = validateEvaluationAttachmentFile({
      originalname: 'limite.pdf',
      mimetype: 'application/pdf',
      buffer: pdfBuffer(MAX_EVALUATION_ATTACHMENT_BYTES),
    });

    expect(result.sizeBytes).toBe(MAX_EVALUATION_ATTACHMENT_BYTES);
  });

  it('rejects a file above 10 MB', () => {
    expect(() =>
      validateEvaluationAttachmentFile({
        originalname: 'grande.pdf',
        mimetype: 'application/pdf',
        buffer: pdfBuffer(MAX_EVALUATION_ATTACHMENT_BYTES + 1),
      }),
    ).toThrow('exceeds the');
  });

  it('rejects unsupported declared MIME types', () => {
    expect(() =>
      validateEvaluationAttachmentFile({
        originalname: 'animacao.gif',
        mimetype: 'image/gif',
        buffer: gifBuffer(),
      }),
    ).toThrow('PDF, JPEG or PNG');
  });

  it('rejects content whose magic bytes do not match the declared MIME type', () => {
    expect(() =>
      validateEvaluationAttachmentFile({
        originalname: 'disfarce.pdf',
        mimetype: 'application/pdf',
        buffer: pngBuffer(),
      }),
    ).toThrow('does not match the file content signature');
  });

  it('rejects unsupported content without a recognized signature', () => {
    expect(() =>
      validateEvaluationAttachmentFile({
        originalname: 'texto.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('apenas texto, sem assinatura magnetica'),
      }),
    ).toThrow('magic bytes');
  });

  it('rejects a deceptive extension that does not match the content', () => {
    expect(() =>
      validateEvaluationAttachmentFile({
        originalname: 'relatorio.pdf',
        mimetype: 'image/png',
        buffer: pngBuffer(),
      }),
    ).toThrow('file extension does not match the file content');
  });

  it('accepts a filename without extension when content and MIME match', () => {
    const result = validateEvaluationAttachmentFile({
      originalname: 'evidencia',
      mimetype: 'image/png',
      buffer: pngBuffer(),
    });

    expect(result.originalFilename).toBe('evidencia');
  });

  it('strips path components from the original filename', () => {
    expect(sanitizeEvaluationAttachmentFilename('../../../etc/passwd.png')).toBe('passwd.png');
    expect(sanitizeEvaluationAttachmentFilename('C:\\Users\\servidor\\foto.jpg')).toBe('foto.jpg');
    expect(sanitizeEvaluationAttachmentFilename('/var/tmp/laudo.pdf')).toBe('laudo.pdf');
  });

  it('replaces unusable filenames with a fallback', () => {
    expect(sanitizeEvaluationAttachmentFilename('')).toBe('arquivo');
    expect(sanitizeEvaluationAttachmentFilename('   ')).toBe('arquivo');
    expect(sanitizeEvaluationAttachmentFilename('..')).toBe('arquivo');
    expect(sanitizeEvaluationAttachmentFilename('.')).toBe('arquivo');
    expect(sanitizeEvaluationAttachmentFilename(undefined)).toBe('arquivo');
  });

  it('strips control characters and collapses whitespace in filenames', () => {
    const raw = `nota${String.fromCharCode(0)}  final${String.fromCharCode(10)}.pdf`;
    expect(sanitizeEvaluationAttachmentFilename(raw)).toBe('nota final.pdf');
  });

  it('keeps accented characters in filenames', () => {
    expect(sanitizeEvaluationAttachmentFilename('avaliação da chefia.pdf')).toBe(
      'avaliação da chefia.pdf',
    );
  });

  it('truncates long filenames while preserving the extension', () => {
    const longBase = 'a'.repeat(300);
    const sanitized = sanitizeEvaluationAttachmentFilename(`${longBase}.pdf`);

    expect(sanitized.length).toBeLessThanOrEqual(MAX_EVALUATION_ATTACHMENT_FILENAME_LENGTH);
    expect(sanitized.endsWith('.pdf')).toBe(true);
  });

  it('detects supported content signatures and rejects unknown ones', () => {
    expect(detectEvaluationAttachmentMimeType(pdfBuffer())).toBe('application/pdf');
    expect(detectEvaluationAttachmentMimeType(jpegBuffer())).toBe('image/jpeg');
    expect(detectEvaluationAttachmentMimeType(pngBuffer())).toBe('image/png');
    expect(detectEvaluationAttachmentMimeType(gifBuffer())).toBeNull();
  });

  it('rejects a PNG with an incomplete signature', () => {
    const buffer = pngBuffer();
    buffer[4] = 0x00;

    expect(detectEvaluationAttachmentMimeType(buffer)).toBeNull();
    expect(() =>
      validateEvaluationAttachmentFile({
        originalname: 'imagem.png',
        mimetype: 'image/png',
        buffer,
      }),
    ).toThrow('magic bytes');
  });

  it('extracts extensions only when they are real trailing segments', () => {
    expect(extractEvaluationAttachmentExtension('doc.pdf')).toBe('.pdf');
    expect(extractEvaluationAttachmentExtension('DOC.PDF')).toBe('.pdf');
    expect(extractEvaluationAttachmentExtension('semextensao')).toBeNull();
    expect(extractEvaluationAttachmentExtension('.oculto')).toBeNull();
    expect(extractEvaluationAttachmentExtension('final.')).toBeNull();
  });

  it('builds a header-safe content disposition preserving UTF-8 names', () => {
    const disposition = buildEvaluationAttachmentContentDisposition('avaliação.pdf');

    expect(disposition).toContain('filename="avalia__o.pdf"');
    expect(disposition).toContain("filename*=UTF-8''avalia%C3%A7%C3%A3o.pdf");
  });

  it('neutralizes quotes in the ASCII fallback of the content disposition', () => {
    const disposition = buildEvaluationAttachmentContentDisposition('nao"quebrar.pdf');

    expect(disposition).toContain('filename="nao_quebrar.pdf"');
    expect(disposition).not.toContain('"nao"quebrar"');
  });
});
