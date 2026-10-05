'use client';

import { EVALUATION_TEXT_MAX_LENGTH, isEvaluationTextWithinLimit } from '@sadep/contracts';
import { useId, type ComponentProps } from 'react';

type Props = Omit<ComponentProps<'textarea'>, 'value'> & { value: string };

export function EvaluationTextarea({ value, onChange, ...props }: Props) {
  const counterId = useId();
  const exceedsLimit = !isEvaluationTextWithinLimit(value);
  return (
    <>
      <textarea
        {...props}
        value={value}
        maxLength={EVALUATION_TEXT_MAX_LENGTH}
        aria-describedby={[props['aria-describedby'], counterId].filter(Boolean).join(' ')}
        aria-invalid={!props.disabled && exceedsLimit ? true : undefined}
        onChange={(event) => {
          const next = event.target.value;
          if (isEvaluationTextWithinLimit(next) || (exceedsLimit && next.length < value.length)) {
            onChange?.(event);
          }
        }}
      />
      <small id={counterId} className={!props.disabled && exceedsLimit ? 'field-error' : 'muted-copy'}>
        {value.length} / {EVALUATION_TEXT_MAX_LENGTH}
      </small>
    </>
  );
}
