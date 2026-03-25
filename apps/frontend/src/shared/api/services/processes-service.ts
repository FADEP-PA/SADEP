import { HttpError } from '@/shared/api/http-error';
import { httpRequest } from '@/shared/api/http-client';

import type {
  ProcessDashboardSnapshot,
  WorkflowHistoryItem,
  WorkflowResponse,
} from '@/features/dashboard/types/process-dashboard-types';
import {
  SupervisorEvaluationContentInput,
  SupervisorEvaluationRef,
  UserRole,
} from '@aep-pa/contracts';

export type UpsertSupervisorEvaluationInput = {
  summary: string;
  generalComments: string;
  content: SupervisorEvaluationContentInput;
  comment?: string;
};


export async function getWorkflow(processId: string, accessToken: string) {
  return httpRequest<WorkflowResponse>(`/processes/${processId}/workflow`, {
    method: 'GET',
    token: accessToken,
  });
}

export async function getWorkflowHistory(processId: string, accessToken: string) {
  const history = await httpRequest<WorkflowHistoryItem[]>(`/processes/${processId}/history`, {
    method: 'GET',
    token: accessToken,
  });

  return {
    items: history,
    meta: {
      total: history.length,
    },
  };
}

export async function getSupervisorEvaluation(processId: string, accessToken: string) {
  return httpRequest<SupervisorEvaluationRef | null>(`/processes/${processId}/supervisor-evaluation`, {
    method: 'GET',
    token: accessToken,
  });
}

export async function saveSupervisorEvaluationDraft(
  processId: string,
  accessToken: string,
  body: UpsertSupervisorEvaluationInput,
) {
  return httpRequest<SupervisorEvaluationRef>(`/processes/${processId}/supervisor-evaluation/draft`, {
    method: 'POST',
    token: accessToken,
    body,
  });
}

export async function submitSupervisorEvaluation(
  processId: string,
  accessToken: string,
  body: UpsertSupervisorEvaluationInput,
) {
  return httpRequest<SupervisorEvaluationRef>(`/processes/${processId}/supervisor-evaluation/submit`, {
    method: 'POST',
    token: accessToken,
    body,
  });
}

export async function rectifySupervisorEvaluation(
  processId: string,
  accessToken: string,
  body: UpsertSupervisorEvaluationInput,
) {
  return httpRequest<SupervisorEvaluationRef>(`/processes/${processId}/supervisor-evaluation/rectify`, {
    method: 'POST',
    token: accessToken,
    body,
  });
}

export async function getTechnicalProcessSnapshot(
  processId: string,
  accessToken: string,
  userRole: UserRole,
): Promise<ProcessDashboardSnapshot> {
  const [workflow, historyResponse] = await Promise.all([
    getWorkflow(processId, accessToken),
    getWorkflowHistory(processId, accessToken),
  ]);

  try {
    const supervisorEvaluation = await getSupervisorEvaluation(processId, accessToken);

    return {
      workflow,
      history: historyResponse.items,
      supervisorEvaluation,
      supervisorEvaluationWarning: null,
    };
  } catch (error) {
    const canConsultSupervisorEvaluation =
      userRole === UserRole.ADMIN || userRole === UserRole.IMMEDIATE_SUPERVISOR;

    if (error instanceof HttpError && error.status === 403 && !canConsultSupervisorEvaluation) {
      return {
        workflow,
        history: historyResponse.items,
        supervisorEvaluation: null,
        supervisorEvaluationWarning:
          'Seu perfil não pode consultar a avaliação da chefia. O dashboard exibe apenas workflow e histórico.',
      };
    }

    throw error;
  }
}
