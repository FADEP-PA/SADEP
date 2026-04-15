import { AccessBlockedState, ProcessNotFoundState } from './operational-states';
import { FeedbackAlert } from './feedback-alert';

type ProcessRequestFeedbackProps = {
  status?: number | null;
  message: string;
  details?: string[];
  genericTitle: string;
  notFoundTitle?: string;
  blockedTitle?: string;
};

function DetailsList({ details }: { details: string[] }) {
  if (details.length === 0) {
    return null;
  }

  return (
    <ul className="content-list">
      {details.map((detail) => (
        <li key={detail}>{detail}</li>
      ))}
    </ul>
  );
}

export function ProcessRequestFeedback({
  status,
  message,
  details = [],
  genericTitle,
  notFoundTitle = 'Processo nao encontrado',
  blockedTitle = 'Acesso bloqueado',
}: ProcessRequestFeedbackProps) {
  if (status === 404) {
    return (
      <ProcessNotFoundState title={notFoundTitle} description={message}>
        <DetailsList details={details} />
      </ProcessNotFoundState>
    );
  }

  if (status === 403) {
    return (
      <AccessBlockedState title={blockedTitle} description={message}>
        <DetailsList details={details} />
      </AccessBlockedState>
    );
  }

  return <FeedbackAlert title={genericTitle} tone="error" description={message} details={details} />;
}
