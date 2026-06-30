import { FeedbackAlert } from '@/shared/ui/feedback-alert';

import type { CesadCommissionWarning } from '../data/cesad-commission-admin-demo';

type CesadCommissionWarningsProps = {
  warnings: CesadCommissionWarning[];
};

export function CesadCommissionWarnings({ warnings }: CesadCommissionWarningsProps) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className="cesad-commission-warning-grid">
      {warnings.map((warning) => (
        <FeedbackAlert
          key={warning.id}
          title={warning.title}
          tone={warning.tone}
          description={warning.description}
          details={warning.details}
        />
      ))}
    </div>
  );
}
