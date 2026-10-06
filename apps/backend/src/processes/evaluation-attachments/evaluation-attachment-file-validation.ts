import { BadRequestException } from '@nestjs/common';

export const MAX_EVALUATION_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_EVALUATION_ATTACHMENTS_PER_SCOPE = 5;
export const MAX_EVALUATION_ATTACHMENT_FILENAME_LENGTH = 120;

export const EVALUATION_ATTACHMENT_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

export type EvaluationAttachmentMimeType = (typeof EVALUATION_ATTACHMENT_ALLOWED_MIME_TYPES)[number];

const ALLOWED_EXTENSIONS_BY_MIME_TYPE: Record<EvaluationAttachmentMimeType, readonly string[]> = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
};

const MIME_TYPE_ALIASES: Record<string, EvaluationAttachmentMimeType> = {
  'image/jpg': 'image/jpeg',
};

export interface EvaluationAttachmentUploadInput {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

export interface ValidatedEvaluationAttachmentFile {
  originalFilename: string;
  mimeType: EvaluationAttachmentMimeType;
  sizeBytes: number;
  buffer: Buffer;
}

function stripControlCharacters(value: string): string {
  let result = '';
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint >= 0x20 && codePoint !== 0x7f) {
      result += character;
    }
  }
  return result;
}

export function normalizeEvaluationAttachmentMimeType(mimetype: unknown): string | null {
  if (typeof mimetype !== 'string') return null;
  const [base] = mimetype.split(';');
  const normalized = base.trim().toLowerCase();
  if (normalized.length === 0) return null;
  return MIME_TYPE_ALIASES[normalized] ?? normalized;
}

export function detectEvaluationAttachmentMimeType(buffer: Buffer): EvaluationAttachmentMimeType | null {
  if (
    buffer.length >= 5 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  ) {
    return 'application/pdf';
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }
  return null;
}

export function sanitizeEvaluationAttachmentFilename(rawFilename: unknown): string {
  const raw = typeof rawFilename === 'string' ? rawFilename : '';
  const basename = raw.split(/[\\/]/).pop() ?? '';
  const withoutControlCharacters = stripControlCharacters(basename);
  const collapsed = withoutControlCharacters.replace(/\s+/g, ' ').trim();

  if (collapsed.length === 0 || collapsed === '.' || collapsed === '..') {
    return 'arquivo';
  }
  if (collapsed.length <= MAX_EVALUATION_ATTACHMENT_FILENAME_LENGTH) {
    return collapsed;
  }

  const extensionIndex = collapsed.lastIndexOf('.');
  const extension = extensionIndex > 0 ? collapsed.slice(extensionIndex) : '';
  const base = extensionIndex > 0 ? collapsed.slice(0, extensionIndex) : collapsed;
  const truncatedBase = base.slice(0, Math.max(1, MAX_EVALUATION_ATTACHMENT_FILENAME_LENGTH - extension.length));
  return `${truncatedBase}${extension}`;
}

export function extractEvaluationAttachmentExtension(filename: string): string | null {
  const extensionIndex = filename.lastIndexOf('.');
  if (extensionIndex <= 0 || extensionIndex === filename.length - 1) {
    return null;
  }
  return filename.slice(extensionIndex).toLowerCase();
}

export function buildEvaluationAttachmentContentDisposition(filename: string): string {
  const asciiFallback = filename
    .split('')
    .map((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      const printable = codePoint >= 0x20 && codePoint <= 0x7e;
      return printable && character !== '"' && character !== '\\' ? character : '_';
    })
    .join('');
  const encodedFallback = encodeURIComponent(filename)
    .replace(/['()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedFallback}`;
}

export function validateEvaluationAttachmentFile(
  file: EvaluationAttachmentUploadInput | undefined | null,
): ValidatedEvaluationAttachmentFile {
  if (!file || !Buffer.isBuffer(file.buffer)) {
    throw new BadRequestException('Evaluation attachment file is required');
  }

  const sizeBytes = file.buffer.length;
  if (sizeBytes === 0) {
    throw new BadRequestException('Evaluation attachment file must not be empty');
  }
  if (sizeBytes > MAX_EVALUATION_ATTACHMENT_BYTES) {
    throw new BadRequestException(
      `Evaluation attachment file exceeds the ${MAX_EVALUATION_ATTACHMENT_BYTES} byte limit`,
    );
  }

  const declaredMimeType = normalizeEvaluationAttachmentMimeType(file.mimetype);
  if (
    declaredMimeType === null ||
    !(EVALUATION_ATTACHMENT_ALLOWED_MIME_TYPES as readonly string[]).includes(declaredMimeType)
  ) {
    throw new BadRequestException('Evaluation attachment file must be a PDF, JPEG or PNG');
  }

  const detectedMimeType = detectEvaluationAttachmentMimeType(file.buffer);
  if (detectedMimeType === null) {
    throw new BadRequestException(
      'Evaluation attachment file content signature (magic bytes) is not a supported PDF, JPEG or PNG',
    );
  }
  if (detectedMimeType !== declaredMimeType) {
    throw new BadRequestException(
      'Evaluation attachment declared MIME type does not match the file content signature',
    );
  }

  const originalFilename = sanitizeEvaluationAttachmentFilename(file.originalname);
  const extension = extractEvaluationAttachmentExtension(originalFilename);
  if (extension !== null && !ALLOWED_EXTENSIONS_BY_MIME_TYPE[detectedMimeType].includes(extension)) {
    throw new BadRequestException('Evaluation attachment file extension does not match the file content');
  }

  return { originalFilename, mimeType: detectedMimeType, sizeBytes, buffer: file.buffer };
}
