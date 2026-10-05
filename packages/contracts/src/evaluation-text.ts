/** Limit per user-entered field, measured in UTF-16 code units (textarea semantics). */
export const EVALUATION_TEXT_MAX_LENGTH = 900;
export const EVALUATION_TEXT_LIMIT_MESSAGE = `Cada campo de texto deve conter no máximo ${EVALUATION_TEXT_MAX_LENGTH} caracteres.`;

export function isEvaluationTextWithinLimit(value: string): boolean {
  return value.length <= EVALUATION_TEXT_MAX_LENGTH;
}
