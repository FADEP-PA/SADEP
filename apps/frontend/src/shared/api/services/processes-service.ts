import { HttpError } from '@/shared/api/http-error';
import { httpRequest } from '@/shared/api/http-client';

import type {
  ProcessDashboardSnapshot,
  WorkflowHistoryItem,
  WorkflowResponse,
} from '@/features/dashboard/types/process-dashboard-types';
import {
  CesadStageReadSnapshotRef,
  InternServerWorkspaceSnapshotRef,
  ProcessStatus,
  ProcessAction,
  ProcessListRef,
  SupervisorEvaluationDocumentContextRef,
  SupervisorEvaluationContentInput,
  SupervisorEvaluationWithDocumentContextRef,
  SelfEvaluationWithDocumentContextRef,
  UserRole,
} from '@sadep/contracts';

export type { ProcessListRef };

export type UpsertSupervisorEvaluationInput = {
  summary: string;
  generalComments: string;
  content: SupervisorEvaluationContentInput;
  comment?: string;
};

export type UpsertSelfEvaluationInput = {
  selfReflection: string;
  additionalNotes?: string;
  comment?: string;
};

export type WorkflowTransitionInput = {
  action: ProcessAction;
  comment?: string;
};

export type DocumentSignatureResponse = {
  success: boolean;
};

export type SelfEvaluationResponse = SelfEvaluationWithDocumentContextRef;
export type { SelfEvaluationWithDocumentContextRef };

export type SupervisorEvaluationWorkspaceSnapshot = {
  process: {
    id: string;
    status: ProcessStatus;
  };
  supervisorEvaluation: SupervisorEvaluationWithDocumentContextRef | null;
  documentContext: SupervisorEvaluationDocumentContextRef | null;
  canEditDraft: boolean;
  canSubmit: boolean;
  canRectify: boolean;
};

const AUTHENTICATED_REQUEST = {
  useStoredAccessToken: true,
} as const;

export async function getProcessList() {
  return httpRequest<ProcessListRef>('/processes', {
    ...AUTHENTICATED_REQUEST,
    method: 'GET',
  });
}

export async function getWorkflow(processId: string) {
  return httpRequest<WorkflowResponse>(`/processes/${processId}/workflow`, {
    ...AUTHENTICATED_REQUEST,
    method: 'GET',
  });
}

export async function getWorkflowHistory(processId: string) {
  const history = await httpRequest<WorkflowHistoryItem[]>(`/processes/${processId}/history`, {
    ...AUTHENTICATED_REQUEST,
    method: 'GET',
  });

  return {
    items: history,
    meta: {
      total: history.length,
    },
  };
}

export async function getInternWorkspaceSnapshot(processId: string) {
  return httpRequest<InternServerWorkspaceSnapshotRef>(
    `/processes/${processId}/intern-workspace`,
    {
      ...AUTHENTICATED_REQUEST,
      method: 'GET',
    },
  );
}

export async function getSupervisorEvaluation(processId: string) {
  return httpRequest<SupervisorEvaluationWithDocumentContextRef | null>(
    `/processes/${processId}/supervisor-evaluation`,
    {
      ...AUTHENTICATED_REQUEST,
      method: 'GET',
    },
  );
}

export async function getSelfEvaluation(processId: string) {
  return httpRequest<SelfEvaluationResponse | null>(`/processes/${processId}/self-evaluation`, {
    ...AUTHENTICATED_REQUEST,
    method: 'GET',
  });
}

export async function getSupervisorEvaluationWorkspaceSnapshot(processId: string) {
  return httpRequest<SupervisorEvaluationWorkspaceSnapshot>(
    `/processes/${processId}/supervisor-evaluation/workspace`,
    {
      ...AUTHENTICATED_REQUEST,
      method: 'GET',
    },
  );
}

export async function getCesadStageReadSnapshot(
  processId: string,
  stageSequence: number,
) {
  return httpRequest<CesadStageReadSnapshotRef>(
    `/processes/${processId}/stages/${stageSequence}/consolidated-read`,
    {
      ...AUTHENTICATED_REQUEST,
      method: 'GET',
    },
  );
}

