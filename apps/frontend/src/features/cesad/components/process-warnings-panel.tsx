import { FeedbackAlert } from '@/shared/ui/feedback-alert';

type ProcessWarningsPanelProps = {
  warnings: string[];
};

export function ProcessWarningsPanel({ warnings }: ProcessWarningsPanelProps) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <FeedbackAlert
      title="Avisos da leitura"
      tone="warning"
      description="A resposta consolidada foi montada sem alterar workflow e sinaliza apenas compatibilidades residuais ou limitações de histórico ainda presentes no modelo."
      details={warnings}
    />
  );
}
