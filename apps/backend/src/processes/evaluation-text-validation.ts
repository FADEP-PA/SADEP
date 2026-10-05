import { BadRequestException } from '@nestjs/common';
import { EVALUATION_TEXT_LIMIT_MESSAGE, isEvaluationTextWithinLimit } from '@sadep/contracts';

export function validateEvaluationText(value: unknown, field: string): void {
  if (value === undefined || value === null) return;
  if (typeof value !== 'string' || !isEvaluationTextWithinLimit(value)) {
    throw new BadRequestException(`${EVALUATION_TEXT_LIMIT_MESSAGE} Campo: ${field}.`);
  }
}