export async function saveSelfEvaluationDraft(
  processId: string,
  body: UpsertSelfEvaluationInput,
) {
  return httpRequest<SelfEvaluationResponse>(`/processes/${processId}/self-evaluation/draft`, {
    ...AUTHENTICATED_REQUEST,
    method: 'PUT',
    body,
  });
}

export async function submitSelfEvaluation(
  processId: string,
  body: UpsertSelfEvaluationInput,
) {
  return httpRequest<SelfEvaluationResponse>(`/processes/${processId}/self-evaluation/submit`, {
    ...AUTHENTICATED_REQUEST,
    method: 'POST',
    body,
  });
}

export async function signSelfEvaluation(
  processId: string,
  body?: Pick<UpsertSelfEvaluationInput, 'comment'>,
) {
  return httpRequest<SelfEvaluationResponse>(`/processes/${processId}/self-evaluation/sign`, {
    ...AUTHENTICATED_REQUEST,
    method: 'POST',
    body,
  });
}

export async function saveSupervisorEvaluationDraft(
  processId: string,
  body: UpsertSupervisorEvaluationInput,
) {
  return httpRequest<SupervisorEvaluationWithDocumentContextRef>(
    `/processes/${processId}/supervisor-evaluation/draft`,
    {
      ...AUTHENTICATED_REQUEST,
      method: 'POST',
      body,
    },
  );
}

export async function submitSupervisorEvaluation(
  processId: string,
  body: UpsertSupervisorEvaluationInput,
) {
  return httpRequest<SupervisorEvaluationWithDocumentContextRef>(
    `/processes/${processId}/supervisor-evaluation/submit`,
    {
      ...AUTHENTICATED_REQUEST,
      method: 'POST',
      body,
    },
  );
}

export async function rectifySupervisorEvaluation(
  processId: string,
  body: UpsertSupervisorEvaluationInput,
) {
  return httpRequest<SupervisorEvaluationWithDocumentContextRef>(
    `/processes/${processId}/supervisor-evaluation/rectify`,
    {
      ...AUTHENTICATED_REQUEST,
      method: 'POST',
      body,
    },
  );
}

export async function signSupervisorEvaluation(processId: string) {
  return httpRequest<DocumentSignatureResponse>(
    `/processes/${processId}/supervisor-evaluation/sign`,
    {
      ...AUTHENTICATED_REQUEST,
      method: 'POST',
    },
  );
}

export async function getTechnicalProcessSnapshot(
  processId: string,
  userRole: UserRole,
): Promise<ProcessDashboardSnapshot> {
  const [workflow, historyResponse] = await Promise.all([
    getWorkflow(processId),
    getWorkflowHistory(processId),
  ]);

  try {
    const supervisorEvaluation = await getSupervisorEvaluation(processId);

    return {
      workflow,
      history: historyResponse.items,
      supervisorEvaluation,
      supervisorEvaluationWarning: null,
    };
  } catch (error) {
    const canConsultSupervisorEvaluation =
      userRole === UserRole.ADMIN ||
      userRole === UserRole.IMMEDIATE_SUPERVISOR ||
      userRole === UserRole.INTERN_SERVER;

    if (error instanceof HttpError && error.status === 403 && !canConsultSupervisorEvaluation) {
      return {
        workflow,
        history: historyResponse.items,
        supervisorEvaluation: null,
        supervisorEvaluationWarning:
          'Seu perfil não pode consultar a avaliação da chefia. O dashboard exibe apenas workflow e histórico.',
      };
    }

    if (error instanceof HttpError && error.status === 403 && userRole === UserRole.INTERN_SERVER) {
      return {
        workflow,
        history: historyResponse.items,
        supervisorEvaluation: null,
        supervisorEvaluationWarning:
          'A avaliação da chefia só fica disponível para o servidor após a formalização documental da etapa.',
      };
    }

    throw error;
  }
}

export async function transitionWorkflow(
  processId: string,
  body: WorkflowTransitionInput,
) {
  return httpRequest<WorkflowResponse>(`/processes/${processId}/workflow/transition`, {
    ...AUTHENTICATED_REQUEST,
    method: 'POST',
    body,
  });
}
