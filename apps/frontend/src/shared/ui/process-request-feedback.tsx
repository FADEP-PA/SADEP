import { AccessBlockedState, ProcessNotFoundState, TemporaryUnavailableState } from './operational-states';

type ProcessRequestFeedbackProps = {
  status?: number | null;
  message?: string | null;
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
  notFoundTitle = 'Processo não encontrado',
  blockedTitle = 'Acesso bloqueado',
}: ProcessRequestFeedbackProps) {
  if (!message) {
    return null;
  }

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

  return (
    <TemporaryUnavailableState title={genericTitle} description={message}>
      <DetailsList details={details} />
    </TemporaryUnavailableState>
  );
}
